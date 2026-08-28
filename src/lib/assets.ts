import { GENERATED_IMAGES, type GeneratedImageId } from "@/data/images.generated";

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

/**
 * Build `<img>` props for a project image that has generated derivatives.
 *
 * Lives here rather than in a component file because two components need it — the
 * constellation cards and the More-projects gallery — and a component module cannot
 * export a plain helper without tripping `react-refresh/only-export-components`.
 *
 * `imageId` is optional and the fallback is deliberate: a project with no derivatives
 * still renders, just at the original's full size with no srcSet. That is what makes it
 * safe to add a project before running `bun run assets` for it.
 *
 * The smallest source doubles as the `src` fallback, and `width`/`height` come from it so
 * the browser can reserve the right aspect box before any bytes land (CLS).
 */
export function responsiveImageProps(
  image: string,
  imageId: GeneratedImageId | undefined,
  sizes: string,
) {
  const generated = imageId ? GENERATED_IMAGES[imageId] : undefined;
  const smallest = generated?.sources[0];
  return {
    src: assetUrl(smallest?.src ?? image),
    srcSet: generated?.sources.map((s) => `${assetUrl(s.src)} ${s.width}w`).join(", "),
    sizes: generated ? sizes : undefined,
    width: smallest?.width,
    height: smallest?.height,
  };
}
