import { describe, expect, it } from "vitest";

import { notificationLink } from "@/lib/notificationLink";

const JOB = "b011c7f7-8f8c-4d10-903c-f34bd5689eca";
const APP = "3f2c1a90-5d4e-4b7a-9c61-0e8a2b7d4f15";

describe("notificationLink", () => {
  it("sends job notifications to the job page, whoever reads them", () => {
    for (const role of ["JOB_SEEKER", "RECRUITER", "SYSTEM_ADMIN"] as const) {
      expect(notificationLink({ relatedEntityType: "JOB", relatedEntityId: JOB }, role)).toBe(`/jobs/${JOB}`);
    }
  });

  it("opens an application from the side of the person reading it", () => {
    const n = { relatedEntityType: "APPLICATION", relatedEntityId: APP };
    expect(notificationLink(n, "RECRUITER")).toBe(`/recruiter/applications?application=${APP}`);
    expect(notificationLink(n, "JOB_SEEKER")).toBe(`/seeker/applications?application=${APP}`);
  });

  it("has nowhere to send an administrator for an application", () => {
    expect(
      notificationLink({ relatedEntityType: "APPLICATION", relatedEntityId: APP }, "SYSTEM_ADMIN"),
    ).toBeNull();
  });

  it("sends account notifications to the reader's own account page", () => {
    const n = { relatedEntityType: "USER", relatedEntityId: APP };
    expect(notificationLink(n, "JOB_SEEKER")).toBe("/seeker/profile");
    expect(notificationLink(n, "RECRUITER")).toBe("/recruiter/profile");
    expect(notificationLink(n, "SYSTEM_ADMIN")).toBe("/admin");
  });

  it("does not guess when the entity type is unknown or the id is missing", () => {
    expect(notificationLink({ relatedEntityType: "PROPERTY", relatedEntityId: JOB }, "JOB_SEEKER")).toBeNull();
    expect(notificationLink({ relatedEntityType: null, relatedEntityId: JOB }, "JOB_SEEKER")).toBeNull();
    expect(notificationLink({ relatedEntityType: "JOB", relatedEntityId: null }, "JOB_SEEKER")).toBeNull();
    expect(notificationLink({ relatedEntityType: "APPLICATION" }, "RECRUITER")).toBeNull();
  });

  it("accepts the entity type in any case", () => {
    expect(notificationLink({ relatedEntityType: "job", relatedEntityId: JOB }, "JOB_SEEKER")).toBe(`/jobs/${JOB}`);
  });

  it("escapes the id so it cannot break out of the path", () => {
    expect(notificationLink({ relatedEntityType: "JOB", relatedEntityId: "a/b?c" }, "JOB_SEEKER")).toBe("/jobs/a%2Fb%3Fc");
  });
});
