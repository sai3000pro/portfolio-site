import { createFileRoute } from "@tanstack/react-router";

import { HOBBY_PHOTOS } from "@/data/hobbies";
import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { PhotoGallery } from "@/components/portfolio/photo-gallery";
import { PageShell } from "@/components/portfolio/hobby-hub";

// The photo wall used to be the top half of /hobbies. It is its own route now so it can
// have its own title, canonical and social card instead of sharing "Beyond the Code"
// with the blog and the volunteering timeline. /hobbies is the hub that links here.
const TITLE = "Photography — Saivenkat Jilla";
const DESCRIPTION =
  "A wall of landscape, water, sky and travel photography, with the capture details behind each frame.";

/**
 * This page's own canonical and social card. Both are required, not optional polish:
 * the root shell declares no canonical (see __root.tsx), and without an og:url/og:image
 * override this page would inherit the HOMEPAGE's card — scripts/seo.mjs generates
 * og/gallery.png specifically for it.
 */
const CANONICAL = absoluteUrl("gallery");
const OG_IMAGE = ogImageUrl("gallery.png");

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: `Social card for ${TITLE}` },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: Gallery,
});

function Gallery() {
  return (
    // layeredMain={false}: <main> stays position: static with no z-index, so it creates
    // no new stacking context. The gallery lifts its own section above the starfield, and
    // — the reason this still matters — the lightbox is `position: fixed` and must be able
    // to cover the footer, which PageShell renders at z-index 2. See the note on PageShell.
    <PageShell layeredMain={false}>
      {/* The gallery owns the justified grid, the spiral intro, the lightbox — and its
          own <h1>. This page must not add a second one. */}
      <PhotoGallery photos={HOBBY_PHOTOS} />
    </PageShell>
  );
}
