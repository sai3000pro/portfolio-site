import { createFileRoute } from "@tanstack/react-router";

import { HOBBY_PHOTOS } from "@/data/hobbies";
import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { HobbyWall } from "@/components/portfolio/hobby-belts";
import { BlogList } from "@/components/portfolio/blog-list";
import { VolunteeringSection } from "@/components/portfolio/volunteering";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";

// The route stays /hobbies — it is linked, prerendered, in the sitemap and carries an
// achievement. Only what the page calls itself changed.
const TITLE = "Photography — Saivenkat Jilla";
const DESCRIPTION =
  "Landscape and environment photography, writing, and volunteering — life outside the terminal.";

/**
 * This page's own canonical and social card. Both are required, not optional polish:
 * the root shell declares no canonical (see __root.tsx), and without an og:url/og:image
 * override this page would inherit the HOMEPAGE's card — scripts/seo.mjs generates
 * og/hobbies.png specifically for it.
 */
const CANONICAL = absoluteUrl("hobbies");
const OG_IMAGE = ogImageUrl("hobbies.png");

export const Route = createFileRoute("/hobbies")({
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
  component: Hobbies,
});

function Hobbies() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      {/* Fewer stars than the landing page — the belt loop shares the main thread. */}
      <Starfield count={380} />

      <Nav />

      {/* Landmark + target of the root skip link. It has to start AFTER <Nav /> for the
          skip to be worth anything, and it excludes the decorative starfield and the
          footer. <main> is position: static and sets no z-index, so it creates no new
          stacking context — the wall's internal z-indexes still resolve against the same
          root context they did before, and nothing moves. */}
      <main id="main-content" tabIndex={-1}>
        {/* The wall owns the full-screen spiral intro, the belts, and its own heading overlay. */}
        <HobbyWall photos={HOBBY_PHOTOS} />

        {/* Below the fold: the rest of life outside the terminal. These sit above the
            starfield (which is z-index 0) via their own stacking context. */}
        <div className="relative" style={{ zIndex: 2 }}>
          <BlogList />
          <VolunteeringSection />
        </div>
      </main>

      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
}
