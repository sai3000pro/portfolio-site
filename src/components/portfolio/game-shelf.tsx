import { FAVOURITE, NEXT_UP, SHELF, playtimeLabel, spineThickness, type Game } from "@/data/gaming";
import { Reveal } from "./section";

/** Where the face-out book sits in the row. Three spines to its left, three to its right. */
const FEATURE_AT = 3;

/**
 * A shelf of games, with the favourite turned cover-forward in the middle.
 *
 * Every book is an anchor to the game's own store or site — there is nothing to expand
 * in place, so a link is the honest affordance and it costs no JavaScript.
 *
 * The row scrolls horizontally rather than reflowing on a narrow screen. Books cannot wrap
 * onto a second line and still be a shelf, and shrinking them until they fit turns the
 * thickness — which is the entire point, since it encodes hours — into noise. A shelf you
 * scroll along is also just what a shelf is.
 */
export function GameShelf() {
  const left = SHELF.slice(0, FEATURE_AT);
  const right = SHELF.slice(FEATURE_AT);

  return (
    <Reveal immediate delay={0.14}>
      <div style={{ marginTop: "clamp(30px,4vh,46px)" }}>
        <div
          // The scroll container, not the shelf itself: the plank below has to be as wide
          // as the books, so it lives inside and stretches with them.
          style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: 4 }}
        >
          <div style={{ minWidth: "min-content", paddingInline: "clamp(4px,2vw,28px)" }}>
            <ol
              className="flex justify-center"
              style={{ alignItems: "flex-end", gap: 5, minHeight: 300 }}
            >
              {left.map((game) => (
                <Spine key={game.title} game={game} />
              ))}
              <FaceOut game={FAVOURITE} />
              {right.map((game) => (
                <Spine key={game.title} game={game} />
              ))}
              <Spine game={NEXT_UP} leaning />
            </ol>

            {/* The plank. The lighter strip on top is the front edge catching the light,
                which is what stops the books looking like they float. */}
            <div
              aria-hidden="true"
              style={{
                height: 12,
                borderRadius: 3,
                background:
                  "linear-gradient(180deg, var(--portfolio-border-strong) 0 2px, var(--portfolio-surface-2) 2px 100%)",
                border: "1px solid var(--portfolio-border)",
                boxShadow: "0 10px 24px -12px rgba(0,0,0,0.75)",
              }}
            />
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/**
 * One book, seen spine-on.
 *
 * `writing-mode: vertical-rl` sets the title to read downwards, which is the English-language
 * spine convention — you tilt your head right to read it, the same as most of a real shelf.
 *
 * `leaning` is for a book that is on the shelf but not yet read: it tips against its
 * neighbour the way an unshelved book does, so "I have not played this" is legible from
 * the shape alone rather than needing a label to say so.
 */
function Spine({ game, leaning = false }: { game: Game; leaning?: boolean }) {
  const thickness = spineThickness(game.hours);
  const playtime = playtimeLabel(game);
  // A little variation so the tops do not form a ruler-straight line. Derived from the
  // title's length rather than random, so it is stable across server and client renders —
  // a random height here would be a hydration mismatch.
  const height = 236 + (game.title.length % 5) * 9;

  return (
    <li style={{ display: "flex", alignItems: "flex-end" }}>
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        title={playtime ? `${game.title} — ${playtime}` : game.title}
        className="game-spine block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{
          width: thickness,
          height,
          borderRadius: "3px 3px 2px 2px",
          background: `linear-gradient(170deg, ${game.spine.from}, ${game.spine.to})`,
          color: game.spine.ink,
          border: "1px solid rgba(0,0,0,0.35)",
          // Two inset highlights standing in for the rolled edges of a real spine.
          boxShadow:
            "inset 3px 0 6px -3px rgba(255,255,255,0.55), inset -4px 0 9px -4px rgba(0,0,0,0.6)",
          transform: leaning ? "rotate(5.5deg)" : undefined,
          transformOrigin: "bottom right",
          opacity: leaning ? 0.82 : 1,
        }}
      >
        <span
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            writingMode: "vertical-rl",
            padding: "14px 0",
            gap: 10,
          }}
        >
          <span
            className="font-display font-semibold"
            style={{
              fontSize: 13.5,
              letterSpacing: 0.3,
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {game.shelfTitle ?? game.title}
          </span>
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              opacity: 0.85,
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Never an em dash: rotated into vertical writing mode it reads as a
                stray tally mark rather than as "nothing here". */}
            {playtime ?? game.status ?? "untracked"}
          </span>
        </span>
      </a>
    </li>
  );
}

/** The favourite, turned cover-forward the way a bookshop faces out the one it is pushing. */
function FaceOut({ game }: { game: Game }) {
  const playtime = playtimeLabel(game);

  return (
    <li style={{ display: "flex", alignItems: "flex-end", marginInline: 8 }}>
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        className="game-spine block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{
          width: 188,
          height: 286,
          borderRadius: "4px 4px 3px 3px",
          background: `linear-gradient(165deg, ${game.spine.from}, ${game.spine.to})`,
          color: game.spine.ink,
          border: "1px solid rgba(0,0,0,0.4)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.35), 0 14px 30px -14px rgba(0,0,0,0.85), 0 0 26px -8px rgba(224,170,74,0.5)",
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span
          className="font-display uppercase"
          style={{ fontSize: 10, letterSpacing: 2.4, opacity: 0.82 }}
        >
          The favourite
        </span>

        <span
          className="font-display font-extrabold"
          style={{
            fontSize: 25,
            lineHeight: 1.12,
            marginTop: 10,
            textWrap: "balance",
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          Civilization VI
        </span>

        <span style={{ marginTop: "auto" }}>
          <span
            className="font-display font-semibold"
            style={{ fontSize: 17, display: "block", letterSpacing: 0.2 }}
          >
            {playtime}
          </span>
          <span style={{ fontSize: 11.5, opacity: 0.82, letterSpacing: 0.3 }}>on the clock</span>
        </span>
      </a>
    </li>
  );
}
