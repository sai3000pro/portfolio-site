# achievement-stats

Counts how many distinct visitors have earned each achievement, so `/achievements`
can show "4.2% of visitors found this".

**Entirely optional.** The site is built to work with zero infrastructure: when
`VITE_ACHIEVEMENTS_ENDPOINT` is unset the client makes no requests at all and the
trophy case falls back to the authored `rarityHint` on each badge, prefixed
"est.". Deploy this only if you want real numbers.

This directory is outside the Vite build and outside `tsconfig.json`'s `include`,
so it is never bundled into the site.

## Deploy

```bash
cd workers/achievement-stats
bun add -d wrangler @cloudflare/workers-types

wrangler d1 create achievement-stats     # paste the database_id into wrangler.toml
wrangler d1 execute achievement-stats --remote --file=./schema.sql
wrangler deploy
```

Then point the site at it — the value is public, not a secret:

```bash
# .env.local for dev, or a repo variable consumed by .github/workflows/deploy.yml
VITE_ACHIEVEMENTS_ENDPOINT=https://achievement-stats.<your-subdomain>.workers.dev
```

## API

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST /unlocks` | `{ visitorId: string, ids: string[] }` → `204`. Ids are validated against an allowlist; max 40 per request, 4 kB body. |
| `GET /rarity`   | `{ visitors: number, counts: Record<string, number> }`, cached at the edge for 5 minutes.                              |

## Keeping the allowlist in sync

`VALID_IDS` in `src/index.ts` must match `ACHIEVEMENT_IDS` in
`src/data/achievements.ts`. Adding an achievement without adding its id here means
its counter silently stays at zero. Renaming an existing id orphans its counter —
ids are permanent.

## On abuse

Anyone can `curl` this and inflate a counter. The mitigations are the id
allowlist, the per-request caps, and the composite primary key (which makes a
replay free but useless — inflation costs one fabricated visitor id per fake
unlock). Add a Cloudflare rate-limiting rule on the Worker route if it ever
matters.

It shouldn't. Rarity is display-only and never feeds back into unlock logic, so
the worst possible outcome is a wrong percentage on an easter-egg page.
