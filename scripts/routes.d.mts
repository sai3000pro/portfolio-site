// Type declarations for scripts/routes.mjs so that vite.config.ts (which tsc
// typechecks) can import ROUTES without an implicit-any error. Keep in sync with
// the exports in routes.mjs.

export interface RouteMeta {
  path: string;
  title: string;
  changefreq: string;
  priority: number;
  ogFile: string;
  /** False to prerender the route but exclude it from sitemap.xml. */
  sitemap?: boolean;
}

export function slugify(title: string): string;
export function getProjectTitles(): string[];
export function getProjectSlugs(): string[];
export function getFullName(): string;
export function getRouteMeta(): RouteMeta[];
export function getRoutes(): string[];
export const ROUTES: string[];
export const SITE_ORIGIN: string;
export function getBase(): string;
export function absoluteUrl(route: string): string;
