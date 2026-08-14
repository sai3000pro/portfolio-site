import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { VolunteeringSection } from "@/components/portfolio/volunteering";
import { PageShell } from "@/components/portfolio/hobby-hub";

// The volunteering timeline used to be the bottom third of /hobbies. It is its own
// route now so it can have its own title, canonical and social card instead of sharing
// "Beyond the Code" with the photo wall and the blog. /hobbies is the hub that links here.
const TITLE = "Volunteering — Saivenkat Jilla";
const DESCRIPTION = "A timeline of volunteering roles, the organisations behind them, and dates.";

/**
 * This page's own canonical and social card. Both are required, not optional polish:
 * the root shell declares no canonical (see __root.tsx), and without an og:url/og:image
 * override this page would inherit the HOMEPAGE's card — scripts/seo.mjs generates
 * og/volunteering.png specifically for it.
 */
const CANONICAL = absoluteUrl("volunteering");
const OG_IMAGE = ogImageUrl("volunteering.png");

export const Route = createFileRoute("/volunteering")({
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
  component: VolunteeringRoute,
});

function VolunteeringRoute() {
  return (
    <PageShell>
      {/* VolunteeringSection renders its own <h2> under a "Giving back" eyebrow, and a
          quiet "Coming soon" while src/data/volunteering.ts is empty. Unchanged here on
          purpose — promoting it to the page <h1> is a change to a file owned elsewhere. */}
      <VolunteeringSection />
    </PageShell>
  );
}
