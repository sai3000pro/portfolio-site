import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  FAVOURITE,
  NEXT_UP,
  SHELF,
  coverArtHolders,
  playtimeLabel,
  type Game,
} from "@/data/gaming";
import { responsiveImageProps } from "@/lib/assets";
import { Reveal } from "./section";

const TAU = Math.PI * 2;

/**
 * How far a book at the back of a turntable rises above one at the front, in px.
 *
 * This number is what makes a round display stand legible on a flat screen. Space books
 * evenly around a circle and the one opposite the front sits at the same x — directly
 * behind it, completely hidden. Lifting the far side turns the ring into a shallow bowl,
 * so the back book clears the front one's shoulder and every cover stays visible at every
 * angle. It is also just true of a real tiered stand: you see the back row over the front.
 */
const BACK_RISE = 44;

/**
 * Quarter-slot rotation applied to tiers with an even number of books.
 *
 * An odd count never puts a book at 180°, so the far ones always fall to one side or the
 * other of the front book and every cover is visible. An even count needs help, and the
 * amount of help is not obvious — horizontal position is `sin(angle)`, so it is the
 * absolute angle that decides whether two books share an x.
 *
 * For four books, measured as multiples of a slot:
 *
 *   phase 0     x/R = 0, 1, 0, -1          two books at dead centre, one hidden behind
 *   phase 0.5   x/R = .707, .707, -.707, -.707   sin(45°) = sin(135°), so they pair up
 *   phase 0.25  x/R = .383, .924, -.383, -.924   four distinct positions, evenly spread
 *
 * A quarter slot is therefore the one that works, and it is stable under rotation: turning
 * by a whole slot permutes the same four positions rather than producing new ones.
 */
const EVEN_PHASE = 0.25;

/**
 * The three steps of the stand, bottom of the file to top of the display.
 *
 * `radius` is the turntable's half-width in px; `board` is the shelf's width as a share of
 * the stand, so the steps tuck inward the way a round display table does. `height` is the
 * cover height — books on the top step are bigger because they are nearer the eye.
 *
 * Covers keep their own aspect ratio (`width: auto` against a fixed height), so the five
 * 2:3 box arts stay tall and the three square app icons stay square. Real shelves hold
 * books of different shapes; forcing one ratio would mean cropping somebody's artwork.
 */
const TIERS = [
  {
    label: "bottom shelf",
    games: [...SHELF.slice(3), NEXT_UP],
    radius: 250,
    height: 116,
    board: "100%",
  },
  { label: "middle shelf", games: SHELF.slice(0, 3), radius: 176, height: 132, board: "78%" },
  { label: "top shelf", games: [FAVOURITE], radius: 0, height: 176, board: "48%" },
];

/** Alt text that carries the credit with the image, so it travels wherever the image does. */
function coverAlt(game: Game): string {
  return game.publisher
    ? `${game.title} cover art — © ${game.publisher}`
    : `${game.title} cover art`;
}

/**
 * The games, on a tiered display stand with every cover turned face-out.
 *
 * Rendered top tier first in the DOM so reading order matches viewing order — the eye goes
 * to the favourite on the top step, then works down. The TIERS array is written bottom-up
 * because that is how a stand is built, so it is reversed here rather than stored backwards.
 *
 * Every book links to the game's own store or site. That is the honest affordance — there
 * is nothing to expand in place — and it doubles as the attribution's teeth: each credit
 * is a route back to the source, not just a line of text.
 */
export function GameShelf() {
  const holders = coverArtHolders();

  return (
    <Reveal immediate delay={0.14}>
      <div style={{ marginTop: "clamp(26px,3.5vh,42px)" }}>
        <div style={{ overflowX: "auto", overflowY: "hidden", paddingBottom: 6 }}>
          <div
            className="mx-auto"
            style={{ minWidth: 640, maxWidth: 940, paddingInline: "clamp(4px,2vw,20px)" }}
          >
            {[...TIERS].reverse().map((tier) => (
              <Tier key={tier.label} {...tier} />
            ))}
          </div>
        </div>

        {/* The notice sits with the shelf rather than in the page copy, so it travels with
            the component if the stand is ever used anywhere else. */}
        <p
          className="text-muted-portfolio mx-auto text-center"
          style={{
            marginTop: 26,
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
 * One step of the stand: a turntable of face-out books sitting on a shelf.
 *
 * Each tier spins independently, one book per press, and the offset is an unbounded integer
 * rather than one wrapped into 0..n. Wrapping is what would break the animation: stepping
 * from the last slot back to the first would be a jump from 359° to 0°, and every book
 * would take the long way round the circle to reach a place it was already standing.
 * Counting up forever makes every press the same small step in the same direction.
 *
 * The shelf under them is two stacked ellipses rather than a rectangle. A round display
 * table seen from the front is an ellipse, and the second one behind it — offset down and
 * darker — is the thickness of the board. Without that pair the books look like they are
 * floating on a painted line.
 */
function Tier({
  label,
  games,
  radius,
  height,
  board,
}: {
  label: string;
  games: Game[];
  radius: number;
  height: number;
  board: string;
}) {
  const [offset, setOffset] = useState(0);
  // A single book has nothing to rotate past, so the top step gets no controls rather than
  // a pair of buttons that visibly do nothing.
  const rotatable = games.length > 1;

  return (
    <div className="relative mx-auto" style={{ width: "100%" }}>
      <div style={{ position: "relative", height: height + BACK_RISE }}>
        {games.map((game, i) => {
          const phase = games.length % 2 === 0 ? EVEN_PHASE : 0;
          const angle = ((i + offset + phase) / games.length) * TAU;
          // 1 at the front of the turntable, -1 at the back. Every depth cue below is a
          // function of it, which is what keeps them agreeing with each other.
          const depth = Math.cos(angle);
          const near = (depth + 1) / 2;

          return (
            <div
              key={game.title}
              className="game-slot"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 0,
                zIndex: Math.round(near * 100),
                opacity: 0.5 + 0.5 * near,
                transform:
                  `translateX(calc(-50% + ${(Math.sin(angle) * radius).toFixed(2)}px)) ` +
                  `translateY(${(-(1 - near) * BACK_RISE).toFixed(2)}px) ` +
                  `scale(${(0.78 + 0.22 * near).toFixed(3)})`,
              }}
            >
              <Book game={game} height={height} />
            </div>
          );
        })}

        {rotatable && (
          <>
            <SpinButton
              direction="left"
              label={label}
              onClick={() => setOffset((o) => o - 1)}
              style={{ left: 0 }}
            />
            <SpinButton
              direction="right"
              label={label}
              onClick={() => setOffset((o) => o + 1)}
              style={{ right: 0 }}
            />
          </>
        )}
      </div>

      {/* The board. `border-radius: 50%` on a squat box gives the ellipse; the two are
          nudged together so the front arc of the top face reads as the shelf edge. */}
      <div className="relative mx-auto" style={{ width: board, marginTop: -12, marginBottom: 16 }}>
        <div
          aria-hidden="true"
          style={{
            height: 20,
            borderRadius: "50%",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            height: 18,
            marginTop: -11,
            borderRadius: "50%",
            background: "var(--portfolio-surface)",
            borderBottom: "1px solid var(--portfolio-border)",
            boxShadow: "0 12px 26px -14px rgba(0,0,0,0.8)",
          }}
        />
      </div>
    </div>
  );
}

/** One of the two arrows that spin a tier. Sits clear of the books, above every slot. */
function SpinButton({
  direction,
  label,
  onClick,
  style,
}: {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Turn the ${label} ${direction}`}
      className="game-spin text-muted-portfolio focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        // Above the nearest book, which tops out at zIndex 100.
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        width: 32,
        height: 32,
        borderRadius: "9999px",
        background: "var(--portfolio-surface-2)",
        border: "1px solid var(--portfolio-border-strong)",
        ...style,
      }}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

/**
 * A single game, cover-forward on a stand.
 *
 * Tipped back a few degrees on the X axis, which is what an easel does to a book and what
 * separates "propped up on a shelf" from "pasted onto the page". The little translucent
 * bar at the foot is the acrylic stand itself.
 *
 * A game with no `cover` falls back to its gradient, so pulling an image leaves a plain
 * coloured book rather than a hole.
 */
function Book({ game, height }: { game: Game; height: number }) {
  const playtime = playtimeLabel(game);
  const caption = playtime ?? game.status ?? "untracked";
  // The wishlist book is dimmed rather than labelled twice — the sticker already says it.
  const pending = !playtime;

  return (
    <a
      href={game.url}
      target="_blank"
      rel="noreferrer"
      title={playtime ? `${game.title} — ${playtime}` : game.title}
      className="game-book block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
      style={{ position: "relative", borderRadius: 4 }}
    >
      {game.cover ? (
        <img
          {...responsiveImageProps(game.cover, game.coverId, `${Math.round(height * 0.8)}px`)}
          alt={coverAlt(game)}
          // All eight are eager. Lazy loading is for images below a long page; this page IS
          // the stand, every cover is within a screenful or two, and the whole set is about
          // 250KB of WebP. Deferring them only produced a stand of empty easels that filled
          // in a beat later, which reads as broken rather than as fast.
          loading="eager"
          decoding="async"
          style={{
            height,
            width: "auto",
            display: "block",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.45)",
            boxShadow: "0 12px 22px -12px rgba(0,0,0,0.9)",
            opacity: pending ? 0.72 : 1,
          }}
        />
      ) : (
        <span
          aria-label={game.title}
          style={{
            display: "block",
            height,
            width: Math.round(height * 0.68),
            borderRadius: 4,
            background: `linear-gradient(165deg, ${game.spine.from}, ${game.spine.to})`,
            border: "1px solid rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* The hours, as the library sticker on the corner of the jacket. On the cover rather
          than under it because the books stand directly on the board and there is no room
          beneath them — and because a real display copy is labelled exactly this way. */}
      <span
        className="font-display"
        style={{
          position: "absolute",
          left: 5,
          bottom: 5,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: 0.3,
          padding: "2.5px 6px",
          borderRadius: 3,
          whiteSpace: "nowrap",
          color: pending ? "#1a2230" : "#101720",
          background: pending ? "rgba(228,234,240,0.86)" : "rgba(255,246,222,0.92)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}
      >
        {caption}
      </span>

      {/* The acrylic easel. Sits under the book's front edge, catching a little light. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: -5,
          transform: "translateX(-50%)",
          width: "62%",
          height: 7,
          borderRadius: "0 0 3px 3px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
          border: "1px solid rgba(255,255,255,0.14)",
          borderTop: "none",
        }}
      />
    </a>
  );
}
