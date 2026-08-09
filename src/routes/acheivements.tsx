import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { unlock } from "@/lib/achievements";
import { absoluteUrl } from "@/lib/site-url";
import { Starfield } from "@/components/portfolio/starfield";

/**
 * The load-bearing typo.
 *
 * "Achievements" is one of the most commonly misspelled words on the web, so the
 * misspelled URL stays alive and forwards to the real page — and finding it earns
 * the Spelling Bee secret, which is the joke.
 *
 * WHY NOT `throw redirect()`: scripts/prerender.mjs follows a redirect but writes
 * the response into the ORIGINAL route's directory (prerender.mjs:51). A server
 * redirect would therefore emit a byte-identical copy of the achievements page at
 * /acheivements/index.html with the wrong canonical — a duplicate-content bug that
 * only shows up in production.
 *
 * WHY NO `<meta http-equiv="refresh">` EITHER: it needs an absolute URL to be
 * reliable, and an absolute URL is wrong everywhere except the deployed origin —
 * in dev it throws you off localhost onto the production domain. It also fires
 * before the router can take over, turning a smooth client-side navigation into a
 * full page load. The effect below handles every visitor who has JS; the visible
 * link handles the rest. The page is `noindex`, so nothing is riding on it.
 *
 * The cross-canonical below points at /achievements, NOT at this URL — that is the
 * point of the alias. It is also the only canonical on the page now that the root
 * shell no longer emits a blanket one (see __root.tsx). `noindex, follow` and the
 * `sitemap: false` flag in scripts/routes.mjs both stay.
 */

const CANONICAL = absoluteUrl("achievements");

export const Route = createFileRoute("/acheivements")({
  head: () => ({
    meta: [
      { title: "Achievements — Saivenkat Jilla" },
      // Keep the misspelling out of the index; the canonical page is the real one.
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: AchievementsAlias,
});

function AchievementsAlias() {
  const navigate = useNavigate();

  useEffect(() => {
    unlock("spelling-bee");
    void navigate({ to: "/achievements", replace: true });
  }, [navigate]);

  return (
    <div className="relative grid min-h-screen w-full place-items-center bg-space font-body text-ink">
      <Starfield count={200} />

      <div className="relative px-6 text-center" style={{ zIndex: 2 }}>
        <p
          className="font-display font-semibold text-ink"
          style={{ fontSize: "clamp(20px,3vw,28px)" }}
        >
          Taking you to the trophy case…
        </p>
        <p className="text-muted-portfolio" style={{ fontSize: 14, marginTop: 8 }}>
          (You spelled it wrong. So does everyone — that&apos;s worth a badge.)
        </p>
        <Link
          to="/achievements"
          className="mt-6 inline-block rounded-full font-display font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{
            fontSize: 13.5,
            padding: "9px 20px",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
            color: "var(--portfolio-ink)",
          }}
        >
          Go now →
        </Link>
      </div>
    </div>
  );
}
