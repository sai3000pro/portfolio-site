/**
 * Resolve a bundled asset path against the deploy base.
 *
 * Asset paths are stored bare and document-relative (e.g. "assets/logo.png"), which
 * only resolves correctly from the site root. GitHub Pages serves this project from
 * "/<repo>/", so from a sub-route like /<repo>/hobbies a bare path would resolve to
 * /<repo>/hobbies/assets/... and 404. Always route asset paths through this.
 */
export function assetUrl(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
