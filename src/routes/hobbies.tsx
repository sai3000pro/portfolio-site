import { createFileRoute } from "@tanstack/react-router";

import { HOBBY_PHOTOS } from "@/data/hobbies";
import { HobbyWall } from "@/components/portfolio/hobby-belts";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";

const TITLE = "Hobbies — Saivenkat Jilla";
const DESCRIPTION =
  "Photos from outside the terminal — courts, circuits, and everywhere in between.";

export const Route = createFileRoute("/hobbies")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Hobbies,
});

function Hobbies() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      {/* Fewer stars than the landing page — the belt loop shares the main thread. */}
      <Starfield count={380} />

      <Nav />

      {/* The wall owns the full-screen spiral intro, the belts, and its own heading overlay. */}
      <HobbyWall photos={HOBBY_PHOTOS} />

      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
}
