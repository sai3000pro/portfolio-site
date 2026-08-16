/**
 * Photo manifest for the /gallery screen.
 *
 * SSR SAFETY: this module is imported by src/data/achievements.ts (which derives the
 * `gallery-crawl` target from the collection size), so it must stay free of `window` and
 * `document`. It is plain data plus string building — keep it that way.
 *
 * Two halves, deliberately kept apart:
 *
 *   ./hobbies.generated.ts   machine-derived — sizes, aspect, EXIF date/camera, accent
 *                            colour. Written by `bun run photos`; never edit by hand.
 *   PHOTO_TEXT (below)       hand-written — alt text, captions, locations, and any hobby
 *                            the filename guessed wrong. The generator only reads this.
 *
 * To add photos: drop the originals into photos/hobbies/ and run `bun run photos`. It
 * resizes, converts to WebP, reads the EXIF, and rewrites the generated half. Then write
 * alt text here for the ids it lists.
 */

import { GENERATED_PHOTOS } from "./hobbies.generated";

/**
 * Photo subjects, not pastimes. These describe what is *in* the frame, which is what a
 * viewer of a photo wall actually wants — and unlike a list of sports, it stays accurate as
 * the collection grows. The pipeline guesses a tag from the filename prefix, so naming a
 * file "water-01.jpg" tags it for free.
 *
 * The runtime list is the source of truth; HobbyTag is derived from it.
 */
export const HOBBY_TAGS = [
  "landscape",
  "water",
  "sky",
  "forest",
  "urban",
  "travel",
  "wildlife",
] as const;

export type HobbyTag = (typeof HOBBY_TAGS)[number];

function isHobbyTag(value: string): value is HobbyTag {
  return (HOBBY_TAGS as readonly string[]).includes(value);
}

export interface HobbyPhoto {
  /** Stable slug — React key, clone identity, lightbox addressing. */
  id: string;
  /** Tile-sized image, e.g. "assets/hobbies/kart-01.webp". Base-less; assetUrl() prefixes it. */
  src: string;
  /** Optional full-resolution source, loaded only when the lightbox opens. */
  full?: string;
  /** Required — this is what keeps the a11y score from rotting as photos are added. */
  alt: string;
  caption?: string;
  hobby: HobbyTag;
  /** width / height. Sizes the lightbox before load so it doesn't jump. */
  aspect?: number;
  /** EXIF-style capture location, e.g. "Waterloo, ON". Shown in the lightbox metadata row. */
  location?: string;
  /** Human-readable capture date, e.g. "Jul 2025". Not parsed — display only. */
  date?: string;
  /** Camera/lens string, e.g. "Sony A7 IV - 35mm". Shown in the lightbox metadata row. */
  gear?: string;
  /** HSL accent color matching the tile, e.g. "hsl(205 85% 62%)". Tints border/glow. */
  accent?: string;
}

/** The half a machine can't write. Keyed by photo id — the filename slug. */
type PhotoText = {
  alt: string;
  caption?: string;
  location?: string;
  /** Only needed when the filename prefix didn't name the hobby. */
  hobby?: HobbyTag;
  /** Override EXIF, which reports model codes ("ILCE-7M4") rather than names ("A7 IV"). */
  gear?: string;
  date?: string;
};

/**
 * `bun run photos` prints a ready-to-paste line for every photo missing an entry here.
 * Nothing in this object is ever overwritten by the generator.
 */
const PHOTO_TEXT: Record<string, PhotoText> = {
  // `location` is left blank throughout — these files carry no GPS EXIF and guessing at
  // places would put invented facts on the page. Fill them in as you like.
  "aerial-view-of-toronto": {
    alt: "Toronto from high above: condo towers, a wide rail corridor fanning out toward Union, and Lake Ontario meeting a hazy horizon",
    caption: "The whole city, rail corridor and all",
    hobby: "urban",
  },
  // The filename is misspelled; the id is derived from it and is now the key everything
  // else references, so it stays as-is. Only the words a visitor reads are corrected here.
  aqaurium: {
    alt: "A tall aquarium window lit deep blue, dozens of small silver fish drifting over submerged rockwork",
    caption: "Standing at the glass, letting it all drift past",
    hobby: "water",
  },
  "atmosphere-of-a-classroom": {
    alt: "A lecture hall from the back row, two chalkboards covered in linear algebra on span and basis vectors, students' heads silhouetted below",
    caption: "Span, basis, and the back row",
    hobby: "urban",
  },
  "bear-habitat": {
    alt: "A brown bear walking along a grassy rise inside a wooded enclosure, chain-link fence and summer trees behind",
    caption: "He had somewhere to be",
    hobby: "wildlife",
  },
  "before-the-game-blue-jays": {
    alt: "Rogers Centre from the upper deck before first pitch, roof open to blue sky, empty blue seats and batting practice on the field",
    caption: "Two hours early, best seats in the house",
    hobby: "urban",
  },
  "big-bus-nyc-tour": {
    alt: "From the open top deck of a night bus tour, passengers silhouetted against lit office towers on both sides of the avenue",
    caption: "Top deck, no roof, purple sky",
    hobby: "travel",
  },
  blossoms: {
    alt: "Inside a magnolia grove in full bloom, pale pink flowers filling the frame with people walking the grass beyond",
    caption: "Everyone had the same idea that weekend",
    hobby: "forest",
  },
  "blossoms-reaching-for-the-sky": {
    alt: "Magnolia branches of pale pink and white blossoms reaching up into a cloudless deep-blue sky",
    caption: "Reaching for the sky",
    hobby: "sky",
  },
  "brooklyn-bridge": {
    alt: "Looking through the Brooklyn Bridge's suspension cables to the Manhattan Bridge beyond, love locks on the railing under an overcast sky",
    caption: "Every cable in the way, and worth it",
    hobby: "urban",
  },
  "catawba-hybrid-rhodendron": {
    alt: "A catawba rhododendron in full bloom, dense clusters of ruffled pink flowers over dark green leaves",
    caption: "Pink, at maximum volume",
    hobby: "forest",
  },
  "citys-twilight": {
    alt: "Sunset over a low suburban skyline, a wide parking lot below lit by rows of orange sodium lamps",
    caption: "The suburbs get one good sky a week",
    hobby: "sky",
  },
  "cn-tower": {
    alt: "The CN Tower from street level against a blue sky streaked with high cloud, the stone cornice of an older building in the foreground",
    caption: "You stop noticing it, then you look up",
    hobby: "urban",
  },
  "cn-tower-view-of-toronto": {
    alt: "Looking straight down from the CN Tower onto the Gardiner Expressway, condo towers, the harbourfront marina and Lake Ontario",
    caption: "Straight down through the glass floor",
    hobby: "urban",
  },
  coast: {
    alt: "A lake at golden hour seen through tall pines, stacked canoes on the dock and a few people sitting out on the rocks",
    caption: "Low sun, high pines, nobody in a hurry",
    hobby: "water",
  },
  "coral-reefs": {
    alt: "A coral reef tank under violet light, clownfish and blue chromis moving between hard and soft corals",
    caption: "An entire reef, six feet of glass away",
    hobby: "water",
  },
  "dangerous-lagoon": {
    alt: "The underwater viewing tunnel at Ripley's Aquarium, a shark passing overhead while visitors ride the moving walkway",
    caption: "The tunnel where everyone stops walking",
    hobby: "water",
  },
  "dangerous-lagoon-shark": {
    alt: "A sand tiger shark gliding just beneath the surface, sunlight rippling across its back and yellow fish schooling below",
    caption: "It came back around for a second pass",
    hobby: "water",
  },
  dawn: {
    alt: "First light in pink and blue through a gap in a dark canopy, tree trunks silhouetted on both sides",
    caption: "Up earlier than I meant to be",
    hobby: "sky",
  },
  downtown: {
    alt: "A street canyon in Toronto's financial district, glass towers stepping back on both sides above a banner reading Beauty",
    caption: "Glass all the way up",
    hobby: "urban",
  },
  "downtown-core": {
    alt: "Looking up at the CN Tower from a downtown intersection, cumulus clouds scattered across a bright blue sky",
    caption: "Waiting on the light, looking up anyway",
    hobby: "urban",
  },
  "empire-state-building": {
    alt: "Looking down Ninth Avenue in daylight haze, the New Yorker hotel sign on the left and the Empire State Building small in the distance",
    caption: "It sneaks up on you from street level",
    hobby: "urban",
  },
  "field-of-tulips": {
    alt: "A dense bed of pink and orange tulips in dark soil, photographed from above in low sun",
    caption: "Rows and rows, and still not enough",
    hobby: "forest",
  },
  fish: {
    alt: "A tank of piranhas hanging in green water over submerged branches, their silver flanks catching the light",
    caption: "All facing the same way, which felt deliberate",
    hobby: "water",
  },
  "fish-aquarium-tank": {
    alt: "A cichlid tank in blues and yellows, with the silhouettes of visitors reflected back across the glass",
    caption: "Half the people in this photo are reflections",
    hobby: "water",
  },
  flight: {
    alt: "From an aeroplane window on approach, the wing over a reservoir and patchwork farmland under heavy cloud",
    caption: "Somewhere over the approach, wing down",
    hobby: "travel",
  },
  "golden-hour-estate": {
    alt: "A white house with a wooden deck at golden hour, framed between a broad chestnut and a blue spruce above an open lawn",
    caption: "The light does most of the work here",
    hobby: "landscape",
  },
  "hack-the-north": {
    alt: "A Hack the North banner stretched across a steel canopy outside a glass engineering building, bikes racked underneath",
    caption: "Arrived before the badges did",
    hobby: "urban",
  },
  horizon: {
    alt: "Green plains and patchwork farmland stretching to a distant hill, seen from a hilltop under monsoon cloud",
    caption: "Monsoon green, all the way out",
    hobby: "landscape",
  },
  "john-a-paulson-center": {
    alt: "The John A. Paulson Center's stacked glass and stone volumes seen through street trees against a clear blue sky",
    caption: "Framed by whatever was growing on the block",
    hobby: "urban",
  },
  lake: {
    alt: "A calm blue lake framed by overhanging maple leaves and pine boughs, a dense wall of conifers on the far shore",
    caption: "Found the good spot on the shoreline",
    hobby: "water",
  },
  "lake-ontario": {
    alt: "Lake Ontario from a shallow rocky shore, a low breakwater offshore and a distant skyline sitting on the horizon",
    caption: "The city, from the other end of the lake",
    hobby: "water",
  },
  "lake-view": {
    alt: "A wide river running between wooded banks under heavy grey cloud, a transmission tower far off",
    caption: "Flat water, flat light, no complaints",
    hobby: "water",
  },
  laurier: {
    alt: "A bronze statue of Wilfrid Laurier on a granite plinth in front of the Gothic stonework and green copper roofs of Parliament Hill",
    caption: "Sun straight into the lens, statue won",
    hobby: "urban",
  },
  liberty: {
    alt: "The Statue of Liberty seen from the lawn below her pedestal, torch raised into a blue sky with scattered cumulus",
    caption: "Everyone photographs her from the boat. This is from the grass",
    hobby: "travel",
  },
  "macey-avenue-modern-architecture": {
    alt: "A low modern civic building in blue metal and timber fins under a wide sky of broken cumulus, with planted beds along the street",
    caption: "Good building, better clouds",
    hobby: "urban",
  },
  "mercantile-exchange-building": {
    alt: "Cast-iron loft buildings at night, MERCANTILE EXCHANGE carved above a shopfront lit acid green from within",
    caption: "That green spills right out onto the street",
    hobby: "urban",
  },
  "new-guinea-impatien": {
    alt: "A dense mass of white impatiens flowers over dark green foliage, seen from directly above",
    caption: "White on green, nothing else in the frame",
    hobby: "forest",
  },
  "new-york-city-harbourfront": {
    alt: "The Lower Manhattan skyline across the harbour under heavy grey cloud, a promenade railing in the foreground",
    caption: "Grey day, and the skyline did not mind",
    hobby: "urban",
  },
  "new-york-city-twilight": {
    alt: "Cast-iron facades along a SoHo street at twilight, the sky gone violet above and a streetlamp flaring at right",
    caption: "The ten minutes when the sky goes purple",
    hobby: "urban",
  },
  "new-york-times": {
    alt: "Looking down from height onto the New York Times building's lettered facade, Times Square screens glowing at the top left",
    caption: "Read it from above for once",
    hobby: "urban",
  },
  "northern-catalpa": {
    alt: "A northern catalpa in flower, broad green leaves and white blossom panicles against a cloudless deep-blue sky",
    caption: "Big leaves, bigger sky",
    hobby: "sky",
  },
  "paper-roses": {
    alt: "Origami roses folded from pink, blue, yellow and orange paper, arranged on a grey metal surface with hard shadows",
    caption: "Not every flower here grew",
    hobby: "urban",
  },
  parliament: {
    alt: "A grand limestone hotel with steep copper roofs and turrets on a downtown Ottawa corner, crowds crossing in bright sun",
    caption: "Shot through a bus window and still sharp",
    hobby: "urban",
  },
  "parliament-hill": {
    alt: "The Gothic Revival West Block on Parliament Hill, its spire and dormers sharp against a deep blue sky",
    caption: "Every spire on this hill earns its keep",
    hobby: "urban",
  },
  "polar-bear": {
    alt: "A polar bear standing on concrete in front of moulded artificial rockwork in a zoo enclosure",
    caption: "He looked over exactly once",
    hobby: "wildlife",
  },
  ripleys: {
    alt: "An indoor aquarium habitat lit electric blue, a shallow pool running up to a sand shore against a painted island horizon",
    caption: "A painted sky and it still works",
    hobby: "water",
  },
  "rockefeller-center": {
    alt: "Rockefeller Center at night, the gilded Prometheus above the plaza and the rink below lit in magenta and blue",
    caption: "Gold statue, pink rink, no notes",
    hobby: "urban",
  },
  "rogers-centre": {
    alt: "The Rogers Centre from the plaza outside, its name in red on the concrete flank and crowds filing along the walkway below",
    caption: "Outside, an hour before the roof opened",
    hobby: "urban",
  },
  rover: {
    alt: "A four-wheeled robot rover on artificial turf, exposed wiring and a camera arm above its chassis, event tents blurred behind",
    caption: "The rover that talked its way to a first-place finish",
    hobby: "urban",
  },
  "solomon-r-guggenheim-museum": {
    alt: "The Guggenheim's rotunda from the ramp, white spiral balconies curving down to the ground floor with visitors along each level",
    caption: "A building you photograph by standing inside it",
    hobby: "urban",
  },
  "st-patricks-cathedral": {
    alt: "St Patrick's Cathedral floodlit at night, its Gothic spires bright against a black sky with a yellow cab passing",
    caption: "Lit up and completely unbothered by the traffic",
    hobby: "urban",
  },
  "suburban-canopy": {
    alt: "Dense green foliage and sumac seen through a rain-flecked window, a red tiled roof just visible beyond under low cloud",
    caption: "Through the glass, still raining",
    hobby: "forest",
  },
  "summerhacks-winners": {
    alt: "Six people standing together on artificial turf in front of a TechNation banner, holding a laptop and a small robot car, orange balloons overhead",
    caption: "SummerHacks, and the rover actually drove",
    hobby: "urban",
  },
  "sun-peeking-through-clouds": {
    alt: "Late sun behind a tall cumulus over campus buildings, bare branches reaching across the top of the frame",
    caption: "It found a gap and made the most of it",
    hobby: "sky",
  },
  "sunken-shipwreck-ripleys": {
    alt: "A shipwreck aquarium scene in blue light: a brass diving helmet and anchor on the pebbles, a white plumose anemone and purple sea stars among the kelp",
    caption: "Staged wreck, real anemone",
    hobby: "water",
  },
  sunset: {
    alt: "A wide pastel sky fading from blue to pink over a low retail strip and its parking lot, distant towers on the skyline",
    caption: "Nothing in the frame but sky, really",
    hobby: "sky",
  },
  "the-copper": {
    alt: "A residential tower named The Copper at night, shot through rain-flecked glass so the lit windows bloom into soft circles",
    caption: "Shot through a wet window, kept the bokeh",
    hobby: "urban",
  },
  "the-empire-state-building": {
    alt: "Looking straight up the Empire State Building's limestone setbacks at dusk, pink and orange cloud behind it",
    caption: "Caught it in the ten minutes the sky went pink",
    hobby: "urban",
  },
  "the-dock": {
    alt: "Toronto's harbourfront on a clear day, water taxis moored along the pier and a boat pulling out into the open channel",
    caption: "Waiting on the water taxi",
    hobby: "water",
  },
  "the-landmark": {
    alt: "A limestone building on a Fifth Avenue corner at night, its windows and glass crown lit a hard cyan against a black sky",
    caption: "Somebody chose that colour on purpose",
    hobby: "urban",
  },
  "the-oculus": {
    alt: "The Oculus at the World Trade Center, its white steel ribs curving overhead and throwing a ladder of shadows across the plaza",
    caption: "Late sun turns the ribs into a barcode",
    hobby: "urban",
  },
  toronto: {
    alt: "The Toronto skyline from the water, the CN Tower and the stadium dome above the shoreline and a yellow water taxi crossing the frame",
    caption: "The postcard angle, earned by ferry",
    hobby: "urban",
  },
  "toronto-from-above": {
    alt: "Toronto looking north from the CN Tower under heavy grey cloud, towers in the foreground giving way to low neighbourhoods",
    caption: "North, until the city runs out",
    hobby: "urban",
  },
  trail: {
    alt: "A rocky clearing in late summer sun, tall grass and maples closing in and a cabin roof just visible through the trees",
    caption: "The clearing before the cabin",
    hobby: "forest",
  },
  trees: {
    alt: "Two tall trees seen from below against a clear deep-blue twilight sky",
    caption: "Blue hour through the canopy",
    hobby: "sky",
  },
  troll: {
    alt: "A large troll sculpture with outsized ears and green eyes crouched beside a pond, autumn foliage behind and a rollercoaster track in the distance",
    caption: "He is not as friendly as he looks",
    hobby: "forest",
  },
  "tulip-festival": {
    alt: "Pink and purple tulips close up in bright sun, festival crowds and pale buildings thrown out of focus behind them",
    caption: "Got low and let the crowd blur out",
    hobby: "forest",
  },
  "tulips-as-far-as-the-eye-can-see": {
    alt: "A dense bed of deep crimson tulips running back to a line of spring trees under a pale sky",
    caption: "It really did keep going",
    hobby: "forest",
  },
  "turtle-habitat": {
    alt: "A turtle enclosure of bark mulch and fallen logs under a warm lamp, several turtles resting among ferns and roots",
    caption: "Four turtles, none of them in a rush",
    hobby: "wildlife",
  },
  "underwater-cavern": {
    alt: "Looking out from inside a rocky aquarium cavern into bright blue water, a sea turtle and a school of silver fish beyond",
    caption: "Shot from inside the rocks looking out",
    hobby: "water",
  },
  "underwater-habitat": {
    alt: "A dim habitat lit deep blue, exposed roots and fallen logs over moss with dark shapes resting in the hollows",
    caption: "Blue light, and something in every hollow",
    hobby: "water",
  },
  "van-cleef-arpels-flagship": {
    alt: "A jewellery flagship at night, its stone facade covered in oversized sculpted blossoms around an arched window and a wall lantern",
    caption: "The whole building put on flowers",
    hobby: "urban",
  },
  "water-from-below": {
    alt: "Looking up through a tank at the rippling underside of the water's surface, a boulder in the foreground and fish suspended in the blue",
    caption: "The surface, from the wrong side",
    hobby: "water",
  },
  wonderland: {
    alt: "A theme park's artificial mountain and fountains under low grey cloud, a bedding display in red and white spelling out a maple leaf",
    caption: "Rain held off just long enough",
    hobby: "travel",
  },
  "woodland-trail": {
    alt: "A dirt path climbing through dense summer woods, dappled light across the ground and green closing in on both sides",
    caption: "Green on all sides, path barely holding",
    hobby: "forest",
  },
};

/**
 * Merge the two halves. A photo with no text entry still renders — with weak alt text and a
 * guessed hobby — because a missing caption should never be able to break the wall.
 */
const REAL_PHOTOS: HobbyPhoto[] = GENERATED_PHOTOS.map((g) => {
  const text = PHOTO_TEXT[g.id];
  const hobby = text?.hobby ?? (isHobbyTag(g.hobby) ? g.hobby : HOBBY_TAGS[0]);
  return {
    id: g.id,
    src: g.src,
    full: g.full,
    aspect: g.aspect,
    date: text?.date ?? g.date,
    gear: text?.gear ?? g.gear,
    accent: g.accent,
    hobby,
    alt: text?.alt ?? `A ${hobby} photo`,
    caption: text?.caption,
    location: text?.location,
  };
});

const TILE_W = 640;
const TILE_H = 480;

/**
 * An SVG data URI standing in for a real photo.
 *
 * Deliberately a real <img> rather than a styled <div>: placeholders then travel the exact
 * same decode/paint path as real photos, so animation timing tuned today still holds once
 * the actual files land.
 */
function placeholderSrc(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 34%)"/><stop offset="1" stop-color="hsl(${(hue + 26) % 360} 76% 11%)"/>
</linearGradient></defs>
<rect width="${TILE_W}" height="${TILE_H}" fill="url(#g)"/>
<text x="50%" y="52%" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-size="34" font-weight="600" fill="rgba(255,255,255,0.62)" letter-spacing="2">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const HUES = [205, 265, 12, 158, 38, 320];
const TAGS: HobbyTag[] = ["landscape", "water", "sky", "forest", "urban", "travel"];

/**
 * Placeholders carry no `location`, `date` or `gear` — on purpose.
 *
 * They used to be seeded from sample EXIF arrays ("Monaco", "Sony A7 IV - 35mm") so the
 * lightbox metadata row had something to render against. But the lightbox prints those
 * values verbatim, as capture data, and the real photos have none of them: the files carry
 * no GPS EXIF and the rest was stripped on import. The result was that the only photos on
 * the wall claiming a camera and a place were the ones that never existed — exactly the
 * invented facts the note at the top of PHOTO_TEXT says not to put on the page.
 *
 * The lightbox filters the row's items and skips the whole <p> when none survive, so a
 * placeholder simply shows its caption with no metadata line beneath it.
 */
function makePlaceholders(count: number, offset = 0): HobbyPhoto[] {
  return Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    const tag = TAGS[i % TAGS.length];
    const label = `${tag} ${String(i + 1).padStart(2, "0")}`;
    const hue = HUES[i % HUES.length];
    return {
      id: `placeholder-${i}`,
      src: placeholderSrc(label, hue),
      alt: `Placeholder tile ${i + 1} — a ${tag} photo will go here`,
      hobby: tag,
      aspect: TILE_W / TILE_H,
      accent: `hsl(${hue} 85% 62%)`,
    };
  });
}

/**
 * How many tiles the gallery is topped up to while real photos are still being added.
 *
 * This used to be 24, because the conveyor belts needed enough tiles to fill a wide
 * viewport twice over or the wrap seam showed on screen. The justified grid has no seam
 * and no minimum — it is correct with one photo — so the only remaining job is to keep the
 * page from looking like an accident, i.e. a few rows deep at a desktop width. Twelve does
 * that with 7 real photos and 5 placeholders.
 *
 * NOT free to lower further without looking at src/data/achievements.ts: `gallery-crawl`
 * derives its target from this collection's size, and `completionist` requires every other
 * badge, so a collection smaller than the crawl target would make both permanently
 * unearnable by everyone. The target is derived rather than hardcoded precisely so the two
 * numbers can no longer disagree — but a target of 2 would still be a silly achievement.
 */
const MIN_TILES = 12;

/**
 * Hand-picked display order. The generator emits photos alphabetically, which is a filing
 * order, not a hanging order — this is the hanging order.
 *
 * **The row comments are load-bearing.** `.photo-grid` is pure flexbox, so no code anywhere
 * names a row: rows fall out of aspect ratios, container width and `--photo-row-h`. The
 * arithmetic that makes these groupings land as written is proved in the ROW-ONE CONTRACT
 * comment in src/styles.css. Two groupings are safe at every width, and every row below is
 * one of them:
 *
 *   L + P + P   three tiles, 963 of 1020px   (aspect sum 2.833)
 *   L + L       two tiles,   894 of 1020px   (aspect sum 2.666)
 *
 * A row of four portraits is the one combination to avoid — it clears by only 12px.
 *
 * Rows one and two are fixed by request and should not be reshuffled casually. Everything
 * after them is grouped loosely by place — New York, Toronto, the aquarium, Ottawa and the
 * tulips, then water and woods — with the portrait rows spaced out so the wall does not
 * settle into a monotonous two-up rhythm.
 *
 * Any id NOT listed here still renders; it sorts to the end in generator order. That is
 * deliberate, so dropping a new photo into photos/hobbies/ can never make it silently
 * vanish from the wall — it just lands at the bottom until it is placed.
 */
// prettier-ignore
//
// One line per rendered row — that is the entire point of this list, and prettier's
// one-element-per-line default erases it. With the grouping visible you can see at a glance
// that every row is L+P+P or L+L; flattened, the next person has to re-derive it from 75
// aspect ratios. `bun run format` would reflow this on the next commit, hence the pragma.
const PHOTO_ORDER: string[] = [
  // Row 1 — the opener, fixed by request.
  "the-empire-state-building", "summerhacks-winners", "blossoms-reaching-for-the-sky",
  // Row 2 — opens with The Copper, also by request.
  "the-copper", "rockefeller-center", "the-oculus",
  // New York.
  "brooklyn-bridge", "new-york-city-harbourfront",
  "mercantile-exchange-building", "st-patricks-cathedral", "new-york-times",
  "new-york-city-twilight", "van-cleef-arpels-flagship",
  "solomon-r-guggenheim-museum", "liberty", "big-bus-nyc-tour",
  "the-landmark", "john-a-paulson-center",
  // Toronto.
  "aerial-view-of-toronto", "empire-state-building", "cn-tower",
  "cn-tower-view-of-toronto", "toronto",
  "toronto-from-above", "downtown", "flight",
  "the-dock", "lake-ontario",
  "downtown-core", "rogers-centre",
  // Under the glass.
  "before-the-game-blue-jays", "ripleys", "dangerous-lagoon",
  "aqaurium", "coral-reefs",
  "underwater-cavern", "underwater-habitat",
  "fish", "fish-aquarium-tank",
  "sunken-shipwreck-ripleys", "dangerous-lagoon-shark", "polar-bear",
  "turtle-habitat", "bear-habitat",
  "water-from-below", "wonderland",
  // Campus, Ottawa, and the tulips.
  "hack-the-north", "atmosphere-of-a-classroom",
  "macey-avenue-modern-architecture", "laurier",
  "parliament", "rover", "troll",
  "parliament-hill", "tulip-festival",
  "field-of-tulips", "tulips-as-far-as-the-eye-can-see",
  "catawba-hybrid-rhodendron", "golden-hour-estate",
  // Sky, water, woods.
  "sun-peeking-through-clouds", "dawn",
  "citys-twilight", "blossoms", "northern-catalpa",
  "sunset", "trees",
  "coast", "lake",
  "lake-view", "horizon",
  "woodland-trail", "new-guinea-impatien", "paper-roses",
  "trail", "suburban-canopy",
];

/**
 * Apply the hanging order.
 *
 * `sort` rather than a map-and-append because it is total: an id in PHOTO_ORDER that no
 * longer exists costs nothing, and a photo absent from PHOTO_ORDER still appears. Unranked
 * photos all compare equal, and Array.prototype.sort has been required to be stable since
 * ES2019, so they keep the generator's alphabetical order among themselves rather than
 * landing in an arbitrary one.
 */
const ORDER_RANK = new Map(PHOTO_ORDER.map((id, i) => [id, i]));
const UNRANKED = Number.MAX_SAFE_INTEGER;

const ORDERED_PHOTOS: HobbyPhoto[] = [...REAL_PHOTOS].sort(
  (a, b) => (ORDER_RANK.get(a.id) ?? UNRANKED) - (ORDER_RANK.get(b.id) ?? UNRANKED),
);

export const HOBBY_PHOTOS: HobbyPhoto[] = [
  ...ORDERED_PHOTOS,
  ...(ORDERED_PHOTOS.length < MIN_TILES
    ? makePlaceholders(MIN_TILES - ORDERED_PHOTOS.length, ORDERED_PHOTOS.length)
    : []),
];
