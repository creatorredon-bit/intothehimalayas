import type { CommunityPost } from '@/lib/types';

/**
 * Sample community posts bundled with the project so the feed has something real
 * to render before a Supabase project is connected. They are labelled in the UI
 * and are not presented as statements from a real staff team.
 */
export const SAMPLE_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'sample-community-welcome',
    title: 'How this board works',
    body: 'This is the community noticeboard: route and access updates, safety reminders and trip notices, written by site staff. Announcements are published here rather than in email so everyone sees the same thing. Posting is restricted to administrators and moderators in the database, not just hidden in the interface.',
    category: 'announcement',
    pinned: true,
    authorId: 'sample-author',
    authorName: 'IntotheHimalayas team (sample)',
    authorRole: 'admin',
    published: true,
    isSample: true,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 'sample-community-autumn',
    title: 'Autumn trekking: plan for cold mornings above 4,000 m',
    body: 'Post-monsoon conditions are usually clear, but nights at high altitude drop well below freezing. Carry a sleeping bag rated for the teahouses you will use, and treat any afternoon cloud build-up as a reason to start earlier rather than push on. This is general guidance, not a report on current trail conditions.',
    category: 'safety',
    pinned: false,
    authorId: 'sample-author',
    authorName: 'IntotheHimalayas team (sample)',
    authorRole: 'moderator',
    published: true,
    isSample: true,
    createdAt: '2026-09-24T07:30:00.000Z',
    updatedAt: '2026-09-24T07:30:00.000Z',
  },
  {
    id: 'sample-community-updates',
    title: 'How trail updates get published',
    body: 'We only publish a trail or access update when a source can be named, such as a national park office, a permit notice or a guide who has walked the route that week. If a route on this site shows no recent update, that means nobody has verified it — not that conditions are unchanged. Check locally before committing to a pass or a high route.',
    category: 'trail_update',
    pinned: false,
    authorId: 'sample-author',
    authorName: 'IntotheHimalayas team (sample)',
    authorRole: 'admin',
    published: true,
    isSample: true,
    createdAt: '2026-09-12T12:15:00.000Z',
    updatedAt: '2026-09-12T12:15:00.000Z',
  },
];
