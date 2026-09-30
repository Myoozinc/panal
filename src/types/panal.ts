import type { Discipline, ExperienceLevel } from "@/lib/constants";

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  discipline: Discipline | null;
  genres: string[] | null;
  skills: string[] | null;
  experience_level: ExperienceLevel | null;
  years_active: number | null;
  looking_for: Discipline[] | null;
  spotify_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  soundcloud_url: string | null;
  website_url: string | null;
  tiktok_url?: string | null;
  twitch_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  social_stats?: {
    instagram_followers?: string;
    tiktok_followers?: string;
    youtube_subs?: string;
    twitch_followers?: string;
    total_reach?: string;
    engagement_rate?: string;
    primary_platform?: string;
  } | null;
  collab_offerings?: string[] | null;
  collab_seeking?: string[] | null;
  brand_pitch?: string | null;
  synergy_tagline?: string | null;
  is_verified: boolean;
  verified_at: string | null;
  notification_prefs: {
    likes?: boolean;
    matches?: boolean;
    collab_tags?: boolean;
    messages?: boolean;
  } | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  instagram_url: string | null;
  post_type?: "collab" | "call" | "open_squad" | null;
  target_discipline?: string | null;
  location?: string | null;
  compensation?: string | null;
  created_at: string;
}

export interface CollaborationWithDetails extends Collaboration {
  owner: Pick<Profile, "id" | "display_name" | "username" | "avatar_url" | "discipline">;
  participants: Pick<Profile, "id" | "display_name" | "username" | "avatar_url" | "discipline">[];
}

export type NotificationType = "like" | "match" | "collab_tag" | "message";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Pick<Profile, "id" | "display_name" | "username" | "avatar_url" | "discipline">;
}

export interface Conversation {
  id: string;
  match_id: string | null;
  user_a: string;
  user_b: string;
  is_group?: boolean | null;
  title?: string | null;
  collab_id?: string | null;
  last_message_at: string | null;
  created_at: string;
  members?: ConversationMember[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: Pick<Profile, "id" | "display_name" | "username" | "avatar_url"> | null;
}

export interface AdminUser {
  id: string;
  email?: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  discipline: string | null;
  is_verified: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
}

export interface AdminEmailItem {
  id: string;
  email: string;
  display_name: string;
  username: string;
  discipline: string;
  is_verified: boolean;
  created_at: string;
}
