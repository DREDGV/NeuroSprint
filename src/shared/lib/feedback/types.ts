export type FeedbackCategory = "bug" | "ux" | "idea" | "question" | "praise" | "other";
export type FeedbackSurface = "post_session" | "global_form";
export type FeedbackReviewStatus = "new" | "reviewed" | "archived";

export interface FeedbackSubmitPayload {
  category: FeedbackCategory;
  source_surface: FeedbackSurface;
  comment: string;
  star_rating?: number | null;
  reasons?: string[];
  contact_email?: string | null;
  module_id?: string | null;
  mode_id?: string | null;
  route?: string | null;
  sentiment?: string | null;
  training_profile_id?: string | null;
  guest_token?: string | null;
  client_context?: Record<string, unknown> | null;
  // Honeypot
  _website?: string;
  _honeypot?: string;
}

export interface FeedbackSubmitResult {
  success: boolean;
  alreadySubmitted?: boolean;
}
