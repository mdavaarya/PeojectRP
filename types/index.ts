// ── Existing types (unchanged) ────────────────────────────────────────────
export type UserRole = 'alumni' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface AlumniProfile {
  id: string;
  user_id: string;
  full_name: string;
  nim: string;
  graduation_year: number;
  study_program: string;
  linkedin_url?: string;
  photo_url?: string;
  email?: string;
  // v2 tracking fields
  last_tracked_at?: string;
  tracking_status?: TrackingStatus;
  tracking_confidence?: number;
  current_position?: string;
  current_company?: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ClassificationLabel =
  | 'entry_level' | 'mid_level' | 'senior_level'
  | 'manager' | 'director' | 'executive' | 'entrepreneur' | 'other';

export interface CareerMilestone {
  id: string;
  alumni_id: string;
  company_name: string;
  position_title: string;
  start_date: string;
  classification_label: ClassificationLabel;
  verification_status: VerificationStatus;
  created_at?: string;
}

export interface SkillCertification {
  id: string;
  alumni_id: string;
  certificate_name: string;
  issuer: string;
  year: number;
}

export interface DashboardStats {
  total_alumni: number;
  verified_milestones: number;
  pending_milestones: number;
  total_certifications: number;
}

export interface ProgramDistribution {
  study_program: string;
  count: number;
}

export interface MilestoneStatusDistribution {
  status: VerificationStatus;
  count: number;
}

// ── v2 Tracking Types ─────────────────────────────────────────────────────

export type TrackingStatus =
  | 'untracked'
  | 'identified'
  | 'needs_review'
  | 'not_found'
  | 'opted_out';

export type TrackingJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TrackingSource = 'google' | 'scholar' | 'orcid' | 'linkedin' | 'github' | 'researchgate' | 'web';
export type AlumniConfirmation = 'confirmed' | 'rejected' | 'pending';
export type NotificationChannel = 'email' | 'whatsapp' | 'in_app';

// Search profile — profil pencarian per alumni
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
  alumni_profiles?: AlumniProfile;
}

// Tracking job — satu sesi pelacakan
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

// Query yang dibuat per alumni per job
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

// Hasil pelacakan per alumni
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
  alumni_profiles?: AlumniProfile;
  tracking_evidence?: TrackingEvidence[];
}

// Bukti detail per temuan
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
  found_location?: string;
  activity_year?: number;
  evidence_score: number;
  raw_data?: Record<string, any>;
  fetched_at: string;
  created_at: string;
}

// Notifikasi log
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

// Admin tracking dashboard stats
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

// Confidence breakdown untuk display
export interface ConfidenceBreakdown {
  name_match: number;       // 0–0.3
  affiliation_match: number; // 0–0.3
  timeline_match: number;   // 0–0.2
  field_match: number;      // 0–0.1
  cross_validation: number; // 0–0.1
  total: number;            // 0–1.0
}

// Input untuk search profile form
export interface SearchProfileInput {
  name_variants: string[];
  affiliation_keywords: string[];
  context_keywords: string[];
  is_low_context: boolean;
  low_context_reason?: string;
}
