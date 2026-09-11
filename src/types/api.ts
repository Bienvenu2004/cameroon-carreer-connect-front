/* Centralized DTO types — keep aligned with backend DTOs. */

export type Region =
  | "ADAMAOUA" | "CENTRE" | "EST" | "EXTREME_NORD" | "LITTORAL"
  | "NORD" | "NORD_OUEST" | "OUEST" | "SUD" | "SUD_OUEST";

export const ALL_REGIONS: Region[] = [
  "ADAMAOUA","CENTRE","EST","EXTREME_NORD","LITTORAL",
  "NORD","NORD_OUEST","OUEST","SUD","SUD_OUEST",
];

export type Industry =
  | "AGRICULTURE" | "BANKING_FINANCE" | "CONSTRUCTION" | "CONSULTING"
  | "EDUCATION" | "ENERGY_UTILITIES" | "GOVERNMENT" | "HEALTHCARE"
  | "HOSPITALITY_TOURISM" | "INFORMATION_TECHNOLOGY" | "LEGAL"
  | "LOGISTICS_TRANSPORT" | "MANUFACTURING" | "MEDIA_COMMUNICATION"
  | "NGO_NONPROFIT" | "REAL_ESTATE" | "RETAIL_TRADE"
  | "TELECOMMUNICATIONS" | "TEXTILES_FASHION" | "OTHER";

export const ALL_INDUSTRIES: Industry[] = [
  "AGRICULTURE","BANKING_FINANCE","CONSTRUCTION","CONSULTING","EDUCATION",
  "ENERGY_UTILITIES","GOVERNMENT","HEALTHCARE","HOSPITALITY_TOURISM",
  "INFORMATION_TECHNOLOGY","LEGAL","LOGISTICS_TRANSPORT","MANUFACTURING",
  "MEDIA_COMMUNICATION","NGO_NONPROFIT","REAL_ESTATE","RETAIL_TRADE",
  "TELECOMMUNICATIONS","TEXTILES_FASHION","OTHER",
];

export type JobType =
  | "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY"
  | "INTERN" | "FREELANCE" | "REMOTE";

export const ALL_JOB_TYPES: JobType[] = [
  "FULL_TIME","PART_TIME","CONTRACT","TEMPORARY","INTERN","FREELANCE","REMOTE",
];

export type JobSite = "REMOTE" | "ONSITE" | "HYBRID";
export const ALL_JOB_SITES: JobSite[] = ["REMOTE","ONSITE","HYBRID"];

/**
 * Required working language for a job posting. Mirrors the backend's
 * com.hostdesign24.jobportal.model.enums.JobLanguage enum.
 */
export type JobLanguage = "FRENCH" | "ENGLISH" | "BILINGUAL";
export const ALL_JOB_LANGUAGES: JobLanguage[] = ["FRENCH", "ENGLISH", "BILINGUAL"];

export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type CompanySize = "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type ApplicationStatus =
  | "APPLIED" | "REVIEWED" | "INTERVIEW" | "HIRED" | "REJECTED" | "WITHDRAWN";

/**
 * Seniority a role is pitched at. The natural-language search parser has always
 * produced these; jobs can now be filtered by them.
 */
export type ExperienceLevel =
  | "INTERNSHIP" | "ENTRY_LEVEL" | "JUNIOR" | "MID_LEVEL"
  | "SENIOR" | "LEAD" | "MANAGER" | "DIRECTOR";

export const ALL_EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "INTERNSHIP","ENTRY_LEVEL","JUNIOR","MID_LEVEL","SENIOR","LEAD","MANAGER","DIRECTOR",
];

/**
 * Academic qualifications as Cameroon names them. Ordered lowest to highest, so
 * the array doubles as the ladder the "Bac+N minimum" filter walks.
 */
export type DiplomaLevel =
  | "BEPC" | "CAP" | "PROBATOIRE" | "BACCALAUREAT" | "BTS" | "DUT"
  | "LICENCE" | "MASTER_1" | "MASTER_2" | "DOCTORAT";

export const ALL_DIPLOMA_LEVELS: DiplomaLevel[] = [
  "BEPC","CAP","PROBATOIRE","BACCALAUREAT","BTS","DUT",
  "LICENCE","MASTER_1","MASTER_2","DOCTORAT",
];

export type ReportReason =
  | "SCAM" | "MISLEADING" | "OFFENSIVE" | "ALREADY_FILLED" | "OTHER";

export const ALL_REPORT_REASONS: ReportReason[] = [
  "SCAM","MISLEADING","OFFENSIVE","ALREADY_FILLED","OTHER",
];

export type ReportStatus = "PENDING" | "UPHELD" | "DISMISSED";

export type UserRole = "JOB_SEEKER" | "RECRUITER" | "SYSTEM_ADMIN";

export type SavedSearchFrequency = "DAILY" | "WEEKLY";

export type VerificationType = "EMAIL_REGISTRATION" | "PASSWORD_RESET" | "NEW_DEVICE_LOGIN";

/* ---------------- Common ---------------- */

export interface AddressDto {
  street?: string;
  unitApt?: string;
  city?: string;
  stateRegion?: string;
  region?: Region | null;
  zip?: string;
  country?: string;
  longitude?: string;
  latitude?: string;
  phone?: string;
}

/**
 * Mirrors the backend's com.hostdesign24.jobportal.dto.file.FileDto
 * (note: `name` and `type` — not `fileName` / `contentType`). The backend's
 * FileMapper.buildFullUrl populates `url` with the publicly-servable URL
 * (publicUrl prefix + stored relative path).
 */
export interface FileDto {
  id: string;
  /** Original upload filename, e.g. "alice-cv.pdf". */
  name?: string;
  /** Full public URL, e.g. "http://localhost:8080/storage/foo.pdf". */
  url?: string;
  /** MIME content-type, e.g. "application/pdf". */
  type?: string;
  size?: number;
  ownerId?: string;
  ownerType?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

/** Backend's CreationResponse — returned by /register and similar endpoints. */
export interface CreationResponse {
  id: string;
  message: string;
}

/* ---------------- User & Auth ---------------- */

export interface UserDto {
  id: string;
  email: string;
  active: boolean;
  role: UserRole;
  jobSeekerProfile?: JobSeekerProfileDto | null;
  recruiterProfile?: RecruiterProfileDto | null;
}

/**
 * Normalized auth response (camelCase). The backend wire format uses
 * snake_case via Jackson @JsonProperty annotations; the API client
 * normalizes everything before returning.
 */
export interface AuthResponseDto {
  user?: UserDto;
  accessToken: string;
  refreshToken: string;
  requiresDeviceVerification?: boolean;
  deviceId?: string;
  message?: string;
}

/** Raw shape as it travels on the wire — snake_case from Jackson. */
export interface AuthResponseRaw {
  user?: UserDto;
  access_token: string;
  refresh_token: string;
  requiresDeviceVerification?: boolean;
  deviceId?: string;
  message?: string;
}

/* ---------------- Profiles ---------------- */

export interface JobSeekerProfileDto {
  id?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: AddressDto;
  workAuthorization?: string;
  employmentType?: string;

  /** Comma-separated list of spoken languages, e.g. "French,English". */
  spokenLanguages?: string;

  /* Optional portfolio / social URLs. */
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;

  resume?: FileDto | null;
  /**
   * Short-form video introduction. `url` is a Cloudinary `video` delivery URL
   * that streams directly in a <video> element (HTTP range / CDN) — playback
   * only, no download.
   */
  videoResume?: FileDto | null;
  profilePhoto?: FileDto | null;
  skills?: SkillDto[];

  /** Past + current roles, newest-start-first. */
  experiences?: WorkExperienceDto[];

  /**
   * Server-computed sum of all experience date ranges, expressed in
   * whole years. Null when the seeker has no experience rows — UI hides
   * the badge entirely in that case (no "0 years" noise).
   */
  totalYearsOfExperience?: number | null;

  /** Qualifications. The diploma is the first thing most local recruiters screen on. */
  educations?: EducationDto[];

  /** Best qualification held, by Bac+N rank. */
  highestDiploma?: DiplomaLevel | null;

  /** Whether this profile appears in recruiter candidate search. Opt-in. */
  searchable?: boolean;

  /** 0-100. Thin profiles match badly, so we show the number. */
  completeness?: number | null;

  /** i18n keys naming what is still missing, most valuable first. */
  completenessHints?: string[];
}

/** One qualification on a seeker profile. */
export interface EducationDto {
  id?: string;
  level: DiplomaLevel;
  fieldOfStudy?: string | null;
  institution?: string | null;
  city?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

/**
 * One work-experience row on the seeker profile. Mirrors backend
 * WorkExperienceDto — dates arrive as ISO yyyy-MM-dd strings thanks to
 * Jackson's JavaTimeModule serializing LocalDate that way.
 */
export interface WorkExperienceDto {
  id?: string;
  title: string;
  companyName: string;
  city?: string | null;
  country?: string | null;
  startDate: string;          // "2022-01-15"
  endDate?: string | null;    // null when isCurrent
  isCurrent: boolean;
  description?: string | null;
}

export interface RecruiterProfileDto {
  id?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  company?: string;
  profilePhoto?: FileDto | null;
}

export interface SkillDto {
  id?: string;
  name: string;
}

/* ---------------- Jobs ---------------- */

export interface JobDto {
  id: string;
  title: string;
  description?: string;
  benefits?: string;
  type?: JobType;
  site?: JobSite;
  /** Required working language — drives the language badge / filter. */
  requiredLanguage?: JobLanguage;
  /** Advertised pay band. Either bound may be absent. */
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  salaryCurrency?: string;
  postedDate?: string;
  isActive: boolean;

  experienceLevel?: ExperienceLevel | null;
  minimumDiploma?: DiplomaLevel | null;

  /** Last day applications are accepted; null when open-ended. */
  applicationDeadline?: string | null;
  /** Server-derived: the deadline has passed. */
  expired?: boolean;
  /** Server-derived: days left, null when open-ended or already past. */
  daysUntilDeadline?: number | null;

  /** Public-sector competitive recruitment (a concours). */
  publicSector?: boolean;
  publicSectorRef?: string | null;
  publicSectorBody?: string | null;
  views?: number;
  location?: AddressDto;
  company?: CompanyDto;
  createdAt?: string;
}

export interface JobUpsertDto {
  title: string;
  description?: string;
  benefits?: string;
  type: JobType;
  site: JobSite;
  /** Required working language for the role. */
  requiredLanguage?: JobLanguage;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  companyId: string;
  location: AddressDto;

  experienceLevel?: ExperienceLevel;
  minimumDiploma?: DiplomaLevel;
  applicationDeadline?: string;

  /* Concours fields. Ignored by the backend unless the caller is an admin. */
  publicSector?: boolean;
  publicSectorRef?: string;
  publicSectorBody?: string;
}

/**
 * Flat projection returned by the backend's JobApplicationMapper.
 * Job and profile data are denormalized as top-level fields rather than
 * nested objects (jobId, jobTitle, companyName, candidateName) — keeps the
 * wire format compact and avoids an extra DB join when listing applications.
 */
export interface JobApplicationDto {
  id: string;
  /** Backend field is `applyDate`, not `applicationDate`. */
  applyDate?: string;
  status: ApplicationStatus;
  coverLetter?: string;

  /** Job snapshot — flat so it survives JSON without lazy-loading the Job entity. */
  jobId?: string;
  jobTitle?: string;
  companyName?: string;

  /** Candidate snapshot — concatenated firstName + lastName from the seeker profile. */
  profileId?: string;
  candidateName?: string;

  /**
   * Why the application reached its current status, in the recruiter's words.
   * Optional, and most often set on a rejection — being told why is the
   * difference between a rejection and being ghosted.
   */
  statusReason?: string | null;

  /** Interview details — present once the recruiter schedules an interview. */
  interviewPlace?: string;
  /** ISO date-time string (LocalDateTime on the wire). */
  interviewDateTime?: string;
  interviewPhone?: string;
  interviewNote?: string;
}

/**
 * Request body for changing an application's status. The interview fields
 * are only sent (and only meaningful) when `status` is `INTERVIEW`.
 */
export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  interviewPlace?: string;
  interviewDateTime?: string;
  interviewPhone?: string;
  interviewNote?: string;

  /**
   * Why the application reached this status, shown to the candidate and
   * included in the email. Optional, and most useful on a rejection.
   */
  statusReason?: string;
}

/**
 * Minimal projection returned by the saved-jobs list endpoint.
 * Backend: JobSeekerSaveDto { jobId, jobTitle, companyName }.
 * Use jobId to link to /jobs/:id for the full detail view.
 */
export interface JobSeekerSaveDto {
  jobId: string;
  jobTitle: string;
  companyName?: string;
}

/* ---------------- Companies ---------------- */

export interface CompanyDto {
  id: string;
  name: string;
  description?: string;
  /** Long-form "About / Culture" content for the company detail page. */
  about?: string;
  /** Optional promotional video URL (YouTube, Vimeo, etc.). */
  promoVideoUrl?: string;
  website?: string;
  industry?: Industry;
  size?: CompanySize;
  logo?: FileDto | null;
  /** Wide hero banner shown at the top of the company detail page. */
  banner?: FileDto | null;
  address?: AddressDto;
  status?: CompanyStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
  activeJobs?: number;
}

/* ---------------- Notifications ---------------- */

/**
 * Mirrors backend `com.hostdesign24.jobportal.dto.NotificationDto`. Used by
 * the bell-icon dropdown to render the user's notification feed. Field
 * names match the backend 1:1.
 */
export interface NotificationDto {
  id: string;
  message: string;
  /** e.g. "INFO", "ALERT", "REMINDER" — see NotificationTypes on the backend. */
  type: string;
  createdAt?: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  readAt?: string | null;
  read: boolean;
}

/* ---------------- Saved searches ---------------- */

export interface SavedSearchDto {
  id?: string;
  label: string;
  keyword?: string;
  region?: Region | null;
  industry?: Industry | null;
  jobType?: JobType | null;
  jobSite?: JobSite | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  active: boolean;
  frequency: SavedSearchFrequency;
  lastSentAt?: string;
  createdAt?: string;
}

/* ---------------- Admin ---------------- */

export interface AdminUserDto {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  deleted: boolean;
  registrationDate?: string;
  lastLogin?: string;
  displayName?: string;
  companyId?: string;
  companyName?: string;
}

export interface AdminPlatformStatsDto {
  totalUsers: number;
  totalJobSeekers: number;
  totalRecruiters: number;
  totalAdmins: number;
  activeUsers: number;
  suspendedUsers: number;
  totalCompanies: number;
  pendingCompanies: number;
  approvedCompanies: number;
  rejectedCompanies: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  signupsByWeek: Record<string, number>;
  jobsByMonth: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  jobsByRegion: Record<string, number>;
}

/* ---------------- Analytics ---------------- */

export interface JobStatsDto {
  jobId: string;
  jobTitle: string;
  views: number;
  applicationsCount: number;
}

export interface DashboardDto {
  totalApplications: number;
  totalJobs: number;
  totalActiveJobs?: number;
  totalViews: number;
  jobsStats: JobStatsDto[];
  applicationsByStatus?: Record<string, number>;
  demographics?: Record<string, number>;
  applicationsByMonth?: Record<string, number>;
}

/**
 * Mirrors backend RegionalStatsDto. All maps are keyed by Region enum name
 * (e.g. "CENTRE") so the frontend can translate via `regions.{REGION}`.
 */
export interface RegionalStatsDto {
  jobsByRegion: Record<string, number>;
  applicationsByRegion: Record<string, number>;
  languageDistribution: Record<string, number>;
  topSkillsByRegion: Record<string, { name: string; count: number }[]>;
  topCompaniesByRegion: Record<string, { name: string; count: number }[]>;
}

/* ---------------- AI Recommendations ----------------
 * Wire shape mirrors backend RecommendationDto (com.hostdesign24.jobportal.dto.ai).
 * The `job` field reuses JobDto so the existing JobCard component can render it.
 */
export interface RecommendationDto {
  id: string;
  job: JobDto;
  /** Model confidence in the match, 0..1. */
  score: number;
  /** Short user-facing explanation from the LLM. */
  reason: string;
  generatedAt?: string;
}

/* ---------------- AI Semantic Search ----------------
 * Wire shape mirrors backend DTOs:
 *   - InterpretationDto: every enum field arrives as its NAME string
 *     (e.g. "LITTORAL", "JUNIOR"). Frontend translates them via existing
 *     i18n keys (regions.*, jobTypes.*, etc.).
 *   - AiSearchResponseDto.jobs reuses JobDto so the existing JobCard
 *     component drops in unchanged.
 *   - When usedFallback=true the interpretation's structured fields are
 *     all null — UI should render the "showing keyword results" banner.
 */
export interface AiInterpretationDto {
  keywords: string[];
  skills: string[];
  region: string | null;
  city: string | null;
  jobType: string | null;
  jobSite: string | null;
  language: string | null;
  industry: string | null;
  level: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export interface AiSearchResponseDto {
  query: string;
  interpretation: AiInterpretationDto;
  jobs: JobDto[];
  /** Model's parse confidence, 0..1. */
  confidence: number;
  /** True when we fell back to plain keyword search. */
  usedFallback: boolean;
  totalResults: number;
}

/* ---------------- Filters ---------------- */

export interface JobsFilter {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  jobTitle?: string;
  region?: Region;
  industry?: Industry;
  jobType?: JobType;
  jobSite?: JobSite;
  /** Filter on required working language. */
  requiredLanguage?: JobLanguage;
  salaryMin?: number;
  salaryMax?: number;
  companyName?: string;
  isActive?: boolean;
  isSaved?: boolean;

  /* --- functional expansion --- */
  experienceLevel?: ExperienceLevel;
  /** "I hold a Licence": matches jobs asking for that level or less. */
  minimumDiploma?: DiplomaLevel;
  /** Only jobs posted within the last N days. */
  createdDaysAgo?: number;
  /**
   * Hide listings past their deadline. The public listing already defaults to
   * true server-side; pass false to see closed postings.
   */
  hideExpired?: boolean;
  /** Restrict to (or exclude) public-sector concours listings. */
  publicSector?: boolean;
}

/* ===========================================================================
 *  Functional expansion
 * ========================================================================= */

/** One entry in an application's history. */
export interface ApplicationEventDto {
  id: string;
  fromStatus?: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note?: string | null;
  occurredAt: string;
}

/**
 * A candidate as they appear in recruiter search.
 *
 * Deliberately narrow: a surname initial, no email, no phone, no CV. A recruiter
 * reaches someone through an invitation they can ignore, not through contact
 * details lifted out of a list.
 */
export interface CandidateSummaryDto {
  profileId: string;
  firstName?: string | null;
  lastNameInitial?: string | null;
  profilePhoto?: FileDto | null;
  region?: Region | null;
  city?: string | null;
  highestDiploma?: DiplomaLevel | null;
  fieldOfStudy?: string | null;
  currentTitle?: string | null;
  totalYearsOfExperience?: number | null;
  topSkills?: string[];
  spokenLanguages?: string | null;
  alreadyInvited?: boolean;
}

export interface CandidateSearchParams {
  keyword?: string;
  skills?: string[];
  region?: Region;
  city?: string;
  minimumDiploma?: DiplomaLevel;
  language?: string;
  minYearsOfExperience?: number;
  activeWithinDays?: number;
  excludeInvitedForJobId?: string;
  page?: number;
  size?: number;
}

/** An invitation as the candidate sees it. */
export interface InvitationDto {
  id: string;
  jobId?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  message?: string | null;
  sentAt: string;
  respondedAt?: string | null;
  jobStillOpen: boolean;
}

/** A reported listing in the admin moderation queue. */
export interface JobReportDto {
  id: string;
  jobId?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  jobActive: boolean;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt?: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  /** Three separate reports on one advert is a very different signal from one. */
  totalReportsForJob: number;
}

/**
 * How an employer actually treats applicants.
 * `enoughData` is false below a handful of applications: publishing "0%" off one
 * unanswered application would defame an employer who joined last week.
 */
export interface CompanyResponsivenessDto {
  applicationsReceived: number;
  applicationsAnswered: number;
  responseRate?: number | null;
  averageDaysToRespond?: number | null;
  enoughData: boolean;
}

/** Approved companies in one industry, for the browse-by-industry directory. */
export interface IndustryCountDto {
  industry: Industry;
  count: number;
}

/** An employer on the seeker's "following" list. */
export interface FollowedCompanyDto {
  companyId: string;
  name: string;
  industry?: Industry | null;
  region?: Region | null;
  city?: string | null;
  logo?: FileDto | null;
  /** Open jobs right now — the reason the seeker followed them. */
  openJobs: number;
  followedAt: string;
  emailAlerts: boolean;
}

/**
 * Kinds of employer activity in the feed. Every one is derived from data the
 * platform already records, so none of it is authored and none needs moderating.
 */
export type ActivityType = "JOB_POSTED" | "COMPANY_VERIFIED" | "POSITION_FILLED";

/**
 * One thing an employer did.
 *
 * Carries no prose: the API sends facts and the client decides how to word them,
 * because the platform is bilingual and a server-assembled sentence would arrive
 * in whichever language the server happened to pick.
 */
export interface ActivityEventDto {
  type: ActivityType;
  companyId: string;
  companyName: string;
  companyLogo?: FileDto | null;
  /** Null for company-level events such as verification. */
  jobId?: string | null;
  jobTitle?: string | null;
  region?: Region | null;
  occurredAt: string;
}
