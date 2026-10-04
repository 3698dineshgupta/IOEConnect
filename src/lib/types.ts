// Shared DB row types + enums for IOE Connect.
// Mirrors supabase/migrations/*.sql. Safe to import from client and server.

// ---------------------------------------------------------------------------
// Enums (string unions + runtime arrays for zod / selects)
// ---------------------------------------------------------------------------
export const USER_ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RESOURCE_TYPES = ["NOTES", "PYQ", "REFERENCE", "LAB", "SYLLABUS", "OTHER"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const ACCESS_TYPES = ["FREE", "PREMIUM"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const RESOURCE_STATUSES = ["DRAFT", "PROCESSING", "PUBLISHED", "FAILED", "ARCHIVED"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFERRAL_STATUSES = ["PENDING", "QUALIFIED", "REWARDED"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const STUDENT_UPLOAD_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PUBLISHED"] as const;
export type StudentUploadStatus = (typeof STUDENT_UPLOAD_STATUSES)[number];

export const REQUEST_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const CONTACT_STATUSES = ["UNREAD", "READ", "REPLIED", "ARCHIVED"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const BUG_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  NOTES: "Notes",
  PYQ: "Past Questions",
  REFERENCE: "Reference",
  LAB: "Lab",
  SYLLABUS: "Syllabus",
  OTHER: "Other",
};

/** Timestamps are ISO strings as returned by PostgREST. */
export type Timestamp = string;
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------
export interface Program {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Year {
  id: string;
  program_id: string;
  number: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Semester {
  id: string;
  year_id: string;
  /** Absolute semester number 1..8 */
  number: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface Subject {
  id: string;
  semester_id: string;
  slug: string;
  name: string;
  code: string | null;
  credits: number | null;
  description: string | null;
  is_elective: boolean;
  /** "Elective I" / "Elective II" / "Elective III"; null for core subjects. */
  elective_group: string | null;
  /** Same-course subjects in other programs share notes/PYQs through this group (migration 20261005000010). */
  share_group?: string | null;
  /** Total marks for the subject (theory + practical); null = unknown. */
  full_marks: number | null;
  /** Lecture-Tutorial-Practical hours per week, e.g. "3-1-1.5"; null = unknown. */
  ltp: string | null;
  lecture_hours: number | null;
  sort_order: number;
  source_links: SourceLink[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
/** Full row. Telegram fields are only readable with the service-role client. */
export interface Resource {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  access_type: AccessType;
  telegram_file_id: string | null;
  telegram_message_id: number | null;
  original_file_name: string | null;
  file_size: number | null;
  compressed_file_size: number | null;
  page_count: number | null;
  available_years: number[];
  /** e.g. { "2079": [1, 4], "2080": [5, 9] } */
  year_page_ranges: Record<string, [number, number]>;
  exam_type: string | null;
  uploaded_by: string | null;
  status: ResourceStatus;
  view_count: number;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Resource without secret storage identifiers (what browsers may see). */
export type PublicResource = Omit<Resource, "telegram_file_id" | "telegram_message_id">;

/** Columns anon/authenticated clients are allowed to select on `resources`. */
export const RESOURCE_PUBLIC_COLUMNS =
  "id, subject_id, title, description, resource_type, access_type, original_file_name, file_size, compressed_file_size, page_count, available_years, year_page_ranges, exam_type, uploaded_by, status, view_count, published_at, created_at, updated_at";

/** Row of the `public_resources` view (PUBLISHED only, joined subject info). */
export interface PublicResourceView extends Omit<PublicResource, "uploaded_by"> {
  subject_slug: string;
  subject_name: string;
  subject_code: string | null;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar: string | null;
  college: string | null;
  program_id: string | null;
  year: number | null;
  semester: number | null;
  referral_code: string;
  referred_by: string | null;
  is_premium: boolean;
  premium_started_at: Timestamp | null;
  premium_expires_at: Timestamp | null;
  role: UserRole;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Columns a user may edit on their own profile. */
export type ProfileEditable = Pick<Profile, "full_name" | "avatar" | "college" | "program_id" | "year" | "semester">;

// ---------------------------------------------------------------------------
// Premium / payments / referrals
// ---------------------------------------------------------------------------
export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  payment_method: string;
  transaction_reference: string | null;
  screenshot_path: string | null;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: Timestamp | null;
  rejection_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ApprovePaymentResult {
  payment_id: string;
  user_id: string;
  status: "APPROVED";
  premium_started_at: Timestamp;
  premium_expires_at: Timestamp;
  extended: boolean;
  referral: "none" | "rewarded" | "qualified";
}

export interface RejectPaymentResult {
  payment_id: string;
  status: "REJECTED";
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: ReferralStatus;
  reward_amount: number;
  payment_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, Json>;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------
export interface StudentUpload {
  id: string;
  user_id: string;
  subject_id: string | null;
  resource_type: ResourceType;
  title: string;
  description: string | null;
  file_path: string;
  status: StudentUploadStatus;
  review_note: string | null;
  resource_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ResourceRequest {
  id: string;
  user_id: string;
  subject_id: string | null;
  subject_text: string | null;
  resource_type: ResourceType | null;
  years: string | null;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BugReport {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  screenshot_path: string | null;
  page_url: string | null;
  device: string | null;
  browser: string | null;
  status: BugStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MerchProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  is_available: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ---------------------------------------------------------------------------
// SCGPA
// ---------------------------------------------------------------------------
export interface ScgpaGrade {
  grade: string;
  points: number;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ScgpaSubjectEntry {
  name: string;
  credits: number;
  grade: string;
  subject_id?: string | null;
}

export interface ScgpaSave {
  id: string;
  user_id: string;
  semester: number | null;
  subjects: ScgpaSubjectEntry[];
  sgpa: number | null;
  total_credits: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export interface ResourceView {
  id: string;
  resource_id: string;
  user_id: string | null;
  viewed_at: Timestamp;
  session_key: string | null;
}

export interface SearchEvent {
  id: string;
  user_id: string | null;
  query: string;
  created_at: Timestamp;
}

/** Row returned by the `search_catalog(q, max_results)` RPC. */
export interface SearchResult {
  kind: "subject" | "resource";
  id: string;
  title: string;
  subtitle: string | null;
  subject_id: string;
  subject_slug: string;
  subject_name: string;
  program_slug: string;
  year_number: number;
  semester_number: number;
  resource_type: ResourceType | null;
  access_type: AccessType | null;
  score: number;
}

// ---------------------------------------------------------------------------
// Site settings (site_settings.key -> value)
// ---------------------------------------------------------------------------
export interface SiteSettings {
  name: string;
  tagline: string;
  description: string;
  contact_email: string;
  social: Partial<Record<"facebook" | "instagram" | "telegram" | "discord" | "youtube", string>>;
  announcement: { enabled: boolean; message: string; href: string };
  maintenance_mode: boolean;
  allow_registrations: boolean;
}

export interface PremiumSettings {
  enabled: boolean;
  currency: string;
  free_preview_pages: number;
  benefits: string[];
}

export interface ReferralSettings {
  enabled: boolean;
  /** Premium days granted to the referrer when a referee's payment is approved (0 = manual). */
  reward_days: number;
  reward_amount: number;
  description: string;
}

export interface ResourceSettings {
  max_upload_mb: number;
  compress_pdfs: boolean;
  default_access_type: AccessType;
  view_dedupe_minutes: number;
  pdf_token_ttl_seconds: number;
  require_login_for_free: boolean;
  allow_student_uploads: boolean;
  allow_requests: boolean;
}

export interface PaymentMethodSetting {
  id: string;
  label: string;
  enabled: boolean;
  account_name: string;
  account_id: string;
  bank_name?: string;
  /** Path inside the `site-assets` bucket */
  qr_path: string | null;
}

export interface PaymentSettings {
  currency: string;
  instructions: string;
  methods: PaymentMethodSetting[];
}

export interface ScgpaGradeSetting {
  grade: string;
  points: number;
  /** Lowest percentage that earns this grade (0-100). */
  min_percent: number;
}

export interface ScgpaSettings {
  scale: number;
  decimals: number;
  min_pass_points: number;
  grades: ScgpaGradeSetting[];
}

export interface SettingsMap {
  site: SiteSettings;
  premium: PremiumSettings;
  referral: ReferralSettings;
  resources: ResourceSettings;
  payment: PaymentSettings;
  scgpa: ScgpaSettings;
}

export type SettingKey = keyof SettingsMap;
export const SETTING_KEYS = ["site", "premium", "referral", "resources", "payment", "scgpa"] as const satisfies readonly SettingKey[];

// ---------------------------------------------------------------------------
// Curriculum tree shapes returned by src/lib/curriculum.ts
// ---------------------------------------------------------------------------
export interface SemesterWithSubjects extends Semester {
  subjects: Subject[];
}
export interface YearWithSemesters extends Year {
  semesters: SemesterWithSubjects[];
}
export interface ProgramTree extends Program {
  years: YearWithSemesters[];
}

export interface SemesterContext {
  program: Program;
  year: Year;
  semester: Semester;
  subjects: Subject[];
}

export interface SubjectWithContext extends Subject {
  semester: Semester;
  year: Year;
  program: Program;
}
