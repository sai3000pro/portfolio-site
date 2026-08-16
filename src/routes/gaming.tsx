import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { PageShell } from "@/components/portfolio/hobby-hub";
import { Reveal, Section, SectionHeading } from "@/components/portfolio/section";

// New route, split out alongside /gallery, /blog and /volunteering when /hobbies became
// a hub. The content does not exist yet, so this page says exactly that rather than
// inventing a list of games — the same honesty the empty states in blog-list.tsx and
// volunteering.tsx already use. The route ships now so the hub has four real links and
// the URL, canonical and social card are settled before the writing lands.
const TITLE = "Gaming — Saivenkat Jilla";
const DESCRIPTION = "A page about gaming — still being put together.";

/**
 * This page's own canonical and social card. Both are required, not optional polish:
 * the root shell declares no canonical (see __root.tsx), and without an og:url/og:image
 * override this page would inherit the HOMEPAGE's card — scripts/seo.mjs generates
 * og/gaming.png specifically for it.
 */
const CANONICAL = absoluteUrl("gaming");
const OG_IMAGE = ogImageUrl("gaming.png");

export const Route = createFileRoute("/gaming")({
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
  component: Gaming,
});

function Gaming() {
  return (
    <PageShell>
      <Section id="gaming">
        <SectionHeading as="h1" immediate eyebrow="Downtime" title="Gaming" />

        <Reveal immediate delay={0.14}>
          <p
            className="mx-auto text-center text-muted-portfolio"
            style={{
              marginTop: "clamp(28px,4vh,44px)",
              maxWidth: 560,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Nothing here yet — this page is still being put together.
          </p>
        </Reveal>
      </Section>
    </PageShell>
  );
}
