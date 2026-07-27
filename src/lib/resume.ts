/**
 * Auto-generate a downloadable résumé from a job-seeker's structured profile
 * data (§4.2 of the product spec: "Auto-generate a downloadable resume
 * directly from profile data").
 *
 * Why client-side instead of a backend PDF service:
 *   - Every field we need is already loaded on the profile page, so there is
 *     nothing to fetch and no new backend dependency (PDF libraries are heavy).
 *   - The browser's own print engine produces a clean, vector, selectable-text
 *     PDF — higher quality than a rasterized html2canvas approach — and lets
 *     the user pick "Save as PDF" or send straight to a printer.
 *
 * We render into a hidden <iframe> (not window.open) so pop-up blockers never
 * swallow the action, then trigger print() on the frame and clean it up.
 */

import type { JobSeekerProfileDto, WorkExperienceDto } from "@/types/api";

/** Translated, locale-aware strings supplied by the caller (bilingual FR/EN). */
export interface ResumeLabels {
  /** Document heading / browser tab title, e.g. "Résumé". */
  resume: string;
  experience: string;
  skills: string;
  languages: string;
  links: string;
  /** "Present" — used for the end of a current role's date range. */
  present: string;
  /** Fully-built footer line, e.g. "Generated from JobConnect on 27/07/2026". */
  footer: string;
}

export interface ResumeOptions {
  email?: string | null;
  /** BCP-47 locale for date formatting, e.g. "en-GB" / "fr-FR". */
  locale: string;
  labels: ResumeLabels;
}

/** Escape a value for safe interpolation into the résumé HTML. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Split the backend's comma-separated spokenLanguages into trimmed tokens. */
function parseLanguages(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** "Jan 2022 — Present" / "Jan 2022 — Jun 2024" in the user's locale. */
function formatRange(xp: WorkExperienceDto, locale: string, present: string): string {
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" }).format(d);
  };
  const start = fmt(xp.startDate);
  const end = xp.isCurrent ? present : fmt(xp.endDate);
  if (!start && !end) return "";
  if (!end) return start;
  return `${start} — ${end}`;
}

/** Collect the present, non-empty portfolio / social links as label→url pairs. */
function collectLinks(p: JobSeekerProfileDto): { label: string; url: string }[] {
  const entries: [string, string | undefined][] = [
    ["LinkedIn", p.linkedinUrl],
    ["GitHub", p.githubUrl],
    ["Website", p.websiteUrl],
    ["Portfolio", p.portfolioUrl],
    ["X / Twitter", p.twitterUrl],
    ["Facebook", p.facebookUrl],
  ];
  return entries
    .filter(([, url]) => url && url.trim().length > 0)
    .map(([label, url]) => ({ label, url: url!.trim() }));
}

/**
 * Build a self-contained HTML document for the résumé. All styling is inline
 * so the print frame needs no external stylesheet, and an @page rule keeps
 * sensible margins in the generated PDF.
 */
export function buildResumeHtml(profile: JobSeekerProfileDto, opts: ResumeOptions): string {
  const { labels, locale } = opts;
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  const displayName = fullName || labels.resume;

  const contactBits: string[] = [];
  if (opts.email) contactBits.push(esc(opts.email));
  if (profile.phoneNumber) contactBits.push(esc(profile.phoneNumber));
  const locationBits = [
    profile.address?.city,
    profile.address?.country,
  ].filter(Boolean).map(esc);
  if (locationBits.length) contactBits.push(locationBits.join(", "));

  const experiences = profile.experiences ?? [];
  const skills = (profile.skills ?? []).map((s) => s.name).filter(Boolean);
  const languages = parseLanguages(profile.spokenLanguages);
  const links = collectLinks(profile);

  const experienceHtml = experiences.length
    ? `
      <section class="block">
        <h2>${esc(labels.experience)}</h2>
        ${experiences.map((xp) => {
          const loc = [xp.city, xp.country].filter(Boolean).map(esc).join(", ");
          return `
          <div class="xp">
            <div class="xp-head">
              <span class="xp-title">${esc(xp.title)}</span>
              <span class="xp-dates">${esc(formatRange(xp, locale, labels.present))}</span>
            </div>
            <div class="xp-sub">${esc(xp.companyName)}${loc ? ` · ${loc}` : ""}</div>
            ${xp.description ? `<p class="xp-desc">${esc(xp.description).replace(/\n/g, "<br>")}</p>` : ""}
          </div>`;
        }).join("")}
      </section>`
    : "";

  const skillsHtml = skills.length
    ? `
      <section class="block">
        <h2>${esc(labels.skills)}</h2>
        <div class="tags">${skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
      </section>`
    : "";

  const languagesHtml = languages.length
    ? `
      <section class="block">
        <h2>${esc(labels.languages)}</h2>
        <div class="tags">${languages.map((l) => `<span class="tag">${esc(l)}</span>`).join("")}</div>
      </section>`
    : "";

  const linksHtml = links.length
    ? `
      <section class="block">
        <h2>${esc(labels.links)}</h2>
        <ul class="links">${links.map((l) => `<li><span class="link-label">${esc(l.label)}:</span> ${esc(l.url)}</li>`).join("")}</ul>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="${esc(locale.slice(0, 2))}">
<head>
<meta charset="utf-8">
<title>${esc(displayName)} — ${esc(labels.resume)}</title>
<style>
  * { box-sizing: border-box; }
  @page { margin: 16mm 14mm; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a2e;
    font-size: 12px;
    line-height: 1.5;
  }
  .sheet { max-width: 720px; margin: 0 auto; padding: 8px; }
  header.top { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
  header.top h1 { margin: 0; font-size: 26px; letter-spacing: -0.02em; color: #0f172a; }
  .contact { margin-top: 6px; color: #475569; font-size: 11.5px; }
  .contact span:not(:last-child)::after { content: "  •  "; color: #cbd5e1; }
  .block { margin-bottom: 16px; page-break-inside: avoid; }
  .block h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;
    color: #2563eb; margin: 0 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;
  }
  .xp { margin-bottom: 10px; page-break-inside: avoid; }
  .xp-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .xp-title { font-weight: 700; font-size: 13px; color: #0f172a; }
  .xp-dates { color: #64748b; font-size: 11px; white-space: nowrap; }
  .xp-sub { color: #334155; font-size: 12px; }
  .xp-desc { margin: 4px 0 0; color: #334155; white-space: normal; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; border-radius: 999px; padding: 2px 10px; font-size: 11px; }
  ul.links { margin: 0; padding-left: 0; list-style: none; }
  ul.links li { margin-bottom: 3px; word-break: break-all; }
  .link-label { font-weight: 600; color: #0f172a; }
  footer.foot { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <div class="sheet">
    <header class="top">
      <h1>${esc(displayName)}</h1>
      ${contactBits.length ? `<div class="contact">${contactBits.map((c) => `<span>${c}</span>`).join("")}</div>` : ""}
    </header>
    ${experienceHtml}
    ${skillsHtml}
    ${languagesHtml}
    ${linksHtml}
    <footer class="foot">${esc(labels.footer)}</footer>
  </div>
</body>
</html>`;
}

/**
 * Generate the résumé and open the browser's print / "Save as PDF" dialog.
 * Renders into an off-screen iframe so pop-up blockers don't interfere, then
 * removes the frame once printing has been triggered.
 */
export function downloadResumeFromProfile(
  profile: JobSeekerProfileDto,
  opts: ResumeOptions,
): void {
  const html = buildResumeHtml(profile, opts);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  const cleanup = () => {
    // Give the print dialog time to grab the frame's contents before we drop it.
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  doc.open();
  doc.write(html);
  doc.close();

  // Print once the frame's document has finished parsing. The onload guard
  // covers browsers that need a tick; the readyState check covers those that
  // are already done by the time we get here.
  if (doc.readyState === "complete") {
    window.setTimeout(doPrint, 150);
  } else {
    win.onload = () => window.setTimeout(doPrint, 150);
  }
}
