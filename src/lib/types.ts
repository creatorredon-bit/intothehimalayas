export type Difficulty = 'easy' | 'moderate' | 'hard' | 'strenuous';
export type Activity = 'trekking' | 'hiking' | 'peak_climbing' | 'sightseeing';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type UserRole = 'user' | 'moderator' | 'admin';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type StayType = 'teahouse' | 'lodge' | 'hotel' | 'homestay';
export type InquirySubject = 'guide' | 'stay' | 'trail';

export type LngLat = [number, number];

export interface RouteLine {
  type: 'LineString';
  coordinates: LngLat[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  altitudeM?: number;
  walkingHours?: string;
  accommodation?: string;
}

export interface Trail {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  region: string;
  destinationId: string | null;
  destinationName?: string | null;
  destinationSlug?: string | null;
  difficulty: Difficulty;
  activity: Activity;
  distanceKm: number;
  durationDays: number;
  maxElevationM: number;
  elevationGainM: number | null;
  startPointName: string;
  startLat: number;
  startLng: number;
  bestSeasons: Season[];
  heroImage: string;
  gallery: string[];
  route: RouteLine | null;
  itinerary: ItineraryDay[];
  facilities: string[];
  safetyNotes: string;
  permitInfo: string;
  isSample: boolean;
  featured: boolean;
  published: boolean;
  permitsRequired?: string[];
  avgRating?: number | null;
  reviewCount?: number;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  heroImage: string;
  bestSeasons: Season[];
  lat: number;
  lng: number;
  featured: boolean;
  published: boolean;
  trailCount?: number;
}

export interface Guide {
  id: string;
  slug: string;
  fullName: string;
  region: string;
  languages: string[];
  specialties: string[];
  experienceYears: number | null;
  dayRateNpr: number | null;
  bio: string;
  contactEmail: string | null;
  contactPhone: string | null;
  verified: boolean;
  published: boolean;
  isSample: boolean;
}

export interface Stay {
  id: string;
  slug: string;
  name: string;
  type: StayType;
  region: string;
  destinationId: string | null;
  description: string;
  pricePerNightNpr: number | null;
  amenities: string[];
  photoUrl: string;
  contactEmail: string | null;
  lat: number | null;
  lng: number | null;
  published: boolean;
  isSample: boolean;
}

export interface Profile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  homeRegion: string | null;
  preferredDifficulty: Difficulty | null;
  preferredActivity: Activity | null;
  preferredSeason: Season | null;
  role: UserRole;
  createdAt: string;
}

export interface Review {
  id: string;
  trailId: string;
  userId: string;
  authorName: string | null;
  rating: number;
  title: string | null;
  body: string;
  visitedOn: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface SavedTrail {
  trailId: string;
  slug: string;
  name: string;
  region: string;
  heroImage: string;
  difficulty: Difficulty;
  distanceKm: number;
  durationDays: number;
  note?: string | null;
  collectionId?: string | null;
  savedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  budgetNpr: number | null;
  notes: string | null;
  days: TripDay[];
  createdAt: string;
  updatedAt: string;
  /** true when the trip lives only in this browser (guest mode). */
  isLocal?: boolean;
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string | null;
  title: string;
  notes: string | null;
  items: TripItem[];
}

export interface TripItem {
  id: string;
  tripDayId: string;
  trailId: string | null;
  trailSlug?: string | null;
  title: string;
  startTime: string | null;
  notes: string | null;
  estimatedCostNpr: number | null;
}

export interface Inquiry {
  id: string;
  userId: string;
  subjectType: InquirySubject;
  subjectId: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'closed';
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Cost splitting                                                             */
/* -------------------------------------------------------------------------- */

export interface SplitMember {
  id: string;
  groupId: string;
  name: string;
  email: string | null;
}

export interface SplitExpense {
  id: string;
  groupId: string;
  title: string;
  amountNpr: number;
  paidByMemberId: string;
  participantIds: string[];
  spentOn: string | null;
  createdAt: string;
}

export interface SplitGroup {
  id: string;
  title: string;
  notes: string | null;
  ownerId: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  createdAt: string;
  /** true when the group lives only in this browser (guest mode). */
  isLocal?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Community                                                                  */
/* -------------------------------------------------------------------------- */

export type CommunityCategory = 'announcement' | 'trail_update' | 'safety' | 'event';

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  category: CommunityCategory;
  pinned: boolean;
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'moderator';
  published: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrailFilterState {
  q: string;
  region: string;
  difficulty: string;
  activity: string;
  season: string;
  minDistance: number | null;
  maxDistance: number | null;
  maxDuration: number | null;
  minElevation: number | null;
  sort: TrailSort;
  page: number;
  pageSize: number;
}

export type TrailSort =
  | 'recommended'
  | 'distance-asc'
  | 'duration-asc'
  | 'elevation-desc'
  | 'name-asc';

export interface TrailPage {
  items: Trail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GuideFilters {
  q: string;
  region: string;
  language: string;
  specialty: string;
}

export interface StayFilters {
  q: string;
  region: string;
  type: string;
  maxPrice: number | null;
}
