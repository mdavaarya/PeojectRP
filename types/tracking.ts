// ── Search Profile ────────────────────────────────────────────────────
export interface SearchProfile {
  id: string;
  alumni_id: string;
  name_variants: string[];
  affiliation_keywords: string[];
  context_keywords: string[];
  is_low_context: boolean;
  low_context_reason?: string;
  is_opted_out: boolean;
  opted_out_at?: string;
  opted_out_reason?: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  alumni_profiles?: any;
}

// ── Tracking Job ──────────────────────────────────────────────────────
export type TrackingJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TrackingJob {
  id: string;
  status: TrackingJobStatus;
  triggered_by: 'scheduler' | 'manual';
  triggered_by_user?: string;
  total_alumni: number;
  processed: number;
  identified: number;
  needs_review: number;
  not_found: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

// ── Tracking Result ───────────────────────────────────────────────────
export type TrackingStatus =
  | 'untracked'
  | 'identified'
  | 'needs_review'
  | 'not_found'
  | 'opted_out';

export type AlumniConfirmation = 'confirmed' | 'rejected' | 'pending';
export type TrackingSource = 'google' | 'scholar' | 'orcid' | 'linkedin' | 'github' | 'researchgate' | 'web';

export interface TrackingResult {
  id: string;
  job_id: string;
  alumni_id: string;
  confidence_score: number;
  tracking_status: TrackingStatus;
  found_position?: string;
  found_company?: string;
  found_location?: string;
  found_field?: string;
  found_year?: number;
  supporting_sources: string[];
  conflicting_sources: string[];
  alumni_confirmation?: AlumniConfirmation;
  confirmed_at?: string;
  notification_sent: boolean;
  notification_sent_at?: string;
  is_latest: boolean;
  created_at: string;
  // joined
  alumni_profiles?: any;
  tracking_evidence?: TrackingEvidence[];
}

// ── Tracking Evidence ─────────────────────────────────────────────────
export interface TrackingEvidence {
  id: string;
  result_id: string;
  alumni_id: string;
  source: TrackingSource;
  source_url?: string;
  title?: string;
  snippet?: string;
  found_name?: string;
  found_affiliation?: string;
  found_role?: string;
  found_field?: string;
  found_location?: string;
  activity_year?: number;
  evidence_score: number;
  raw_data?: Record<string, any>;
  fetched_at: string;
  created_at: string;
}

// ── Tracking Query ────────────────────────────────────────────────────
export interface TrackingQuery {
  id: string;
  job_id: string;
  alumni_id: string;
  query_text: string;
  source: TrackingSource;
  executed_at?: string;
  result_count: number;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────────────
export type NotificationChannel = 'email' | 'whatsapp' | 'in_app';

export interface NotificationLog {
  id: string;
  alumni_id: string;
  result_id?: string;
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  message_preview?: string;
  sent_at: string;
  error_message?: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────
export interface TrackingDashboardStats {
  total_alumni: number;
  untracked: number;
  identified: number;
  needs_review: number;
  not_found: number;
  opted_out: number;
  last_job_at?: string;
  last_job_status?: TrackingJobStatus;
}

// ── Confidence Breakdown ──────────────────────────────────────────────
export interface ConfidenceBreakdown {
  name_match: number;
  affiliation_match: number;
  timeline_match: number;
  field_match: number;
  cross_validation: number;
  total: number;
}