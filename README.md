# GPTorio

A compact, Factorio-inspired factory builder for the browser. Uses Convex for game saves and Clerk for auth.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env.local`):

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`

The `CLERK_JWT_ISSUER_DOMAIN` should be the Clerk Frontend API URL (the issuer domain for the Convex JWT template named `convex`). Run `npx convex dev` after setting it to sync auth config.

3. Start Convex (generates `convex/_generated`):

```bash
npm run convex:dev
```

4. Run Next.js:

```bash
npm run dev
```

## Controls

- Click to place the selected building.
- Right click to erase.
- Press `R` to rotate direction.
- Press `Space` to pause or resume.

## Notes

- Every signed-in user gets a single save slot (autosaves every 5 seconds).
- Mines only produce on ore tiles.
