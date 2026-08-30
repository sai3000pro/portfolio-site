import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { KEYS } from "@/data/achievements";
import { FAVOURITE, RING, coverArtHolders, playtimeLabel, type Game } from "@/data/gaming";
import { trackBurst, trackMember } from "@/lib/achievements";
import { responsiveImageProps } from "@/lib/assets";
import { Reveal } from "./section";

/** Degrees between neighbouring covers on the ring. */
const STEP = 360 / RING.length;

/** How far a swipe has to travel before it counts as one turn. */
const SWIPE_PX = 48;

/**
 * How long a cover stands at the front before the stand moves on by itself.
 *
 * Long enough to read the caption under it — title, playtime and note — because a stand
 * that turns before you have finished reading is worse than one that never turns at all.
 */
const AUTO_MS = 4200;

/** Alt text that carries the credit with the image, so it travels wherever the image does. */
function coverAlt(game: Game): string {
  return game.publisher
    ? `${game.title} cover art — © ${game.publisher}`
    : `${game.title} cover art`;
}

/**
 * Shortest signed distance from a ring slot to the front, in slots.
 *
 * `index` counts up forever (see below), so `i - index` can be any integer; this folds it
 * back into -n/2..n/2 so that slot 7 of 8 is "one step anticlockwise" rather than "seven
 * steps clockwise". Every depth cue is derived from it, which is what keeps them agreeing.
 */
function slotDelta(i: number, index: number, n: number): number {
  const raw = (((i - index) % n) + n) % n;
  return raw > n / 2 ? raw - n : raw;
}

/**
 * The games, on a single spinning turntable.
 *
 * Real 3D, not a drawing of it: the stage carries a `perspective`, the ring is
 * `transform-style: preserve-3d`, and each cover is placed with `rotateY(θ) translateZ(R)`
 * — an actual circle in the page's 3D space. The browser does the projection, so the far
 * covers are smaller and the ellipse of the platter is a genuine circle seen at an angle,
 * rather than numbers picked to look like one.
 *
 * WHY NOT THREE.JS. It was the obvious suggestion and it is the wrong tool here. This is
 * eight flat images standing in a circle — there is no mesh, no lighting, no material.
 * WebGL would add roughly 600KB to a page whose entire image payload is 250KB, replace
 * prerenderable DOM with a canvas that renders nothing until JavaScript runs (this site is
 * static HTML on Pages, and the covers are real <img> tags with srcset that the browser
 * fetches without help), and put every cover behind a texture upload rather than the
 * responsive image pipeline. CSS 3D gets the same geometry, composited on the GPU, in a
 * component that still works as markup. If this ever grows real geometry — a shelf you can
 * orbit, actual lighting — that is the moment to reach for a renderer, not before.
 *
 * The whole stand is sized from two custom properties, both `clamp()`ed, so it scales from
 * a 390px phone to a desktop without a media query or a horizontal scrollbar. The previous
 * version pinned its widest tier to `min-width: 640px` inside an `overflow-x: auto` box,
 * which on a phone showed about half a shelf and asked you to drag for the rest.
 */
export function GameShelf() {
  // Unbounded on purpose. Wrapping into 0..n is what would break the animation: stepping
  // from the last slot back to the first would be a jump from 315° to 0°, and every cover
  // would take the long way round to reach a place it was already standing. Counting up
  // forever makes every press the same 45° in the same direction.
  const [index, setIndex] = useState(0);
  const dragX = useRef<number | null>(null);

  // The ref is the authority on where the ring is; `index` is that value mirrored into
  // state so React re-renders. Two copies rather than one because the auto-rotation and
  // the hand controls both need to read the current position OUTSIDE a render — and a
  // setState updater is the wrong place to do the achievement tracking a hand turn owes,
  // since React re-invokes updaters in development and would double-fire it.
  const indexRef = useRef(0);
  const advance = useCallback((by: number) => {
    indexRef.current += by;
    setIndex(indexRef.current);
  }, []);

  /**
   * A turn the visitor asked for, by arrow, key or swipe.
   *
   * Only these count towards Full Rotation. The stand turning on its own must never earn
   * it: a badge for "you looked at every game" that a page can complete while you read
   * the paragraph above it is not a badge, it is a timer.
   */
  const turn = useCallback(
    (by: number) => {
      advance(by);
      const at = indexRef.current;
      trackMember(KEYS.gamesFronted, RING[((at % RING.length) + RING.length) % RING.length].title);
      trackBurst(KEYS.gameTurns);
    },
    [advance],
  );

  // Auto-rotation, and every reason to stop it. `held` covers the two the visitor signals
  // deliberately — a pointer over the stand, or focus inside it — which is what "stops
  // when you hover" means for a keyboard as well as for a mouse.
  const reduceMotion = useReducedMotion();
  const [held, setHeld] = useState(false);
  const autoRotating = !reduceMotion && !held;

  useEffect(() => {
    if (!autoRotating) return;
    const timer = setInterval(() => {
      // A backgrounded tab must not spin the whole shelf past nobody.
      if (document.visibilityState !== "visible") return;
      // Mid-swipe, the ring belongs to the finger on it.
      if (dragX.current !== null) return;
      advance(1);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [autoRotating, advance]);

  const focused = RING[((index % RING.length) + RING.length) % RING.length];
  const holders = coverArtHolders();

  const onPointerDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    if (Math.abs(dx) < SWIPE_PX) return;
    turn(dx < 0 ? 1 : -1);
    dragX.current = e.clientX;
  };
  const endDrag = () => {
    dragX.current = null;
  };

  return (
    <Reveal immediate delay={0.14}>
      <div style={{ marginTop: "clamp(20px,3vh,34px)" }}>
        {/*
          The clip lives out here, one level above the `perspective` element. `overflow`
          on a `preserve-3d` element flattens its children back into the plane and the
          whole effect collapses, so the two can never be the same node.
        */}
        <div className="game-clip">
          <div
            className="game-stage"
            role="group"
            aria-roledescription="carousel"
            aria-label="Games, on a turntable"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            // Mouse only. A touch fires pointerenter on tap and never fires the matching
            // leave until you tap somewhere else, so honouring it would freeze the stand
            // for the rest of the visit on exactly the devices that cannot hover.
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHeld(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHeld(false);
              endDrag();
            }}
            // React's onFocus/onBlur are focusin/focusout, so they fire for the covers and
            // arrows inside too. The relatedTarget check is what stops a move from the
            // left arrow to a cover from reading as "focus left the stand".
            onFocus={() => setHeld(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                turn(-1);
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                turn(1);
              }
            }}
          >
            <div className="game-space">
              {/* A real disc lying flat in the same 3D space as the covers, so the
                  perspective draws it as an ellipse for us and the covers stand on it
                  instead of hovering above a painted line. */}
              <div className="game-platter" aria-hidden="true" />

              <div className="game-ring" style={{ transform: `rotateY(${-index * STEP}deg)` }}>
                {RING.map((game, i) => {
                  const delta = slotDelta(i, index, RING.length);
                  // 1 at the front of the ring, -1 at the back.
                  const near = Math.cos((delta * STEP * Math.PI) / 180);
                  const isFront = Math.abs(delta) < 0.5;

                  return (
                    <div
                      key={game.title}
                      className="game-seat"
                      style={{ transform: `rotateY(${i * STEP}deg) translateZ(var(--game-r))` }}
                    >
                      <Cover
                        game={game}
                        front={isFront}
                        // Perspective already shrinks the far side; this is the haze that
                        // tells you the back of a lit room is the back of a lit room.
                        style={{
                          opacity: 0.34 + 0.66 * ((near + 1) / 2),
                          filter: `brightness(${(0.62 + 0.38 * ((near + 1) / 2)).toFixed(3)})`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <SpinButton direction="left" onClick={() => turn(-1)} />
            <SpinButton direction="right" onClick={() => turn(1)} />
          </div>
        </div>

        {/* The caption is the reason the covers carry no stickers any more: at the front a
            cover is big enough to read, and everywhere else a label was just something to
            collide with. Fixed height so turning the ring never nudges the page. */}
        {/* Silent while the stand turns itself: an aria-live region that announces a new
            title every four seconds is a page a screen reader cannot be used on. It comes
            back the moment the visitor takes hold of the ring, which is also the only
            moment the announcement is answering a question they asked. */}
        <div className="game-caption" aria-live={autoRotating ? "off" : "polite"}>
          <p className="font-display text-ink game-caption-title">{focused.title}</p>
          <p className="text-muted-portfolio game-caption-meta">
            <span className="text-accent-bright">
              {playtimeLabel(focused) ?? focused.status ?? "untracked"}
            </span>
            {focused === FAVOURITE && <span> · most played</span>}
            {focused.note && <span className="game-caption-note"> — {focused.note}</span>}
          </p>
        </div>

        {/* The notice sits with the shelf rather than in the page copy, so it travels with
            the component if the turntable is ever used anywhere else. */}
        <p
          className="text-muted-portfolio mx-auto text-center"
          style={{
            marginTop: 22,
            maxWidth: 660,
            fontSize: 12,
            lineHeight: 1.6,
            textWrap: "pretty",
            opacity: 0.75,
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

/** One of the two arrows that turn the ring. Sits outside the covers, above every seat. */
function SpinButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Turn to the previous game" : "Turn to the next game"}
      className="game-spin text-muted-portfolio focus-visible:ring-accent-bright focus-visible:ring-2 focus-visible:outline-none"
      style={{ [direction]: 0 }}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

/**
 * One game, cover-forward on the turntable.
 *
 * Every cover is a link to the game's own store or site, whichever slot it is standing in.
 * That is the honest affordance — there is nothing to expand in place — and it doubles as
 * the attribution's teeth: each credit is a route back to the source, not just a line of
 * text. Keeping the back ones reachable too means the tab order is the ring's order and
 * never reshuffles as it turns.
 *
 * A game with no `cover` falls back to its gradient, so pulling an image leaves a plain
 * coloured book rather than a hole.
 */
function Cover({ game, front, style }: { game: Game; front: boolean; style: React.CSSProperties }) {
  const playtime = playtimeLabel(game);
  // The wishlist copy is dimmed rather than labelled twice — the caption already says it.
  const pending = !playtime;

  return (
    <a
      href={game.url}
      target="_blank"
      rel="noreferrer"
      title={playtime ? `${game.title} — ${playtime}` : game.title}
      tabIndex={front ? 0 : -1}
      className="game-book focus-visible:ring-accent-bright block no-underline focus-visible:ring-2 focus-visible:outline-none"
      style={style}
    >
      {game.cover ? (
        <img
          {...responsiveImageProps(game.cover, game.coverId, "168px")}
          alt={coverAlt(game)}
          // All eight are eager. Lazy loading is for images below a long page; this page IS
          // the turntable, every cover is within a screenful, and the whole set is about
          // 250KB of WebP. Deferring them only produced a ring of empty frames that filled
          // in a beat later, which reads as broken rather than as fast.
          loading="eager"
          decoding="async"
          className="game-cover"
          style={{ opacity: pending ? 0.8 : 1 }}
        />
      ) : (
        <span
          aria-label={game.title}
          className="game-cover"
          style={{
            display: "block",
            aspectRatio: "2 / 3",
            background: `linear-gradient(165deg, ${game.spine.from}, ${game.spine.to})`,
          }}
        />
      )}
    </a>
  );
}
