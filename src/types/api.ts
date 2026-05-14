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

export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type CompanySize = "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type ApplicationStatus = "APPLIED" | "REVIEWED" | "INTERVIEW" | "HIRED" | "REJECTED";

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
  resume?: FileDto | null;
  profilePhoto?: FileDto | null;
  skills?: SkillDto[];
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
  salary?: number | string;
  salaryCurrency?: string;
  postedDate?: string;
  isActive: boolean;
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
  salary?: number;
  salaryCurrency?: string;
  companyId: string;
  location: AddressDto;
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
  website?: string;
  industry?: Industry;
  size?: CompanySize;
  logo?: FileDto | null;
  address?: AddressDto;
  status?: CompanyStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
  activeJobs?: number;
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
  salaryMin?: number;
  salaryMax?: number;
  companyName?: string;
  isActive?: boolean;
  isSaved?: boolean;
}
