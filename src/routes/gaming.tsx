import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { totalTrackedHoursLabel } from "@/data/gaming";
import { PageShell } from "@/components/portfolio/hobby-hub";
import { GameShelf } from "@/components/portfolio/game-shelf";
import { Reveal, Section, SectionHeading } from "@/components/portfolio/section";

// Split out alongside /gallery, /blog and /volunteering when /hobbies became a hub. It
// shipped as an honest empty state and now holds the shelf; the URL, canonical and social
// card were settled first precisely so filling it in changed nothing but the body.
const TITLE = "Gaming — Saivenkat Jilla";
const DESCRIPTION =
  "The games I keep coming back to, shelved by hours played — Civilization VI at the centre.";

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

        <Reveal immediate delay={0.1}>
          <p
            className="mx-auto text-center text-muted-portfolio"
            style={{
              marginTop: "clamp(24px,3.5vh,38px)",
              maxWidth: 620,
              fontSize: 16,
              lineHeight: 1.7,
              textWrap: "pretty",
            }}
          >
            Mostly strategy, and mostly the kind you lose an evening to by accident. Laid out the
            way a library does its display table — everything face-out, hours on the sticker, and
            Civilization VI on the top step where they put the one they are pushing.
          </p>
        </Reveal>

        <GameShelf />

        <Reveal delay={0.1}>
          <p
            className="mx-auto text-center text-muted-portfolio"
            style={{ marginTop: "clamp(26px,3.5vh,40px)", maxWidth: 620, fontSize: 14 }}
          >
            {totalTrackedHoursLabel()} tracked hours, and Cities: Skylines II leaning at the end
            waiting its turn.
          </p>
        </Reveal>
      </Section>
    </PageShell>
  );
}
