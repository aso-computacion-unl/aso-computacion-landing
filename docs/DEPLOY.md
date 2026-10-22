# Deploying the landing

The landing is a static Astro site on **Cloudflare Pages**. It reads its content from the admin
(`aso-computacion-admin`) **at build time**, so every content change needs a new build. Nothing
in this repo runs at request time.

> None of the Cloudflare or GitHub steps below has been exercised against the real accounts yet.
> Treat the first deploy as the test, and use the [checklist](#first-deploy-checklist).

## Cloudflare Pages project

Create the project with **Workers & Pages → Create → Pages → Connect to Git** and pick this repo.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Astro (or None) |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` (empty) |

Environment variables (Settings → Environment variables, **Production**; repeat under Preview if
previews should read the admin too):

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22.23.4` or a newer 22.x. `package.json` requires `>=22.23.4`. |
| `ADMIN_CONTENT_URL` | Full URL of the admin's `GET /api/public/content`, for example `https://your-admin.vercel.app/api/public/content`. |

Package manager: the repo is **pnpm only**. Cloudflare picks pnpm because of `pnpm-lock.yaml`
(lockfile version 9). If the install step complains about the pnpm version, pin it with the
`PNPM_VERSION` variable (9 or 10). Never add a `package-lock.json` or `yarn.lock`.

## When the admin is down

The build never fails because of the admin. If `ADMIN_CONTENT_URL` is unset or invalid, the admin
times out (10 s), answers with something other than 200, or returns a payload that does not pass
validation, the build logs **one** warning:

```text
[admin-content] Using src/data/fallback.json: <reason>
```

and uses the committed `src/data/fallback.json`. The site deploys with the last snapshot of the
real content (plus the demo placeholders, which only show on this path). Look for that line in
the Cloudflare build log to know a deploy used the fallback. Once the admin is back, the next
build (hook or daily) restores the live content. Details: the README section "Content from the
admin".

## How a build gets triggered

Two triggers, one purpose each:

1. **Admin deploy hook (primary).** After every successful mutation the admin POSTs the Cloudflare
   Pages deploy hook. It debounces for about 8 s, so a build starts roughly 8–15 s after an edit
   and several quick edits collapse into one build. It is best effort: a lost or duplicated call
   never fails the edit. The hook URL lives in the **admin's** `CLOUDFLARE_DEPLOY_HOOK_URL`.
2. **Daily rebuild (safety net).** `.github/workflows/daily-rebuild.yml` POSTs the same hook every
   day at **05:15 UTC** (00:15 in Ecuador). It repairs lost hook calls and, more importantly,
   moves "today" forward: what counts as an upcoming event is fixed at build time, in Ecuador
   time (UTC-5). A rebuild before 05:00 UTC would still see the previous day, so **keep the cron
   after 05:00 UTC**. GitHub can delay scheduled runs by minutes, which only pushes it later.
   You can also run it by hand: Actions → Daily rebuild → Run workflow.

If the admin's hook variable is unset, the daily rebuild is the only trigger, so edits then show
up the next morning.

GitHub disables scheduled workflows after 60 days without repo activity. If the site stops
rebuilding daily, open the Actions tab and re-enable the workflow.

### Create the hook and add the GitHub secret

1. Cloudflare: project → Settings → Builds → **Deploy hooks** → Add deploy hook (name it
   `admin`, branch `main`). Copy the URL. The token is part of the URL: it is a secret.
2. Admin: set `CLOUDFLARE_DEPLOY_HOOK_URL` to that URL in the admin's hosting (Vercel or Render).
3. GitHub: this repo → Settings → Secrets and variables → Actions → **New repository secret**,
   name `CLOUDFLARE_DEPLOY_HOOK_URL`, value the same URL. (A second hook named `daily` lets you
   tell the two triggers apart in the Cloudflare deploy list; use its URL here.)
4. Run the workflow once with **Run workflow** and check that a build appears in Cloudflare.

The workflow fails with a clear error when the secret is missing, and it never prints the URL.
If the URL leaks, delete the hook in Cloudflare and create a new one.

## Refreshing `fallback.json`

`src/data/fallback.json` is a hand-maintained snapshot with the same shape as the admin API. Update
it when the real content changes and you want the fallback to match (for example before a long
admin outage or a handover):

1. Fetch the live payload: `curl "$ADMIN_CONTENT_URL" -o /tmp/content.json`.
2. Copy the content into `src/data/fallback.json`. Keep images pointing at bundled files in
   `src/assets/` (`/src/assets/...`), never at remote URLs, so the fallback needs no network.
   Keep `settings: null` to use the copy in `src/data/site.ts`.
3. Run `pnpm test`. It checks that the snapshot **passes the same validation as the API** and that
   every image file exists. A snapshot that fails validation would make the fallback itself fail.
4. Run `pnpm build` with no `ADMIN_CONTENT_URL` and look at the page, then commit.

Board entries keep only `name`, `role` and `photo`: no phones, ages, emails or personal
Instagram.

## First-deploy checklist

- [ ] Admin deployed and healthy: `GET <admin>/api/public/content` answers 200 with `"version": 1`.
- [ ] `pnpm build` works locally without any env (fallback path) and with `ADMIN_CONTENT_URL` set.
- [ ] Cloudflare Pages project created with the settings above (`pnpm build`, `dist`, `NODE_VERSION`).
- [ ] `ADMIN_CONTENT_URL` set in Cloudflare; the first build log has **no** `[admin-content] Using src/data/fallback.json` line.
- [ ] Landing origin added to the admin's `PUBLIC_CORS_ORIGINS` if anything fetches it from the browser.
- [ ] Deploy hook created; its URL set as `CLOUDFLARE_DEPLOY_HOOK_URL` in the admin and as the GitHub secret.
- [ ] Edit something in the admin: a build starts 8–15 s later and the change shows on the site.
- [ ] Daily rebuild run once by hand (Actions → Daily rebuild) and a build appears in Cloudflare.
- [ ] Stop or break `ADMIN_CONTENT_URL` on purpose in a preview build: it still deploys, with the single fallback warning.
