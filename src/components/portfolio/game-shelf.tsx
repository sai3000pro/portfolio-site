import {
  FAVOURITE,
  NEXT_UP,
  SHELF,
  coverArtHolders,
  playtimeLabel,
  spineThickness,
  type Game,
} from "@/data/gaming";
import { responsiveImageProps } from "@/lib/assets";
import { Reveal } from "./section";

/** Where the face-out book sits in the row. Three spines to its left, three to its right. */
const FEATURE_AT = 3;

/** Widest a spine is ever painted, and the face-out's fixed width. */
const SPINE_SIZES = "76px";
const FACE_OUT_W = 188;

/** Alt text that carries the credit with the image, so it travels wherever the image does. */
function coverAlt(game: Game): string {
  return game.publisher
    ? `${game.title} cover art — © ${game.publisher}`
    : `${game.title} cover art`;
}

/**
 * A shelf of games, with the favourite turned cover-forward in the middle.
 *
 * Every book is an anchor to the game's own store or site — there is nothing to expand
 * in place, so a link is the honest affordance and it costs no JavaScript. Linking each
 * cover back to its publisher's own page is also the point of the attribution: the credit
 * is not just a line of text, it is a route to the source.
 *
 * The row scrolls horizontally rather than reflowing on a narrow screen. Books cannot wrap
 * onto a second line and still be a shelf, and shrinking them until they fit turns the
 * thickness — which is the entire point, since it encodes hours — into noise. A shelf you
 * scroll along is also just what a shelf is.
 */
export function GameShelf() {
  const left = SHELF.slice(0, FEATURE_AT);
  const right = SHELF.slice(FEATURE_AT);
  const holders = coverArtHolders();

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

        {/* The notice sits with the shelf rather than in the page copy, so it travels with
            the component if the shelf is ever used anywhere else. */}
        <p
          className="text-muted-portfolio mx-auto text-center"
          style={{
            marginTop: 22,
            maxWidth: 660,
            fontSize: 12,
            lineHeight: 1.6,
            textWrap: "pretty",
            opacity: 0.8,
          }}
        >
          Cover art remains the property of its respective publishers — {holders.join(", ")} — and
          is reproduced here only to identify the games, each linking to its own store page. No
          affiliation or endorsement is implied.
        </p>
      </div>
    </Reveal>
  );
}

/**
 * One book, seen spine-on.
 *
 * The cover art is centre-cropped to the spine's width, which is what the printed spine of
 * a real game box is: a narrow slice of the same artwork. A scrim sits over it because the
 * title has to stay legible against art that was never designed to have text on it, and
 * `writing-mode: vertical-rl` sets that title to read downwards — the English-language
 * spine convention, so a shelf of these reads the way a real one does.
 *
 * With no `cover` the gradient underneath shows through on its own, which is exactly what
 * this component rendered before there was any art.
 *
 * `leaning` is for a book that is on the shelf but not yet played: it tips against its
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
          position: "relative",
          overflow: "hidden",
          width: thickness,
          height,
          borderRadius: "3px 3px 2px 2px",
          background: `linear-gradient(170deg, ${game.spine.from}, ${game.spine.to})`,
          border: "1px solid rgba(0,0,0,0.35)",
          // Two inset highlights standing in for the rolled edges of a real spine. They sit
          // on this element rather than the <img> so they paint over the artwork.
          boxShadow:
            "inset 3px 0 6px -3px rgba(255,255,255,0.55), inset -4px 0 9px -4px rgba(0,0,0,0.6)",
          transform: leaning ? "rotate(5.5deg)" : undefined,
          transformOrigin: "bottom right",
          opacity: leaning ? 0.82 : 1,
        }}
      >
        {game.cover && (
          <img
            {...responsiveImageProps(game.cover, game.coverId, SPINE_SIZES)}
            alt={coverAlt(game)}
            loading="lazy"
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        )}

        {/* Heavier than it first looks like it needs to be, on purpose. A cover centre-crop
            brings the cover's OWN printed title along with it, sideways, directly behind
            the title this spine is painting — two sets of words fighting in a 60px strip.
            Pushing the art down to a colour-and-texture layer resolves that: you still read
            it as this game's box, and only one of the two titles is legible. */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.82), rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.58) 64%, rgba(0,0,0,0.88))",
          }}
        />

        <span
          style={{
            position: "relative",
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            writingMode: "vertical-rl",
            padding: "14px 0",
            gap: 10,
            color: "#f6f9fc",
          }}
        >
          <span
            className="font-display font-semibold"
            style={{
              fontSize: 13.5,
              letterSpacing: 0.3,
              textShadow: "0 1px 3px rgba(0,0,0,0.85)",
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
              opacity: 0.92,
              textShadow: "0 1px 3px rgba(0,0,0,0.85)",
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

/**
 * The favourite, turned cover-forward the way a bookshop faces out the one it is pushing.
 *
 * The cover carries its own title, so nothing here repeats it — the overlay is only the
 * label and the hours, and the art gets the rest of the box.
 */
function FaceOut({ game }: { game: Game }) {
  const playtime = playtimeLabel(game);

  return (
    <li style={{ display: "flex", alignItems: "flex-end", marginInline: 8 }}>
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        title={playtime ? `${game.title} — ${playtime}` : game.title}
        className="game-spine block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{
          position: "relative",
          overflow: "hidden",
          width: FACE_OUT_W,
          height: 286,
          borderRadius: "4px 4px 3px 3px",
          background: `linear-gradient(165deg, ${game.spine.from}, ${game.spine.to})`,
          border: "1px solid rgba(0,0,0,0.4)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.35), 0 14px 30px -14px rgba(0,0,0,0.85), 0 0 26px -8px rgba(224,170,74,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {game.cover && (
          <img
            {...responsiveImageProps(game.cover, game.coverId, `${FACE_OUT_W}px`)}
            alt={coverAlt(game)}
            // The one book above the fold on this page, so it is not lazy.
            loading="eager"
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        )}

        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.62) 0 18%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.86))",
          }}
        />

        <span
          className="font-display uppercase"
          style={{
            position: "relative",
            fontSize: 10,
            letterSpacing: 2.4,
            opacity: 0.92,
            color: "#fdf6e6",
            padding: "18px 18px 0",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          The favourite
        </span>

        <span style={{ position: "relative", marginTop: "auto", padding: "0 18px 18px" }}>
          <span
            className="font-display font-semibold"
            style={{
              fontSize: 19,
              display: "block",
              letterSpacing: 0.2,
              color: "#ffffff",
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
            }}
          >
            {playtime}
          </span>
          <span
            style={{
              fontSize: 11.5,
              opacity: 0.9,
              letterSpacing: 0.3,
              color: "#f0f4f8",
              textShadow: "0 1px 3px rgba(0,0,0,0.85)",
            }}
          >
            on the clock
          </span>
        </span>
      </a>
    </li>
  );
}
