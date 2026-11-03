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
| `PRODUCTION_BRANCH` | Optional. The branch whose builds are production builds (default `main`). Set it only if production deploys from another branch. |
| `ALLOW_CONTENT_FALLBACK` | Emergency only. `1` lets a production build ship the fallback/demo content with a warning instead of failing. Leave unset. |
| `PUBLIC_CF_BEACON_TOKEN` | Optional. Token of the site in Cloudflare Web Analytics (Analytics & Logs → Web Analytics → the site's snippet). The build then adds the cookie-free beacon; unset, it adds nothing. |

Instead of the variable you can switch on Web Analytics in the Pages project settings, which injects the beacon
automatically. Do one or the other: with both, visits are counted twice.

Package manager: the repo is **pnpm only**. Cloudflare picks pnpm because of `pnpm-lock.yaml`
(lockfile version 9). If the install step complains about the pnpm version, pin it with the
`PNPM_VERSION` variable (9 or 10). Never add a `package-lock.json` or `yarn.lock`.

## When the admin is down

A **production build refuses to ship the fallback**. Production means the branch Cloudflare is
building (`CF_PAGES_BRANCH`) equals `PRODUCTION_BRANCH` (default `main`). If on that branch
`ADMIN_CONTENT_URL` is unset or invalid, the admin times out (10 s), answers with something other
than 200, or returns a payload that does not pass validation, the build **fails** with one line:

```text
[content-gate] Production build aborted: content fell back to src/data/fallback.json (<reason>; admin host <host>); demo content (...) would be rendered. The previous deployment stays live. Fix the admin or ADMIN_CONTENT_URL and redeploy, or set ALLOW_CONTENT_FALLBACK=1 for an emergency deploy.
```

A failed build deploys nothing: Cloudflare keeps serving the last good deployment, so the site
never goes stale-with-demo-content, it just stops updating until the admin is back. The message
only prints the admin's host, never the path or query of the URL.

Runbook, when a production build fails like this:

1. Read the reason in the Cloudflare build log (`HTTP 503`, `timed out`, `rejected (...)`,
   `ADMIN_CONTENT_URL is not set`).
2. Fix the cause: bring the admin back, correct `ADMIN_CONTENT_URL`, or fix the payload the
   validation rejected.
3. Rebuild: retry the deployment in Cloudflare, use the admin's deploy hook, or wait for the daily
   rebuild. The site keeps serving the previous deployment meanwhile.
4. Only if the site must be rebuilt while the admin is down (an emergency deploy), set
   `ALLOW_CONTENT_FALLBACK=1` in the Production environment variables and retry. The build then
   ships the snapshot plus the demo placeholders and prints a loud `[content-gate] WARNING`. Remove
   the variable afterwards, or the gate stays off.

Every other build keeps the old behavior: local builds, GitHub CI (which builds with no
`ADMIN_CONTENT_URL` on purpose) and Pages preview branches use `src/data/fallback.json` and
continue, but print a multi-line warning:

```text
[content-gate] WARNING: this build does not use real admin content.
  - content fell back to src/data/fallback.json (<reason>)
  - demo content (events, pillars, faq, board) would be rendered
  - ...
  - Not a production build, so it continues. Production would fail here.
```

The join section copy is still marked `demo` in `src/data/site.ts`, pending the board's approval,
so it renders a "demo" tag on every build. It is reported as a separate note in the build log
and does not fail production yet. Once the copy is approved, drop its `demo` flag and set
`STRICT_JOIN` to `true` in `src/data/content.ts`. Once the admin is back, the next build (hook
or daily) restores the live content. Details: the "Content from the admin" section of the
[reference](REFERENCIA.md#content-from-the-admin).

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

## Preview builds

An editor can look at drafts and scheduled content on the real design before publishing, with a **preview build**
(variables and behavior: [reference](REFERENCIA.md#preview-builds)). It must never be reachable by the public.

- **Locally (simplest, nothing is deployed):** `PREVIEW_BUILD=1 PREVIEW_TOKEN=... ADMIN_PREVIEW_URL=https://<admin>/api/public/preview pnpm build && pnpm preview`.
  Mint the token in the admin at `/admin/vista-previa`.
- **A separate Cloudflare Pages project (for sharing a link):** create a second project from this repo, named
  for what it is (for example `aso-computacion-preview`), and **put it behind Cloudflare Access** (Zero Trust →
  Access → Applications, restricted to the editors' emails) before sharing the URL. Set `PREVIEW_BUILD=1`,
  `PREVIEW_TOKEN` (as an encrypted variable), `ADMIN_PREVIEW_URL` and `PUBLIC_PAGES_PROJECT` (the **public**
  project's name, for example `aso-computacion-landing`) there, never `PREVIEW_BUILD` in the public project. Its
  builds are always preview builds; the page carries the banner and `noindex`, but Access is what keeps people out.
  Retry the deployment to refresh the content. Do **not** point the admin's `CLOUDFLARE_DEPLOY_HOOK_URL` at it,
  and do not point the public project's custom domain at it.
- **Never** set `PREVIEW_BUILD` or `PREVIEW_TOKEN` in the public project. `PREVIEW_TOKEN` alone does nothing (the
  switch is `PREVIEW_BUILD`), but a leftover `PREVIEW_BUILD=1` would build the public site from drafts.

**Guard.** The build enforces that rule instead of trusting it. With `PREVIEW_BUILD` on, a Cloudflare Pages build
(`CF_PAGES=1`) **fails** before building anything when:

- `PUBLIC_PAGES_PROJECT` is unset or blank (it fails closed: without the name it cannot tell the projects apart), or
- the project it runs on is the one named by `PUBLIC_PAGES_PROJECT`, or
- `CF_PAGES_URL` does not name a `*.pages.dev` project, so the current project is unknown.

Cloudflare has no project-name build variable, so the current project is read from `CF_PAGES_URL`
(`https://<deployment-or-branch>.<project>.pages.dev`; a project name has no dots, so it is the label before
`pages.dev`). Local builds (no `CF_PAGES`) and normal builds are never affected. Because the guard compares names, set
`PUBLIC_PAGES_PROJECT` to the public project's exact name, and keep a preview project's name different from it.

The token expires (1 hour, 24 hours or 7 days, chosen when it is minted) and cannot be revoked early: the admin
rotates `PREVIEW_TOKEN_SECRET` to invalidate every token. When it expires the next preview build **fails** with
`HTTP 401` and the previous deployment of the preview project stays up: mint a new token, update `PREVIEW_TOKEN`
and retry.

### Scheduled content

The landing computes no publish window. The admin hides a scheduled (not yet open) or expired item from
`/api/public/content`, so it appears or disappears on the first build after its time. The admin's own rebuild
cron and the daily rebuild above are what trigger that build; on the Vercel Hobby plan the admin cron runs once a
day, so a scheduled item can show up to about a day late unless a rebuild is triggered by hand.

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
- [ ] `ADMIN_CONTENT_URL` set in Cloudflare; the first build log has **no** `[content-gate]` line other than the join copy note.
- [ ] Landing origin added to the admin's `PUBLIC_CORS_ORIGINS` if anything fetches it from the browser.
- [ ] Deploy hook created; its URL set as `CLOUDFLARE_DEPLOY_HOOK_URL` in the admin and as the GitHub secret.
- [ ] Edit something in the admin: a build starts 8–15 s later and the change shows on the site.
- [ ] Daily rebuild run once by hand (Actions → Daily rebuild) and a build appears in Cloudflare.
- [ ] Optional, preview: the preview project (if any) is behind Cloudflare Access, and a build with an expired token fails with `HTTP 401` instead of publishing.
- [ ] Break `ADMIN_CONTENT_URL` on purpose in a preview build: it still deploys, with the `[content-gate] WARNING`. On the production branch the same break fails the build and the previous deployment stays live.
