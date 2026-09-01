import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { RouteFallback } from "@/components/common/RouteFallback";

/**
 * Every page is loaded on demand.
 *
 * The application used to build as a single 1.2 MB JavaScript bundle, so an
 * anonymous visitor reading one job advert downloaded the admin dashboard, the
 * charting library, the recruiter editors and every other screen before the
 * page could render. On the metered 2G/3G connections this platform is built
 * for, that is the difference between a usable site and an abandoned one.
 *
 * Splitting per page means the browser fetches the shell plus the one route it
 * needs. `AppShell` and `ProtectedRoute` stay eagerly imported because they are
 * required to render anything at all, and lazy-loading them would only add a
 * round trip.
 *
 * Named exports are mapped to the default export React.lazy expects.
 */

/* ---------------------------------- public --------------------------------- */
const HomePage = lazy(() => import("@/pages/public/HomePage").then(m => ({ default: m.HomePage })));
const JobsPage = lazy(() => import("@/pages/public/JobsPage").then(m => ({ default: m.JobsPage })));
const JobDetailPage = lazy(() => import("@/pages/public/JobDetailPage").then(m => ({ default: m.JobDetailPage })));
const CompaniesPage = lazy(() => import("@/pages/public/CompaniesPage").then(m => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import("@/pages/public/CompanyDetailPage").then(m => ({ default: m.CompanyDetailPage })));
const AboutPage = lazy(() => import("@/pages/public/AboutPage").then(m => ({ default: m.AboutPage })));
const ConcoursPage = lazy(() => import("@/pages/public/ConcoursPage").then(m => ({ default: m.ConcoursPage })));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

/* ----------------------------------- auth ---------------------------------- */
const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })));

/* ---------------------------------- seeker --------------------------------- */
const SeekerLayout = lazy(() => import("@/pages/seeker/SeekerLayout").then(m => ({ default: m.SeekerLayout })));
const SeekerDashboard = lazy(() => import("@/pages/seeker/SeekerDashboard").then(m => ({ default: m.SeekerDashboard })));
const MyApplications = lazy(() => import("@/pages/seeker/MyApplications").then(m => ({ default: m.MyApplications })));
const SavedJobsPage = lazy(() => import("@/pages/seeker/SavedJobsPage").then(m => ({ default: m.SavedJobsPage })));
const SavedSearchesPage = lazy(() => import("@/pages/seeker/SavedSearchesPage").then(m => ({ default: m.SavedSearchesPage })));
const SeekerProfilePage = lazy(() => import("@/pages/seeker/SeekerProfilePage").then(m => ({ default: m.SeekerProfilePage })));
const RecommendedJobsPage = lazy(() => import("@/pages/seeker/RecommendedJobsPage").then(m => ({ default: m.RecommendedJobsPage })));
const InvitationsPage = lazy(() => import("@/pages/seeker/InvitationsPage").then(m => ({ default: m.InvitationsPage })));

/* -------------------------------- recruiter -------------------------------- */
const RecruiterLayout = lazy(() => import("@/pages/recruiter/RecruiterLayout").then(m => ({ default: m.RecruiterLayout })));
const RecruiterDashboard = lazy(() => import("@/pages/recruiter/RecruiterDashboard").then(m => ({ default: m.RecruiterDashboard })));
const RecruiterProfilePage = lazy(() => import("@/pages/recruiter/RecruiterProfilePage").then(m => ({ default: m.RecruiterProfilePage })));
const MyJobs = lazy(() => import("@/pages/recruiter/MyJobs").then(m => ({ default: m.MyJobs })));
const JobEditor = lazy(() => import("@/pages/recruiter/JobEditor").then(m => ({ default: m.JobEditor })));
const QuickJobPost = lazy(() => import("@/pages/recruiter/QuickJobPost").then(m => ({ default: m.QuickJobPost })));
const ApplicationsReceived = lazy(() => import("@/pages/recruiter/ApplicationsReceived").then(m => ({ default: m.ApplicationsReceived })));
const MyCompaniesPage = lazy(() => import("@/pages/recruiter/MyCompaniesPage").then(m => ({ default: m.MyCompaniesPage })));
const RecruiterCompanyDetailPage = lazy(() => import("@/pages/recruiter/CompanyDetailPage").then(m => ({ default: m.RecruiterCompanyDetailPage })));
const CompanyEditor = lazy(() => import("@/pages/recruiter/CompanyEditor").then(m => ({ default: m.CompanyEditor })));
const CandidateSearchPage = lazy(() => import("@/pages/recruiter/CandidateSearchPage").then(m => ({ default: m.CandidateSearchPage })));

/* ----------------------------------- admin --------------------------------- */
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminStats = lazy(() => import("@/pages/admin/AdminStats").then(m => ({ default: m.AdminStats })));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminCompanies = lazy(() => import("@/pages/admin/AdminCompanies").then(m => ({ default: m.AdminCompanies })));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports").then(m => ({ default: m.AdminReports })));

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* PUBLIC */}
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="concours" element={<ConcoursPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* AUTH */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        {/* SEEKER */}
        <Route
          path="seeker"
          element={
            <ProtectedRoute allow={["JOB_SEEKER"]}>
              <SeekerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SeekerDashboard />} />
          <Route path="recommendations" element={<RecommendedJobsPage />} />
          <Route path="profile" element={<SeekerProfilePage />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="saved-jobs" element={<SavedJobsPage />} />
          <Route path="saved-searches" element={<SavedSearchesPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
        </Route>

        {/* RECRUITER */}
        <Route
          path="recruiter"
          element={
            <ProtectedRoute allow={["RECRUITER"]}>
              <RecruiterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RecruiterDashboard />} />
          <Route path="profile" element={<RecruiterProfilePage />} />
          <Route path="companies" element={<MyCompaniesPage />} />
          <Route path="companies/new" element={<CompanyEditor mode="create" />} />
          <Route path="companies/:id" element={<RecruiterCompanyDetailPage />} />
          <Route path="companies/:id/edit" element={<CompanyEditor mode="edit" />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="jobs/quick" element={<QuickJobPost />} />
          <Route path="jobs/new" element={<JobEditor mode="create" />} />
          <Route path="jobs/:id/edit" element={<JobEditor mode="edit" />} />
          <Route path="applications" element={<ApplicationsReceived />} />
          <Route path="candidates" element={<CandidateSearchPage />} />
        </Route>

        {/* ADMIN */}
        <Route
          path="admin"
          element={
            <ProtectedRoute allow={["SYSTEM_ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminStats />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
