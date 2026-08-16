// Canonical project-slug rule.
//
// This MUST stay character-for-character identical to `slugify` in
// scripts/routes.mjs (used to derive the sitemap / prerender route list). If the
// two ever diverge, prerendered /projects/<slug> pages will 404. The rule:
// lowercase, trim, replace any run of non-alphanumeric characters with "-", then
// strip leading/trailing "-".
export function slugify(title: string): string {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
