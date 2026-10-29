import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSplit } from '@/split/SplitProvider';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import {
  computeBalances,
  formatPaisa,
  memberOwedPaisa,
  settleDebts,
  totalSpentPaisa,
  type MemberBalance,
  type Transfer,
} from '@/lib/split';
import { isValidEmail, pluralize } from '@/lib/format';
import { describeError } from '@/lib/supabase';
import { Icon } from '@/components/Icons';
import { cx } from '@/lib/cx';
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingRow,
  Modal,
  Notice,
  PageIntro,
} from '@/components/ui';
import type { SplitGroup } from '@/lib/types';

const MAX_AMOUNT_NPR = 10_000_000;

const localToday = (): string => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const memberLabel = (group: SplitGroup, memberId: string): string =>
  group.members.find((member) => member.id === memberId)?.name ?? 'Removed member';

const transferLines = (group: SplitGroup, transfers: Transfer[]): string[] =>
  transfers.map(
    (transfer) =>
      `${memberLabel(group, transfer.fromMemberId)} → ${memberLabel(group, transfer.toMemberId)}: ${formatPaisa(transfer.amountPaisa)}`,
  );

/* -------------------------------------------------------------------------- */
/* Group list                                                                 */
/* -------------------------------------------------------------------------- */

interface DraftMember {
  key: string;
  name: string;
  email: string;
}

const blankMember = (): DraftMember => ({ key: Math.random().toString(36).slice(2), name: '', email: '' });

export function SplitGroupsPage() {
  const { groups, loading, error, isGuest, createGroup, refresh } = useSplit();
  const { configured } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<DraftMember[]>([blankMember(), blankMember()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setMembers([blankMember(), blankMember()]);
    setFormError(null);
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) return setFormError('Give the group a name, such as “Annapurna crew”.');

    const named = members
      .map((member) => ({ name: member.name.trim(), email: member.email.trim().toLowerCase() }))
      .filter((member) => member.name.length > 0);

    if (named.length < 2) return setFormError('Add at least two people so there is something to split.');
    if (named.some((member) => member.email && !isValidEmail(member.email))) {
      return setFormError('One of the email addresses does not look valid.');
    }
    const emails = named.map((member) => member.email).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      return setFormError('Each person can only appear once.');
    }

    setSaving(true);
    try {
      const group = await createGroup({
        title: cleanTitle,
        notes: notes.trim() || null,
        members: named.map((member) => ({ name: member.name, email: member.email || null })),
      });
      push('Split group created.', 'success');
      setOpen(false);
      resetForm();
      navigate(`/split/${group.id}`);
    } catch (err) {
      setFormError(describeError(err, 'Could not create the group.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Cost splitter"
        title="Split the teahouse bill, not the friendship"
        description="One shared ledger for the group: log who paid, split it between the people there, and see exactly who owes whom when the trek ends."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            New split group
          </button>
          {isGuest && (
            <span className="text-xs text-ink-muted">
              Guest mode: groups are stored in this browser.{' '}
              {configured && (
                <Link to="/login?next=/split" className="font-semibold text-forest-700 hover:underline">
                  Sign in to sync and share
                </Link>
              )}
            </span>
          )}
        </div>
      </PageIntro>

      <div className="container-page py-10">
        {isGuest ? (
          <Notice tone="info" className="mb-6" title="Splitting without an account">
            This ledger stays in this browser. With an account, groups sync to Postgres and anyone whose account email
            you add to the group can open it read-only — no email invitation is sent.
          </Notice>
        ) : (
          <Notice tone="neutral" className="mb-6">
            Add a friend’s account email to a group and they can open the same ledger after signing in. They cannot
            edit it; only the person who created the group can add bills or members.
          </Notice>
        )}

        {error && <ErrorState message={error} onRetry={() => void refresh()} />}
        {loading && <LoadingRow label="Loading your split groups" />}

        {!loading && !error && groups.length === 0 && (
          <EmptyState
            icon="wallet"
            title="No split groups yet"
            description="Create a group for a trek, a teahouse booking or a shared taxi, then log each bill as it happens."
            action={
              <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
                Create your first group
              </button>
            }
          />
        )}

        {!loading && groups.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const total = totalSpentPaisa(group.expenses);
              const balances = computeBalances(
                group.members.map((member) => member.id),
                group.expenses,
              );
              const transfers = settleDebts(balances);
              return (
                <Link
                  key={group.id}
                  to={`/split/${group.id}`}
                  className="card group flex flex-col p-6 transition hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl group-hover:text-forest-700">{group.title}</h2>
                      <p className="mt-1 text-xs text-ink-faint">
                        {group.members.length} {pluralize(group.members.length, 'person', 'people')} ·{' '}
                        {group.expenses.length} {pluralize(group.expenses.length, 'bill')}
                      </p>
                    </div>
                    <Icon name="wallet" className="h-5 w-5 shrink-0 text-forest" />
                  </div>

                  <p className="mt-4 text-2xl font-semibold tracking-tight">{formatPaisa(total)}</p>
                  <p className="mt-1 text-xs text-ink-faint">total logged</p>

                  <div className="mt-4 flex items-center gap-2 border-t border-stone-line pt-4 text-xs">
                    {transfers.length === 0 ? (
                      <span className="badge">
                        <Icon name="check" className="h-3 w-3" /> Everyone is settled
                      </span>
                    ) : (
                      <span className="badge bg-gold/20 text-[#7a5207]">
                        {transfers.length} {pluralize(transfers.length, 'payment')} to settle
                      </span>
                    )}
                    {group.isLocal && <span className="badge bg-stone-paper text-ink-muted">Device only</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            resetForm();
          }
        }}
        title="New split group"
        description="Name the trip and add the people sharing costs. Emails are optional and only used to let that person read the ledger."
        size="md"
      >
        <form className="space-y-4" onSubmit={onCreate}>
          <Field label="Group name" htmlFor="split-title">
            <input
              id="split-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Annapurna crew, October"
              maxLength={80}
              autoFocus
            />
          </Field>

          <Field label="Notes (optional)" htmlFor="split-notes">
            <input
              id="split-notes"
              className="input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Teahouses, guides and jeeps, 8–20 Oct"
              maxLength={240}
            />
          </Field>

          <fieldset>
            <legend className="label">People</legend>
            <div className="space-y-2.5">
              {members.map((member, index) => (
                <div key={member.key} className="grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
                  <input
                    className="input"
                    value={member.name}
                    onChange={(event) =>
                      setMembers((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder={index === 0 ? 'You' : 'Friend’s name'}
                    aria-label={`Person ${index + 1} name`}
                    maxLength={80}
                  />
                  <input
                    className="input"
                    type="email"
                    value={member.email}
                    onChange={(event) =>
                      setMembers((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, email: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Email (optional)"
                    aria-label={`Person ${index + 1} email`}
                    maxLength={120}
                  />
                  <button
                    type="button"
                    className="btn-ghost btn-sm justify-self-start rounded-full p-2.5 sm:justify-self-auto"
                    onClick={() => setMembers((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove person ${index + 1}`}
                    disabled={members.length <= 1}
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm mt-2"
              onClick={() => setMembers((prev) => [...prev, blankMember()])}
              disabled={members.length >= 20}
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add another person
            </button>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              A blank row is ignored. Emails never appear on public pages.
            </p>
          </fieldset>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Group detail                                                               */
/* -------------------------------------------------------------------------- */

function BalanceRow({ group, balance }: { group: SplitGroup; balance: MemberBalance }) {
  const tone =
    balance.netPaisa > 0 ? 'text-forest-700' : balance.netPaisa < 0 ? 'text-[#9a3412]' : 'text-ink-faint';
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{memberLabel(group, balance.memberId)}</p>
        <p className="text-[0.7rem] text-ink-faint">
          paid {formatPaisa(balance.paidPaisa)} · share {formatPaisa(balance.owedPaisa)}
        </p>
      </div>
      <span className={cx('shrink-0 text-sm font-semibold', tone)}>
        {balance.netPaisa === 0 ? 'settled' : `${balance.netPaisa > 0 ? 'gets back' : 'owes'} ${formatPaisa(Math.abs(balance.netPaisa))}`}
      </span>
    </li>
  );
}

export function SplitGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { groups, loading, error, isGuest, addExpense, deleteExpense, addMember, removeMember, deleteGroup, canEdit, refresh } =
    useSplit();
  const { push } = useToast();
  const navigate = useNavigate();

  const group = useMemo(() => groups.find((item) => item.id === groupId) ?? null, [groups, groupId]);
  const editable = group ? canEdit(group) : false;

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [spentOn, setSpentOn] = useState(localToday);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [memberOpen, setMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openExpenseForm = () => {
    if (!group) return;
    setExpenseTitle('');
    setAmount('');
    setPaidBy(group.members[0]?.id ?? '');
    setParticipants(group.members.map((member) => member.id));
    setSpentOn(localToday());
    setFormError(null);
    setExpenseOpen(true);
  };

  const onAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group) return;
    setFormError(null);

    const cleanTitle = expenseTitle.trim();
    if (cleanTitle.length < 2) return setFormError('Describe the bill, for example “Teahouse in Namche”.');

    const parsed = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return setFormError('Enter an amount greater than zero.');
    if (parsed > MAX_AMOUNT_NPR) return setFormError('That amount is larger than this tool supports.');
    if (!paidBy) return setFormError('Choose who paid.');
    if (participants.length === 0) return setFormError('Select at least one person to share the bill.');

    setSaving(true);
    try {
      await addExpense(group.id, {
        title: cleanTitle,
        amountNpr: Math.round(parsed * 100) / 100,
        paidByMemberId: paidBy,
        participantIds: participants,
        spentOn: spentOn || null,
      });
      push('Bill added.', 'success');
      setExpenseOpen(false);
    } catch (err) {
      setFormError(describeError(err, 'Could not add the bill.'));
    } finally {
      setSaving(false);
    }
  };

  const onAddMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group) return;
    setMemberError(null);
    if (memberName.trim().length < 1) return setMemberError('Enter a name.');
    if (memberEmail.trim() && !isValidEmail(memberEmail.trim())) return setMemberError('That email does not look valid.');

    setSaving(true);
    try {
      await addMember(group.id, {
        name: memberName.trim(),
        email: memberEmail.trim() ? memberEmail.trim().toLowerCase() : null,
      });
      setMemberName('');
      setMemberEmail('');
      setMemberOpen(false);
      push('Person added.', 'success');
    } catch (err) {
      setMemberError(describeError(err, 'Could not add that person.'));
    } finally {
      setSaving(false);
    }
  };

  const onRemoveMember = async (memberId: string) => {
    if (!group) return;
    const involved = group.expenses.some(
      (expense) => expense.paidByMemberId === memberId || expense.participantIds.includes(memberId),
    );
    if (involved) {
      push('Remove or edit that person’s bills before removing them from the group.', 'error');
      return;
    }
    setBusyId(memberId);
    try {
      await removeMember(group.id, memberId);
      push('Person removed.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not remove that person.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onDeleteExpense = async (expenseId: string) => {
    if (!group) return;
    setBusyId(expenseId);
    try {
      await deleteExpense(group.id, expenseId);
      push('Bill removed.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not remove the bill.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onCopySummary = async () => {
    if (!group) return;
    const total = totalSpentPaisa(group.expenses);
    const transfers = settleDebts(
      computeBalances(
        group.members.map((member) => member.id),
        group.expenses,
      ),
    );
    const lines = [
      `${group.title} — ${formatPaisa(total)} total across ${group.members.length} people`,
      '',
      ...(transfers.length === 0 ? ['Everyone is settled.'] : transferLines(group, transfers)),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      push('Settlement summary copied.', 'success');
    } catch {
      push('Your browser blocked clipboard access. Select the summary text and copy it manually.', 'error');
    }
  };

  if (loading && !group) {
    return (
      <div className="container-page py-14">
        <LoadingRow label="Loading the group" />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="container-page py-14">
        <ErrorState message={error} onRetry={() => void refresh()} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon="wallet"
          title="Group not found"
          description="It may have been deleted, or it belongs to another account and your email is not on its member list."
          action={
            <Link to="/split" className="btn-primary">
              Back to the splitter
            </Link>
          }
        />
      </div>
    );
  }

  const totals = computeBalances(
    group.members.map((member) => member.id),
    group.expenses,
  );
  const transfers = settleDebts(totals);
  const total = totalSpentPaisa(group.expenses);

  return (
    <div className="container-page py-10 sm:py-12">
      <Link to="/split" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-forest-700">
        <Icon name="arrowLeft" className="h-4 w-4" /> All split groups
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="eyebrow">{isGuest ? 'Device only' : 'Shared ledger'}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{group.title}</h1>
          {group.notes && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{group.notes}</p>}
          <p className="mt-3 text-sm text-ink-faint">
            {formatPaisa(total)} across {group.expenses.length} {pluralize(group.expenses.length, 'bill')} ·{' '}
            {group.members.length} {pluralize(group.members.length, 'person', 'people')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => void onCopySummary()}>
            <Icon name="share" className="h-4 w-4" /> Copy settlement
          </button>
          {editable && (
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setMemberOpen(true)}>
                <Icon name="users" className="h-4 w-4" /> Add person
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={openExpenseForm}>
                <Icon name="plus" className="h-4 w-4" /> Add bill
              </button>
            </>
          )}
        </div>
      </header>

      {!editable && (
        <Notice tone="info" className="mt-6" title="Read-only view">
          You were added to this group by email. Only the person who created it can add or remove bills and members.
        </Notice>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="bills-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="bills-heading" className="text-xl">
                Bills
              </h2>
              {editable && (
                <button type="button" className="btn-ghost btn-sm" onClick={openExpenseForm}>
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>

            {group.expenses.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-stone-line px-4 py-8 text-center text-sm text-ink-muted">
                No bills yet. Add the first jeep fare, permit or teahouse bill.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-line">
                {group.expenses.map((expense) => (
                  <li key={expense.id} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{expense.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {memberLabel(group, expense.paidByMemberId)} paid · split between{' '}
                        {expense.participantIds.length === 0
                          ? 'nobody'
                          : expense.participantIds.map((id) => memberLabel(group, id)).join(', ')}
                        {expense.spentOn ? ` · ${expense.spentOn}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">{formatPaisa(Math.round(expense.amountNpr * 100))}</span>
                      {editable && (
                        <button
                          type="button"
                          className="rounded-full p-1.5 text-ink-faint transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => void onDeleteExpense(expense.id)}
                          disabled={busyId === expense.id}
                          aria-label={`Remove ${expense.title}`}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6" aria-labelledby="members-heading">
            <h2 id="members-heading" className="text-xl">
              People
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              {isGuest
                ? 'Names and emails stay on this device.'
                : 'An email lets that person sign in and read this ledger. It is not shown anywhere public.'}
            </p>
            <ul className="mt-3 divide-y divide-stone-line">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-ink-faint">{member.email ?? 'No email added'}</p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-ink-faint transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => void onRemoveMember(member.id)}
                      disabled={busyId === member.id}
                      aria-label={`Remove ${member.name}`}
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="settle-heading">
            <h2 id="settle-heading" className="text-xl">
              Settle up
            </h2>
            {transfers.length === 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-800">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{group.expenses.length === 0 ? 'Add bills to see who owes whom.' : 'Everyone is square.'}</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {transfers.map((transfer) => (
                  <li
                    key={`${transfer.fromMemberId}-${transfer.toMemberId}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-stone-paper px-3.5 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{memberLabel(group, transfer.fromMemberId)}</span>
                      <span className="text-ink-faint"> pays </span>
                      <span className="font-medium">{memberLabel(group, transfer.toMemberId)}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{formatPaisa(transfer.amountPaisa)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Calculated from equal shares of each bill. It assumes everyone listed on a bill owes the same amount.
            </p>
          </section>

          <section className="card p-6" aria-labelledby="balances-heading">
            <h2 id="balances-heading" className="text-xl">
              Balances
            </h2>
            <ul className="mt-2 divide-y divide-stone-line">
              {totals.map((balance) => (
                <BalanceRow key={balance.memberId} group={group} balance={balance} />
              ))}
            </ul>
            <p className="mt-3 border-t border-stone-line pt-3 text-xs text-ink-faint">
              Each person’s share across all bills:{' '}
              {totals
                .map((balance) => `${memberLabel(group, balance.memberId)} ${formatPaisa(memberOwedPaisa(balance.memberId, group.expenses))}`)
                .join(' · ')}
            </p>
          </section>

          {editable && (
            <button
              type="button"
              className="btn-ghost btn-sm w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              <Icon name="trash" className="h-4 w-4" /> Delete this group
            </button>
          )}
        </div>
      </div>

      <Modal
        open={expenseOpen}
        onClose={() => {
          if (!saving) setExpenseOpen(false);
        }}
        title="Add a bill"
        description="Choose who paid and who was there. The total is split equally between the people you select."
      >
        <form className="space-y-4" onSubmit={onAddExpense}>
          <Field label="What was it for?" htmlFor="expense-title">
            <input
              id="expense-title"
              className="input"
              value={expenseTitle}
              onChange={(event) => setExpenseTitle(event.target.value)}
              placeholder="Teahouse in Namche"
              maxLength={120}
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (NPR)" htmlFor="expense-amount">
              <input
                id="expense-amount"
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="3200"
              />
            </Field>
            <Field label="Date" htmlFor="expense-date">
              <input
                id="expense-date"
                className="input"
                type="date"
                value={spentOn}
                onChange={(event) => setSpentOn(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Paid by" htmlFor="expense-payer">
            <select id="expense-payer" className="input" value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
              {group.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>

          <fieldset>
            <legend className="label">Split between</legend>
            <div className="space-y-1.5">
              {group.members.map((member) => {
                const checked = participants.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-forest-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-line text-forest focus:ring-forest-200"
                      checked={checked}
                      onChange={() =>
                        setParticipants((prev) =>
                          checked ? prev.filter((id) => id !== member.id) : [...prev, member.id],
                        )
                      }
                    />
                    <span>{member.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              {participants.length > 0 && Number(amount.replace(/,/g, '')) > 0
                ? `${formatPaisa(Math.round((Number(amount.replace(/,/g, '')) / participants.length) * 100))} each`
                : 'Select the people who shared this cost.'}
            </p>
          </fieldset>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setExpenseOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add bill'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={memberOpen}
        onClose={() => {
          if (!saving) setMemberOpen(false);
        }}
        title="Add a person"
        description="They can read this ledger if their account email matches, but only you can edit it."
      >
        <form className="space-y-4" onSubmit={onAddMember}>
          <Field label="Name" htmlFor="member-name">
            <input
              id="member-name"
              className="input"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              placeholder="Pemba"
              maxLength={80}
              autoFocus
            />
          </Field>
          <Field label="Account email (optional)" htmlFor="member-email" hint="Leave blank for someone without an account.">
            <input
              id="member-email"
              className="input"
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="pemba@example.com"
              maxLength={120}
            />
          </Field>
          {memberError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {memberError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setMemberOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add person'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this group?"
        description="The group and every bill in it are removed for everyone who can see it. This cannot be undone."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
              Keep group
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={async () => {
                try {
                  await deleteGroup(group.id);
                  push('Group deleted.', 'success');
                  navigate('/split');
                } catch (err) {
                  push(describeError(err, 'Could not delete the group.'), 'error');
                }
              }}
            >
              Delete group
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {group.expenses.length} {pluralize(group.expenses.length, 'bill')} worth {formatPaisa(total)} will be deleted.
          Consider copying the settlement first.
        </p>
      </Modal>
    </div>
  );
}

