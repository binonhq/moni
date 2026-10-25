# Moni

A private, single-owner expense tracker built for iPhone. Next.js App Router, TypeScript, Tailwind CSS, shadcn-style Radix primitives, Lucide, Motion, Recharts, Better Auth, Drizzle, and Neon PostgreSQL. The application receives structured transactions from iOS Shortcuts; it never parses bank notifications.

## Deploy directly to Vercel — one database

Use **one Neon PostgreSQL database created through Vercel Storage / Marketplace**. That same database stores expenses, the owner account, sessions, token hashes, idempotency records, and rate limits. There is no Redis requirement, second database, separate local database, or mandatory preview branch. PGlite is used only by disposable automated tests.

### 1. Create the Vercel project

Use Node.js 22.13+ (22.x recommended) and npm. This checkout includes a project-local Node 22 runtime in `node_modules/node/bin` because the original Windows system runtime was Node 20.12.2. For normal terminal commands, install Node 22 LTS and reopen PowerShell, or invoke that project-local runtime explicitly.

From the `moni` project folder:

```powershell
npm install
npx vercel@latest login
npx vercel@latest --prod
```

Choose your Vercel account, create a project named `moni` (or another available name), use the current directory `./`, accept Next.js detection, and keep the build command `npm run build`. No GitHub repository is required for this CLI flow. When prompted about further settings, defaults are sufficient; select Node.js 22.x in Project Settings if necessary.

The first deployment works without credentials and shows a setup notice. Record the **stable Production domain** in Project → Settings → Domains, for example `https://moni-yourname.vercel.app`. Do not use the deployment-specific hashed URL for authentication or your Shortcut.

### 2. Connect the single database

In the Vercel dashboard:

1. Open the Moni project → **Storage** → **Create Database** / **Connect Store**.
2. Choose **Neon (Postgres)** from the Marketplace.
3. Create one database/project, preferably in Singapore to match the app's `sin1` function region. If Singapore is unavailable on your plan, use the nearest supported region and update `vercel.json` to match.
4. Connect its **main branch** to this Vercel project for **Production** only. Leave automatic preview database branching disabled if offered. You do not need a second branch or development database.
5. Verify the integration added `DATABASE_URL` to Production environment variables. It should be the pooled PostgreSQL URL. If the integration uses a prefixed name, add `DATABASE_URL` with that value.
6. `DATABASE_URL_UNPOOLED` is optional. If present, it is the direct connection to the **same database**, used for migrations. It is not another database.

Keep TLS enabled. A Neon URL with `sslmode=verify-full` explicitly verifies the server certificate. Do not disable certificate verification.

### 3. Set the authentication environment variables

Under Project → Settings → Environment Variables, add these for **Production**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Pooled URL supplied by the Neon integration |
| `DATABASE_URL_UNPOOLED` | Optional direct URL to the same database |
| `BETTER_AUTH_URL` | Your stable production origin, e.g. `https://moni-yourname.vercel.app`, without a trailing slash |
| `BETTER_AUTH_SECRET` | A freshly generated secret of at least 32 characters |

Generate the authentication secret in your own terminal:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Paste the result into `BETTER_AUTH_SECRET`. Do not add `NEXT_PUBLIC_` to any of these names. The ingestion token is generated separately in step 5 and is stored only as a hash in the database.

### 4. Apply migrations and create your owner account

Pull the Production environment into the git-ignored local file, then initialize that **same hosted database**:

```powershell
npx vercel@latest env pull .env.local --environment=production
npm run db:migrate
npm run setup:user
```

The account command prompts for an email and a password of at least 16 characters. The password input is masked. Signup is disabled in the deployed app; a database uniqueness constraint also prevents a second owner. Do not put `MONI_SETUP_PASSWORD` in Vercel. The optional setup variables in `.env.example` are for unattended trusted local setup only.

The `.env.local` file contains real secrets. It is excluded from Git and Vercel uploads. Do not share it. If Vercel does not allow a sensitive variable to be pulled, enter its original value into `.env.local` yourself, without changing the production value.

### 5. Deploy and connect the iPhone

```powershell
npx vercel@latest --prod
npm run token:rotate
```

Open the stable production URL and sign in with the owner credentials. The token command prints the ingestion token once in your trusted terminal. Store it in your Shortcut's `Authorization: Bearer …` header. It never appears in frontend JavaScript or a dashboard response.

Use the production endpoint:

```text
https://YOUR-PRODUCTION-DOMAIN/api/transactions
```

Follow **Settings → Set up your Shortcut**, or read [the integration guide](docs/SHORTCUTS.md).

The production domain must let the Shortcut reach `/api/transactions` without a Vercel account login. The application itself authenticates that endpoint using the Bearer token and protects the dashboard with Better Auth. If your Vercel plan applies Deployment Protection to the production domain, configure that domain for normal public network access or use Vercel's documented automation bypass; do not put an account login page in front of the Shortcut endpoint.

In iPhone Safari: **Share → Add to Home Screen → enable Open as Web App → Add**. Open the new Moni icon and sign in there. Safari and the installed web app may have separate session storage.

### Subsequent deployments

```powershell
# Only when new database migrations exist:
npm run db:migrate
# Publish the application:
npx vercel@latest --prod
```

Use the existing Vercel project and the existing Neon main database. Do not enable automatic production migrations in every preview build. If you change the canonical domain, update `BETTER_AUTH_URL`, redeploy, and update your Shortcut endpoint.

Official references: [Postgres through Vercel Marketplace](https://vercel.com/docs/postgres), [Vercel deployment CLI](https://vercel.com/docs/cli/deploy), [pulling environment variables](https://vercel.com/docs/cli/env).

## Local development

Production deployment does not require a local application server. If you choose to develop locally, the same hosted database can be used; changes will affect the same real records. Do not run fixture or destructive test scripts against it.

```powershell
# Pull credentials once, if not already present:
npx vercel@latest env pull .env.local --environment=production
```

For a local browser session, set `BETTER_AUTH_URL=http://127.0.0.1:3000` in the **local file only**, then run `npm run dev`. Restore the production URL before running owner setup against a production origin, and never upload the local override to Vercel. Use the exact same hostname in the browser. To return to production values, pull the Production environment again.

```text
npm run dev          Local development, http://127.0.0.1:3000
npm run build        Optimized production build
npm start            Run the built application locally
npm run typecheck    Strict TypeScript checking
npm test             32 isolated database-backed tests; no Neon credentials needed
npm run db:generate  Generate migrations after schema changes
npm run db:migrate   Apply committed migrations to the configured database
npm run setup:user   Create the single owner interactively
npm run token:rotate Replace the ingestion token; print the new value once
npm run token:revoke Immediately invalidate ingestion access
npm run password:reset  Reset the owner's password and invalidate all sessions
```

Webpack is selected explicitly because the Turbopack CSS worker failed on the original Windows environment. The production Webpack build passed. The lockfile pins compatible stable releases. A scoped override updates Drizzle Kit's legacy esbuild dependency; the final dependency audit reported zero vulnerabilities.

## API contract

Only ingestion accepts the Bearer token. All reads, manual edits, deletes, exports, integration management, and dashboard manual entry require an authenticated owner session. Browser mutations require an exact trusted Origin in addition to session cookies.

| Endpoint | Authentication | Behavior |
| --- | --- | --- |
| `POST /api/transactions` | Ingestion Bearer token | Create an expense |
| `GET /api/transactions` | Owner session | Keyset-paginated history |
| `PATCH /api/transactions/:id` | Owner session + Origin | Correct amount and/or timestamp |
| `DELETE /api/transactions/:id` | Owner session + Origin | Delete one expense |
| `POST /api/dashboard/transactions` | Owner session + Origin | Manual entry from the app |
| `GET /api/stats?month=2026-10` | Owner session | Vietnam-local reports |
| `GET /api/export` | Owner session | Snapshot-consistent CSV |
| `GET /api/integration` | Owner session | Token status and last use; never token material |
| `DELETE /api/integration` | Owner session + Origin | Revoke current ingestion token |

The ingestion body is strictly:

```json
{
  "amount": 1000000,
  "timestamp": "2026-10-25T20:50:00+07:00"
}
```

`amount` must be a positive JSON integer no larger than `9007199254740991`. Extra fields, fractions, numeric strings, missing timezones, and invalid dates are rejected. Timestamps support years 1900–9998. Amounts are stored as PostgreSQL `bigint`; database sums and averages use integer/BigInt arithmetic. JSON **response amounts are decimal strings** so aggregate values never lose precision. Charts alone use normalized numeric display coordinates; tooltips and exact-value tables preserve original amounts.

New creation returns `201 { data: Transaction, replayed: false }`. An optional `Idempotency-Key` header (1–128 printable non-space ASCII characters) serializes retries in a database transaction using an advisory lock. Same key + same normalized payload returns `200` and the original response. Reusing a key with different data returns `409`. No key means every request is a separate transaction, even with an identical amount and timestamp. Keys are global to this single owner and remain valid across token rotations.

Idempotency responses are retained after edits/deletions so delayed retries cannot recreate deleted expenses. A replay reports the original creation snapshot; it does not undo later corrections. The idempotency table therefore retains original transaction data. If you ever require complete data erasure, remove that record too after stopping the corresponding Shortcut retries. No automatic key expiry can silently turn an old retry into a new expense.

History accepts `limit` (1–100), `cursor`, `from` (inclusive ISO timestamp), `to` (exclusive ISO timestamp), `minAmount`, and `maxAmount`. Results sort by timestamp descending and UUID descending to keep equal timestamps deterministic. Day subtotals on paginated history explicitly cover the loaded rows.

Stats include selected-month total/count/daily totals, prior month, prior-month matched days, 12 monthly totals, highest day, largest transaction, average transaction, activity frequency, current day/week/previous week/year, and all-time totals. Weeks start Monday. All reporting boundaries use `Asia/Ho_Chi_Minh`. Average daily spending divides the month's recorded total by elapsed calendar days for this month, or all days for a past month; averages round down to whole VND. Future-dated records are accepted and count in their recorded period. The current-week comparison includes the full previous week and is labeled accordingly.

Errors use `{ "error": { "code": "…", "message": "…" } }`, with `400`, `401`, `403`, `404`, `409`, `413`, `415`, `429`, or `503`. Validation errors can include field issues. Rate limits are atomic PostgreSQL counters shared by all serverless instances; credential attempts are limited globally to 10 per five minutes for the single owner. Financial values, passwords, and connection strings are not logged by the application.

## PWA behavior

Native manifest, 192/512 icons, maskable icon, 180 Apple touch icon, and selected iPhone startup images are in `public/`. Safe areas, dynamic viewport heights, mobile navigation, system theme, and reduced-motion preferences are handled explicitly.

The service worker runs in production over HTTPS (localhost is allowed for QA). It caches the public offline shell and immutable static assets. Authenticated HTML, RSC payloads, and API responses are never stored in shared Cache Storage. Offline totals already held in memory are visibly marked as potentially stale; server mutations are disabled. Reconnecting refreshes data. Updates wait for user acceptance or for old windows to close. Bump the service worker's shell version when changing cached shell files.

Run `npm run assets` after editing the vector icon source generator. Startup imagery is provided for selected 393, 430, and 440 CSS-pixel iPhones; other devices use the OS launch experience. No unsupported splash-screen API is used.

## Verification and physical iPhone checklist

Completed: production build, TypeScript checking, 32 automated tests covering actual migrated PostgreSQL behavior through PGlite, strict payload rejection, UTC/Vietnam boundaries, month totals, integer safety, idempotency, updates/deletes, pagination, empty states, session/password handling, CSRF, and rate limiting. The preview server started successfully. Browser/mobile visual verification and physical-device installation were not completed; detailed testing was stopped at the owner's request.

After deployment, do this short physical-device check:

- Open the stable HTTPS URL in Safari and sign in.
- Add a small test expense; confirm the amount and Vietnam time. Edit and delete it using the confirmation dialog.
- Install through Share → Add to Home Screen → Open as Web App. Launch the icon and confirm standalone navigation and safe areas.
- Switch light/dark/system; open the amount form with the keyboard; confirm the Save button remains reachable.
- Turn on Airplane Mode: see an offline notice, disabled mutations, and the branded fallback on a full reload. Reconnect and confirm data refreshes.
- Run your Shortcut once, retry with the same idempotency key, and confirm only one expense appears. Remove your test expense afterward.

## Source layout

```text
src/app/(dashboard)  Authenticated Home, Transactions, Insights, Settings, guide
src/app/api          Authenticated route handlers
src/components       Responsive UI, dialogs, charts, PWA lifecycle
src/db               Drizzle schema and small shared PostgreSQL pool
src/server           Auth, security, transaction operations, reporting
src/lib              Types, money formatting, Vietnam dates, validation
scripts              Migrations, owner setup, token rotation, assets
drizzle              Committed SQL migrations and snapshots
tests                Isolated database-backed tests
public               Service worker, offline shell, icons
```
