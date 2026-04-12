export type IdeaCategory = "training" | "ux" | "progress" | "social" | "account" | "stats" | "other";
export type IdeaModerationStatus = "pending" | "approved" | "rejected";
export type IdeaRoadmapStatus = "new" | "planned" | "in_progress" | "done" | "declined";

export interface IdeaCreatePayload {
  title: string;
  body: string;
  category: IdeaCategory;
  author_profile_id?: string | null;
}

export interface IdeaSummary {
  id: string;
  title: string;
  body: string;
  category: IdeaCategory;
  moderation_status: IdeaModerationStatus;
  roadmap_status: IdeaRoadmapStatus;
  rejection_note: string | null;
  vote_count: number;
  created_at: string;
  author_name: string;
  is_author: boolean;
  has_voted: boolean;
}

export interface ModerationIdeaSummary extends IdeaSummary {
  rejection_note: string | null;
  author_account_id: string | null;
}

export interface IdeasListResponse {
  ideas: IdeaSummary[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminIdeasListResponse {
  ideas: ModerationIdeaSummary[];
}

export interface IdeaVoteState {
  has_voted: boolean;
  vote_count: number;
  already_voted?: boolean;
}
