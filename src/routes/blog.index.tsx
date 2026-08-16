import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { BlogList } from "@/components/portfolio/blog-list";
import { PageShell } from "@/components/portfolio/hobby-hub";

// blog.index.tsx, NOT blog.tsx. Under flat routing, a `blog.tsx` becomes the PARENT
// LAYOUT of blog.$slug.tsx — and that post page renders a complete shell of its own
// (starfield, nav, <main id="main-content">, footer). Nesting one inside the other
// would ship two starfields, two navs and two #main-content elements, and the second
// landmark breaks the root skip link. The index suffix makes this a sibling instead.
//
// The listing used to be the middle third of /hobbies; it now has its own title,
// canonical and social card, and /hobbies is the hub that links here.
const TITLE = "Blog — Saivenkat Jilla";
const DESCRIPTION = "Writing collected in one place, newest first.";

/**
 * This page's own canonical and social card. Both are required, not optional polish:
 * the root shell declares no canonical (see __root.tsx), and without an og:url/og:image
 * override this page would inherit the HOMEPAGE's card — scripts/seo.mjs generates
 * og/blog.png specifically for it.
 */
const CANONICAL = absoluteUrl("blog");
const OG_IMAGE = ogImageUrl("blog.png");

export const Route = createFileRoute("/blog/")({
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
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <PageShell>
      {/* BlogList renders its own <h2> under a "Writing" eyebrow. Unchanged here on
          purpose — promoting it to the page <h1> is a change to a file owned elsewhere. */}
      <BlogList />
    </PageShell>
  );
}
