import { Routes, Route } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import { HomePage } from "@/pages/public/HomePage";
import { JobsPage } from "@/pages/public/JobsPage";
import { JobDetailPage } from "@/pages/public/JobDetailPage";
import { CompaniesPage } from "@/pages/public/CompaniesPage";
import { CompanyDetailPage } from "@/pages/public/CompanyDetailPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";

import { SeekerLayout } from "@/pages/seeker/SeekerLayout";
import { SeekerDashboard } from "@/pages/seeker/SeekerDashboard";
import { MyApplications } from "@/pages/seeker/MyApplications";
import { SavedJobsPage } from "@/pages/seeker/SavedJobsPage";
import { SavedSearchesPage } from "@/pages/seeker/SavedSearchesPage";
import { SeekerProfilePage } from "@/pages/seeker/SeekerProfilePage";
import { RecommendedJobsPage } from "@/pages/seeker/RecommendedJobsPage";

import { RecruiterLayout } from "@/pages/recruiter/RecruiterLayout";
import { RecruiterDashboard } from "@/pages/recruiter/RecruiterDashboard";
import { MyJobs } from "@/pages/recruiter/MyJobs";
import { JobEditor } from "@/pages/recruiter/JobEditor";
import { ApplicationsReceived } from "@/pages/recruiter/ApplicationsReceived";
import { MyCompaniesPage } from "@/pages/recruiter/MyCompaniesPage";
import { CompanyEditor } from "@/pages/recruiter/CompanyEditor";

import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminStats } from "@/pages/admin/AdminStats";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminCompanies } from "@/pages/admin/AdminCompanies";

export function AppRouter() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="about" element={<AboutPage />} />
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
        <Route path="companies" element={<MyCompaniesPage />} />
        <Route path="companies/new" element={<CompanyEditor mode="create" />} />
        <Route path="companies/:id/edit" element={<CompanyEditor mode="edit" />} />
        <Route path="jobs" element={<MyJobs />} />
        <Route path="jobs/new" element={<JobEditor mode="create" />} />
        <Route path="jobs/:id/edit" element={<JobEditor mode="edit" />} />
        <Route path="applications" element={<ApplicationsReceived />} />
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
      </Route>
    </Routes>
  );
}
