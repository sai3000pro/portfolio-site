# Convex achievement aggregates

This folder contains the optional backend for the site's achievement rarity counts.
The browser keeps each visitor's unlock state in `localStorage`; Convex stores only
anonymous aggregate rows.

## Deploy

From the repository root, authenticate and start the Convex development deployment:

```bash
bunx convex dev
```

The first run creates or links the Convex project and generates `convex/_generated/`. If
Convex created a local deployment instead of linking the cloud project, rerun with:

```bash
bunx convex dev --configure existing
```

Choose the project associated with `good-basilisk-156.convex.cloud`. After the functions
are working, deploy the production functions with:

```bash
bunx convex deploy
```

The public HTTP Actions URL is configured in the site as:

```env
VITE_ACHIEVEMENTS_ENDPOINT=https://<deployment-name>.convex.site
```

The `.convex.cloud` URL is not used by this integration because the existing site
already talks to its optional stats service over HTTP. No GitHub repository access is
required.

## API

- `POST /unlocks` accepts `{ visitorId, ids }` and ignores duplicate visitor/achievement pairs.
- `GET /rarity` returns `{ visitors, counts }` for the trophy case.

The visitor ID is random and contains no personal information. Resetting the visitor's
local achievement progress does not delete Convex rows or create a new visitor identity.
