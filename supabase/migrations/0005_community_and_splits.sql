-- ---------------------------------------------------------------------------
-- IntotheHimalayas — community board and cost splitting
-- Run after 0004_moderator_role.sql.
--
-- * Community announcements are readable by anyone, writable only by an admin
--   or moderator. The author name and role are copied from `profiles` by a
--   trigger, so the browser cannot claim a role it does not have.
-- * Split groups are visible to their owner and to signed-in users whose
--   account email is on the member list. Only the owner may write.
-- ---------------------------------------------------------------------------

-- Helpers --------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'moderator')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

-- Community ------------------------------------------------------------------

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default 'Site team',
  author_role text not null default 'moderator' check (author_role in ('admin', 'moderator')),
  title text not null check (char_length(title) between 4 and 140),
  body text not null check (char_length(body) between 20 and 4000),
  category text not null default 'announcement'
    check (category in ('announcement', 'trail_update', 'safety', 'event')),
  pinned boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx
  on public.community_posts (published, pinned desc, created_at desc);

-- Always take the displayed author name and role from the profile row.
create or replace function public.set_community_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author public.profiles%rowtype;
begin
  select * into author from public.profiles where id = new.author_id;
  if author.id is null then
    raise exception 'Unknown author' using errcode = '42501';
  end if;
  if author.role not in ('admin', 'moderator') then
    raise exception 'Only administrators and moderators can publish announcements' using errcode = '42501';
  end if;

  new.author_name := coalesce(nullif(author.full_name, ''), 'Site team');
  new.author_role := author.role::text;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_posts_set_author on public.community_posts;
create trigger community_posts_set_author
  before insert or update on public.community_posts
  for each row execute function public.set_community_author();

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
  for select to anon, authenticated
  using (published or public.is_staff());

drop policy if exists community_posts_staff_insert on public.community_posts;
create policy community_posts_staff_insert on public.community_posts
  for insert to authenticated
  with check (public.is_staff() and author_id = auth.uid());

drop policy if exists community_posts_author_update on public.community_posts;
create policy community_posts_author_update on public.community_posts
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check ((author_id = auth.uid() or public.is_admin()) and public.is_staff());

drop policy if exists community_posts_author_delete on public.community_posts;
create policy community_posts_author_delete on public.community_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

grant select on public.community_posts to anon;
grant select, insert, update, delete on public.community_posts to authenticated;

-- Cost splitting -------------------------------------------------------------

create table if not exists public.split_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists split_groups_owner_idx on public.split_groups (owner_id, created_at desc);

drop trigger if exists split_groups_set_updated_at on public.split_groups;
create trigger split_groups_set_updated_at
  before update on public.split_groups
  for each row execute function public.set_updated_at();

create table if not exists public.split_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  email text check (
    email is null or (
      char_length(email) <= 160
      and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    )
  ),
  created_at timestamptz not null default now()
);

create index if not exists split_members_group_idx on public.split_members (group_id);
create unique index if not exists split_members_email_unique
  on public.split_members (group_id, lower(email))
  where email is not null;

create table if not exists public.split_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  amount_npr numeric(12, 2) not null check (amount_npr > 0 and amount_npr <= 10000000),
  -- Deferred so deleting a group can cascade its bills and members in any order,
  -- while deleting a member who still has bills is rejected at commit.
  paid_by_member_id uuid not null
    references public.split_members (id) on delete no action deferrable initially deferred,
  spent_on date,
  created_at timestamptz not null default now()
);

create index if not exists split_expenses_group_idx on public.split_expenses (group_id, created_at desc);

create table if not exists public.split_expense_participants (
  expense_id uuid not null references public.split_expenses (id) on delete cascade,
  member_id uuid not null references public.split_members (id) on delete cascade,
  primary key (expense_id, member_id)
);

create index if not exists split_participants_member_idx on public.split_expense_participants (member_id);

-- The payer must belong to the same group as the bill.
create or replace function public.check_split_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.split_members m
    where m.id = new.paid_by_member_id and m.group_id = new.group_id
  ) then
    raise exception 'The payer must be a member of this group' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists split_expenses_check_group on public.split_expenses;
create trigger split_expenses_check_group
  before insert or update on public.split_expenses
  for each row execute function public.check_split_expense();

-- A participant must belong to the group that owns the bill.
create or replace function public.check_split_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.split_members m
    join public.split_expenses e on e.id = new.expense_id
    where m.id = new.member_id and m.group_id = e.group_id
  ) then
    raise exception 'The participant must be a member of this group' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists split_participants_check_group on public.split_expense_participants;
create trigger split_participants_check_group
  before insert or update on public.split_expense_participants
  for each row execute function public.check_split_participant();

-- Access helpers. SECURITY DEFINER avoids recursive RLS evaluation between the
-- group, member, bill and participant tables.

create or replace function public.owns_split_group(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.split_groups g
    where g.id = target_group and g.owner_id = auth.uid()
  );
$$;

create or replace function public.can_read_split_group(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.split_groups g
    where g.id = target_group and g.owner_id = auth.uid()
  ) or exists (
    select 1 from public.split_members m
    where m.group_id = target_group
      and m.email is not null
      and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.split_expense_group(target_expense uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.group_id from public.split_expenses e where e.id = target_expense;
$$;

revoke all on function public.owns_split_group(uuid) from public;
revoke all on function public.can_read_split_group(uuid) from public;
revoke all on function public.split_expense_group(uuid) from public;
grant execute on function public.owns_split_group(uuid) to authenticated;
grant execute on function public.can_read_split_group(uuid) to authenticated;
grant execute on function public.split_expense_group(uuid) to authenticated;

alter table public.split_groups enable row level security;
alter table public.split_members enable row level security;
alter table public.split_expenses enable row level security;
alter table public.split_expense_participants enable row level security;

-- Groups: owner writes, invited members read.
drop policy if exists split_groups_read on public.split_groups;
create policy split_groups_read on public.split_groups
  for select to authenticated
  using (public.can_read_split_group(id));

drop policy if exists split_groups_insert on public.split_groups;
create policy split_groups_insert on public.split_groups
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists split_groups_update on public.split_groups;
create policy split_groups_update on public.split_groups
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists split_groups_delete on public.split_groups;
create policy split_groups_delete on public.split_groups
  for delete to authenticated
  using (owner_id = auth.uid());

-- Members.
drop policy if exists split_members_read on public.split_members;
create policy split_members_read on public.split_members
  for select to authenticated
  using (public.can_read_split_group(group_id));

drop policy if exists split_members_insert on public.split_members;
create policy split_members_insert on public.split_members
  for insert to authenticated
  with check (public.owns_split_group(group_id));

drop policy if exists split_members_update on public.split_members;
create policy split_members_update on public.split_members
  for update to authenticated
  using (public.owns_split_group(group_id))
  with check (public.owns_split_group(group_id));

drop policy if exists split_members_delete on public.split_members;
create policy split_members_delete on public.split_members
  for delete to authenticated
  using (public.owns_split_group(group_id));

-- Bills.
drop policy if exists split_expenses_read on public.split_expenses;
create policy split_expenses_read on public.split_expenses
  for select to authenticated
  using (public.can_read_split_group(group_id));

drop policy if exists split_expenses_insert on public.split_expenses;
create policy split_expenses_insert on public.split_expenses
  for insert to authenticated
  with check (public.owns_split_group(group_id) and created_by = auth.uid());

drop policy if exists split_expenses_update on public.split_expenses;
create policy split_expenses_update on public.split_expenses
  for update to authenticated
  using (public.owns_split_group(group_id))
  with check (public.owns_split_group(group_id));

drop policy if exists split_expenses_delete on public.split_expenses;
create policy split_expenses_delete on public.split_expenses
  for delete to authenticated
  using (public.owns_split_group(group_id));

-- Participants.
drop policy if exists split_participants_read on public.split_expense_participants;
create policy split_participants_read on public.split_expense_participants
  for select to authenticated
  using (public.can_read_split_group(public.split_expense_group(expense_id)));

drop policy if exists split_participants_insert on public.split_expense_participants;
create policy split_participants_insert on public.split_expense_participants
  for insert to authenticated
  with check (public.owns_split_group(public.split_expense_group(expense_id)));

drop policy if exists split_participants_delete on public.split_expense_participants;
create policy split_participants_delete on public.split_expense_participants
  for delete to authenticated
  using (public.owns_split_group(public.split_expense_group(expense_id)));

grant select, insert, update, delete on public.split_groups to authenticated;
grant select, insert, update, delete on public.split_members to authenticated;
grant select, insert, update, delete on public.split_expenses to authenticated;
grant select, insert, delete on public.split_expense_participants to authenticated;

comment on table public.community_posts is 'Staff announcements. Author name and role are copied from profiles by trigger.';
comment on table public.split_groups is 'Cost-splitting groups. Visible to the owner, and read-only to members matched by account email.';
comment on table public.split_expense_participants is 'Which members share each bill. Shares are equal and computed by the app in paisa.';
