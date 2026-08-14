import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { HobbyHub, PageShell } from "@/components/portfolio/hobby-hub";

// The route stays /hobbies — it is linked, prerendered, in the sitemap, and it carries
// the "spacewalk" achievement, which achievement-tracker.tsx unlocks off this pathname.
//
// What changed twice is what the page calls itself, and once what it contains. It began
// as "Hobbies", was narrowed to "Photography" while it was only a photo wall, then grew
// into "Beyond the Code" when writing and volunteering were stacked underneath the wall —
// three unrelated things sharing one title, one <h1> and one canonical.
//
// They are now four separate routes: /gallery (the wall), /blog, /gaming and
// /volunteering. Each has its own title, canonical and social card, and /hobbies keeps
// the name it earned and is the hub that links to them.
const TITLE = "Beyond the Code — Saivenkat Jilla";
const DESCRIPTION =
  "Photography, writing, gaming and volunteering — the four things here that aren't work.";

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
    <PageShell>
      <HobbyHub />
    </PageShell>
  );
}
