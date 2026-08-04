import { createFileRoute } from "@tanstack/react-router";

import { TOTAL_ACHIEVEMENTS } from "@/data/achievements";
import { TrophyCase } from "@/components/portfolio/achievement-grid";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";

const TITLE = "Achievements — Saivenkat Jilla";
const DESCRIPTION = `A trophy case of ${TOTAL_ACHIEVEMENTS} badges hidden around this site. Some tell you how to earn them. Most don't.`;

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      <Starfield count={380} />

      <Nav />

      {/* Clears the fixed nav. The grid renders fully locked before hydration,
          which is both correct for a new visitor and real indexable content. */}
      <main className="relative" style={{ zIndex: 2, paddingTop: 40 }}>
        <TrophyCase />
      </main>

      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
}
