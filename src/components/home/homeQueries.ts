import { CompaniesApi, JobsApi } from "@/api";

/**
 * Query definitions shared by the home page sections.
 *
 * The hero's job count and the featured job grid read the same request, and
 * the category carousel, the hero and the employer band read the same industry
 * counts. Defining each query once keeps their keys identical, so React Query
 * fetches each of them a single time however many sections use it.
 */

export const featuredJobsQuery = {
  queryKey: ["home", "featured", 8] as const,
  queryFn: () =>
    JobsApi.list({ size: 8, sortBy: "createdAt", sortOrder: "DESC", isActive: true }),
};

/** Same key as the industries directory, so the two pages share one cache entry. */
export const industryCountsQuery = {
  queryKey: ["industry-counts"] as const,
  queryFn: () => CompaniesApi.industryCounts(),
};

export const homeEmployersQuery = {
  queryKey: ["home", "employers"] as const,
  queryFn: () => CompaniesApi.list({ page: 0, size: 12 }),
};
