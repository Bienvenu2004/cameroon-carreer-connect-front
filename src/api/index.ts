import { api, unwrap } from "@/lib/api";
import type {
  AdminPlatformStatsDto, AdminUserDto, AuthResponseDto, AuthResponseRaw,
  CompanyDto, CreationResponse,
  DashboardDto, JobApplicationDto, JobDto, JobSeekerSaveDto, JobsFilter,
  AiSearchResponseDto,
  JobSeekerProfileDto, NotificationDto, PageResponse, RecommendationDto,
  RecruiterProfileDto, RegionalStatsDto, SavedSearchDto,
  UserDto, UserRole, ApplicationStatus, UpdateApplicationStatusPayload, CompanyStatus, VerificationType,
} from "@/types/api";

/** Normalize backend snake_case auth response to camelCase. */
function normalizeAuth(raw: AuthResponseRaw): AuthResponseDto {
  return {
    user: raw.user,
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    requiresDeviceVerification: raw.requiresDeviceVerification ?? false,
    deviceId: raw.deviceId,
    message: raw.message,
  };
}

/* ---------------- AUTH ----------------
 * Endpoint payloads exactly match the backend DTOs:
 *   - RegisterInitDto       { email }
 *   - UserRegistrationDto   { email, password, role }
 *   - VerifyEmailDto        { email, verificationCode, verificationType }
 *   - AuthenticationRequest { email, password }
 *   - ForgotPasswordRequest { email }
 *   - ResetPasswordRequest  { email, newPassword, confirmNewPassword }
 *   - RefreshTokenRequest   { refreshToken }
 *
 * Auth responses are returned as snake_case on the wire; we normalize to camelCase.
 */
export const AuthApi = {
  /** Step 1 of signup. Triggers a 6-digit code to be emailed. */
  requestEmailVerification: (email: string) =>
    unwrap<void>(api.post("/api/hjp/auth/request-email-verification", { email })),

  /** Step 2 of signup (or password-reset). Verifies the OTP. */
  verifyEmail: (body: { email: string; verificationCode: string; verificationType: VerificationType }) =>
    unwrap<void>(api.post("/api/hjp/auth/verify-email", body)),

  /** Step 3 of signup. Creates the user account once email is verified. */
  register: (body: { email: string; password: string; role: UserRole }) =>
    unwrap<CreationResponse>(api.post("/api/hjp/auth/register", body)),

  /** Resend verification code; defaults to EMAIL_REGISTRATION but works for any type. */
  resendVerification: (email: string, type: VerificationType = "EMAIL_REGISTRATION") =>
    unwrap<void>(api.post(
      `/api/hjp/auth/resend-verification/${encodeURIComponent(email)}`,
      undefined,
      { params: { type } },
    )),

  login: async (body: { email: string; password: string }) => {
    const raw = await unwrap<AuthResponseRaw>(api.post("/api/hjp/auth/login", body));
    return normalizeAuth(raw);
  },

  /**
   * Sign in (or, on first use, sign up) with a Google ID token. `credential`
   * is the token returned by Google Identity Services. `role` is only honored
   * when creating a brand-new account (from the register screen); for an
   * existing account the stored role wins. Returns the same normalized auth
   * response as {@link login} — the session cookies are already set by then.
   */
  google: async (body: { credential: string; role?: UserRole }) => {
    const raw = await unwrap<AuthResponseRaw>(api.post("/api/hjp/auth/google", body));
    return normalizeAuth(raw);
  },

  logout: () => unwrap<void>(api.post("/api/hjp/auth/logout")),

  /** Trigger a password reset OTP to the user's email. */
  forgotPassword: (email: string) =>
    unwrap<void>(api.post("/api/hjp/auth/forgot-password", { email })),

  /** Complete password reset (after the OTP has been verified via verify-email). */
  resetPassword: (body: { email: string; newPassword: string; confirmNewPassword: string }) =>
    unwrap<void>(api.post("/api/hjp/auth/reset-password", body)),
};

/* ---------------- USERS / ME ---------------- */
export const UserApi = {
  me: () => unwrap<UserDto>(api.get("/api/hjp/users/me")),
  myProfile: () => unwrap<JobSeekerProfileDto | RecruiterProfileDto>(api.get("/api/hjp/users/me/profile")),
};

/* ---------------- JOBS ----------------
 * Backend create/update use @ModelAttribute on a DTO with a nested Address —
 * so they must be sent as multipart/form-data with dot-notation keys
 * (location.city, location.region, etc.). Both return Void on success.
 */
export const JobsApi = {
  list: (filter: JobsFilter = {}) =>
    unwrap<PageResponse<JobDto>>(api.get("/api/hjp/jobs/all", { params: filter })),

  myList: (filter: JobsFilter = {}) =>
    unwrap<PageResponse<JobDto>>(api.get("/api/hjp/jobs/", { params: filter })),

  get: (id: string) => unwrap<JobDto>(api.get(`/api/hjp/jobs/${id}`)),

  create: (form: FormData) =>
    unwrap<void>(api.post("/api/hjp/jobs/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),

  update: (id: string, form: FormData) =>
    unwrap<void>(api.patch(`/api/hjp/jobs/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),

  close: (id: string) => unwrap<void>(api.patch(`/api/hjp/jobs/${id}/close`)),

  remove: (id: string) => unwrap<void>(api.delete(`/api/hjp/jobs/${id}`)),
};

/* ---------------- APPLICATIONS ----------------
 * The backend DTO (JobSeekerApplyDto) names its job-id field
 * `jobPostActivityId` — we mirror that on the wire. We still accept
 * `jobId` at the call site for ergonomics and translate it here.
 */
export const ApplicationsApi = {
  apply: (body: { jobId: string; coverLetter?: string }) =>
    unwrap<JobApplicationDto>(api.post("/api/hjp/jobs/apply", {
      jobPostActivityId: body.jobId,
      coverLetter: body.coverLetter,
    })),

  list: (params: Record<string, unknown> = {}) =>
    unwrap<PageResponse<JobApplicationDto>>(api.get("/api/hjp/jobs/applications", { params })),

  /**
   * Backend takes UpdateApplicationStatusDto as a JSON body. For INTERVIEW,
   * include the interview place/date-time/phone/note so the candidate can be
   * emailed the invitation; other statuses just send `status`.
   *
   * Accepts either a bare status (ergonomic for APPLIED/REVIEWED/HIRED/REJECTED)
   * or the full payload when scheduling an interview.
   */
  updateStatus: (id: string, payload: ApplicationStatus | UpdateApplicationStatusPayload) =>
    unwrap<void>(api.patch(
      `/api/hjp/jobs/applications/${id}/status`,
      typeof payload === "string" ? { status: payload } : payload,
    )),
};

/* ---------------- SAVED JOBS ----------------
 * Note: controller uses bare @GetMapping (no path) so the endpoint is
 * /api/hjp/saved-jobs WITHOUT a trailing slash. Spring Boot 3+ does not
 * treat /foo and /foo/ as equivalent — adding a slash here would 404.
 */
export const SavedJobsApi = {
  toggle: (jobId: string) => unwrap<unknown>(api.post(`/api/hjp/saved-jobs/${jobId}`)),
  list: (params: Record<string, unknown> = {}) =>
    unwrap<PageResponse<JobSeekerSaveDto>>(api.get("/api/hjp/saved-jobs", { params })),
};

/* ---------------- SAVED SEARCHES ----------------
 * Same trailing-slash situation as saved-jobs: the controller uses bare
 * @GetMapping / @PostMapping so the base path has no trailing slash.
 */
export const SavedSearchApi = {
  list: () => unwrap<SavedSearchDto[]>(api.get("/api/hjp/saved-searches")),
  create: (body: SavedSearchDto) =>
    unwrap<SavedSearchDto>(api.post("/api/hjp/saved-searches", body)),
  update: (id: string, body: Partial<SavedSearchDto>) =>
    unwrap<SavedSearchDto>(api.patch(`/api/hjp/saved-searches/${id}`, body)),
  remove: (id: string) => unwrap<void>(api.delete(`/api/hjp/saved-searches/${id}`)),
};

/* ---------------- COMPANIES ---------------- */
export const CompaniesApi = {
  list: (params: Record<string, unknown> = {}) =>
    unwrap<PageResponse<CompanyDto>>(api.get("/api/hjp/companies/", { params })),

  /** All companies owned by the current authenticated recruiter, newest first. */
  mine: () => unwrap<CompanyDto[]>(api.get("/api/hjp/companies/me")),

  get: (id: string) => unwrap<CompanyDto>(api.get(`/api/hjp/companies/${id}`)),

  create: (form: FormData) =>
    unwrap<CompanyDto>(api.post("/api/hjp/companies/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),

  update: (id: string, form: FormData) =>
    unwrap<CompanyDto>(api.patch(`/api/hjp/companies/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),

  remove: (id: string) => unwrap<void>(api.delete(`/api/hjp/companies/${id}`)),
};

/* ---------------- ADMIN ---------------- */
export const AdminApi = {
  listUsers: (params: Record<string, unknown> = {}) =>
    unwrap<PageResponse<AdminUserDto>>(api.get("/api/hjp/admin/users", { params })),

  getUser: (id: string) => unwrap<AdminUserDto>(api.get(`/api/hjp/admin/users/${id}`)),

  suspendUser: (id: string) =>
    unwrap<AdminUserDto>(api.patch(`/api/hjp/admin/users/${id}/suspend`)),

  reactivateUser: (id: string) =>
    unwrap<AdminUserDto>(api.patch(`/api/hjp/admin/users/${id}/reactivate`)),

  softDeleteUser: (id: string) => unwrap<void>(api.delete(`/api/hjp/admin/users/${id}`)),

  listCompanies: (params: { status?: CompanyStatus } & Record<string, unknown> = {}) =>
    unwrap<PageResponse<CompanyDto>>(api.get("/api/hjp/admin/companies", { params })),

  approveCompany: (id: string) =>
    unwrap<CompanyDto>(api.patch(`/api/hjp/admin/companies/${id}/approve`)),

  rejectCompany: (id: string, reason: string) =>
    unwrap<CompanyDto>(api.patch(`/api/hjp/admin/companies/${id}/reject`, { reason })),

  suspendCompany: (id: string, reason: string) =>
    unwrap<CompanyDto>(api.patch(`/api/hjp/admin/companies/${id}/suspend`, { reason })),

  stats: () => unwrap<AdminPlatformStatsDto>(api.get("/api/hjp/admin/stats")),
};

/* ---------------- ANALYTICS ---------------- */
export const AnalyticsApi = {
  dashboard: () => unwrap<DashboardDto>(api.get("/api/hjp/analytics/dashboard")),
  /** Admin-only — regional trending dashboard. */
  regional: () => unwrap<RegionalStatsDto>(api.get("/api/hjp/analytics/regional")),
};

/* ---------------- NOTIFICATIONS ----------------
 * Read-side surface for the bell-icon dropdown. All endpoints are
 * scoped server-side to the authenticated user — there's no parameter
 * for "whose notifications" because there cannot be.
 */
export const NotificationsApi = {
  list: (page = 0, size = 10) =>
    unwrap<PageResponse<NotificationDto>>(
      api.get("/api/hjp/notifications", {
        params: { page, size, sortBy: "createdAt", sortOrder: "DESC" },
      })
    ),

  unreadCount: () =>
    unwrap<{ count: number }>(api.get("/api/hjp/notifications/unread-count")),

  markAsRead: (id: string) =>
    unwrap<void>(api.patch(`/api/hjp/notifications/${id}/read`)),

  markAllAsRead: () =>
    unwrap<void>(api.patch("/api/hjp/notifications/read-all")),
};

/* ---------------- SKILLS ---------------- */
export const SkillsApi = {
  /**
   * Distinct skill-name suggestions matching `q` (case-insensitive
   * substring). Backed by SkillRepository.findDistinctNamesByQuery — used
   * by the seeker-profile tag autocomplete. Returns [] for an empty query.
   */
  suggest: (q: string, limit = 8) =>
    unwrap<string[]>(api.get("/api/hjp/skills/suggest", { params: { q, limit } })),
};

/* ---------------- SEEKER PROFILE ----------------
 * The PATCH endpoint uses @PatchMapping(consumes="multipart/form-data") with
 * no path argument — base path has no trailing slash.
 */
export const SeekerApi = {
  me: () => unwrap<JobSeekerProfileDto>(api.get("/api/hjp/job-seeker-profile/me")),

  /**
   * Used by recruiters to view an applicant's profile from
   * `/recruiter/applications`. The {id} is the JobSeekerProfile UUID
   * (== User UUID via @MapsId).
   */
  getById: (id: string) =>
    unwrap<JobSeekerProfileDto>(api.get(`/api/hjp/job-seeker-profile/${id}`)),

  update: (form: FormData) =>
    unwrap<JobSeekerProfileDto>(api.patch("/api/hjp/job-seeker-profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),
};

/* ---------------- AI ASSISTANT ----------------
 * Backend: /api/hjp/ai/recommendations is JOB_SEEKER-only.
 * Returns at most 5 ranked jobs. Always returns an array (possibly
 * empty) — the UI renders an empty state, never an error toast, when
 * the model can't produce recommendations.
 */
export const AiApi = {
  recommendations: () =>
    unwrap<RecommendationDto[]>(api.get("/api/hjp/ai/recommendations")),

  /**
   * Natural-language job search (§5.2 of the product spec). Public —
   * works for anonymous users. The backend always returns a result
   * (never throws), so an empty interpretation + the keyword-fallback
   * result set is the normal "low-confidence" branch — not an error.
   */
  search: (query: string, size?: number) =>
    unwrap<AiSearchResponseDto>(api.post("/api/hjp/ai/search", { query, size })),
};

/* ---------------- RECRUITER PROFILE ----------------
 * Same as seeker profile — bare @PatchMapping(consumes={...}) on the class,
 * so no trailing slash on the URL.
 */
export const RecruiterApi = {
  me: () => unwrap<RecruiterProfileDto>(api.get("/api/hjp/recruiter-profile/me")),
  update: (form: FormData) =>
    unwrap<RecruiterProfileDto>(api.patch("/api/hjp/recruiter-profile", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })),
};
