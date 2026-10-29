import { supabase, requireSupabase } from '@/lib/supabase';
import type { DbRow } from './mappers';
import { SAMPLE_COMMUNITY_POSTS } from './sampleCommunity';
import type { CommunityCategory, CommunityPost } from '@/lib/types';

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  announcement: 'Announcement',
  trail_update: 'Trail update',
  safety: 'Safety',
  event: 'Event',
};

export const COMMUNITY_CATEGORIES = Object.keys(COMMUNITY_CATEGORY_LABELS) as CommunityCategory[];

export function isCommunityCategory(value: unknown): value is CommunityCategory {
  return typeof value === 'string' && value in COMMUNITY_CATEGORY_LABELS;
}

const POST_SELECT = 'id, title, body, category, pinned, author_id, author_name, author_role, published, created_at, updated_at';

function mapPost(row: DbRow): CommunityPost {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    category: isCommunityCategory(row.category) ? row.category : 'announcement',
    pinned: Boolean(row.pinned),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    authorRole: row.author_role === 'admin' ? 'admin' : 'moderator',
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const sortPosts = (posts: CommunityPost[]): CommunityPost[] =>
  [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

/**
 * Published announcements are readable by anyone (including signed-out
 * visitors). Without a Supabase project the bundled sample posts are shown and
 * flagged as sample content in the UI.
 */
export async function listCommunityPosts(): Promise<CommunityPost[]> {
  if (!supabase) return sortPosts(SAMPLE_COMMUNITY_POSTS);
  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('published', true)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapPost(row as DbRow));
}

export interface CommunityPostInput {
  title: string;
  body: string;
  category: CommunityCategory;
  pinned: boolean;
}

export interface CommunityAuthor {
  id: string;
  name: string;
  role: 'admin' | 'moderator';
}

export async function createCommunityPost(author: CommunityAuthor, input: CommunityPostInput): Promise<CommunityPost> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('community_posts')
    .insert({
      author_id: author.id,
      author_name: author.name,
      author_role: author.role,
      title: input.title,
      body: input.body,
      category: input.category,
      pinned: input.pinned,
    })
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  return mapPost(data as DbRow);
}

export async function updateCommunityPost(
  postId: string,
  patch: Partial<CommunityPostInput & { published: boolean }>,
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from('community_posts')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);
  if (error) throw error;
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}
