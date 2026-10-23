# ENGAGE Company Browser

A Next.js application built for Vercel, with public company profiles and shared-password editing. No user sign-up, user accounts, email collection, or user database is required. An expiring signed cookie remembers editing access in the browser; the server stores company records and pictures only. Production can use the existing private Vercel Blob store or the optional Postgres adapter.

Working source: [David-GY/JunAssocTraining](https://github.com/David-GY/JunAssocTraining). Edit in [github.dev](https://github.dev/David-GY/JunAssocTraining), clone locally, or use GitHub Codespaces. Changes belong in `codex/` branches and pull requests.

## Local development

Use Node.js 22.18+ or 24+.

```sh
npm ci
```

Copy `.env.example` to `.env.local`. Set `EDITOR_PASSWORD` (at least 8 characters) and `EDITOR_SESSION_SECRET` (at least 32 random characters). Generate a secret with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then run:

```sh
npm run dev
```

Open http://127.0.0.1:5173. Leave `DATABASE_URL` blank for local-only development data in ignored `.local-data/profiles.json`. This fallback is disabled in production and on Vercel. A local preview does not edit the deployed workshop's data.

## Vercel setup

1. Import this GitHub repository into the existing Vercel project. Choose the Next.js framework and the repository root. `vercel.json` uses `npm run build`; there is no Cloudflare or Sites runtime dependency.
2. For the existing project, retain its private Vercel Blob binding `BLOB_READ_WRITE_TOKEN`. Company records remain at `engage/profiles.json`; no data migration is needed. For a separate new installation, a Neon Postgres connection in `DATABASE_URL` is also supported. Blob takes priority if both are set.
3. Set `EDITOR_PASSWORD` and `EDITOR_SESSION_SECRET` in Vercel's server environment settings. Use separate secrets and a separate database for preview deployments. None of these variables use the `NEXT_PUBLIC_` prefix.
4. Existing Blob deployments require no schema setup. Only when choosing Postgres for a new installation, run `npm run db:setup` once with its secure database URL; this creates only `engage_profiles` (`id`, `data`, `version`), with no user or session tables.
5. Deploy using the existing storage binding to retain workshop edits. If intentionally switching to a new database, export and import the records first. A GitHub push alone does not prove the existing Vercel project is connected.

Database setup is intentionally separate from the build. If production storage or editing secrets are missing, the relevant API returns an unavailable response; it never silently saves into Vercel's temporary filesystem.

The Neon adapter uses its [HTTP serverless driver](https://neon.com/docs/serverless/serverless-driver). Profile requests are capped at 1,600,000 UTF-8 bytes; profile lists stream their JSON response, following [Vercel's streaming support](https://vercel.com/docs/functions/streaming-functions).

## Preserve the current workshop's edits

This repository was recovered from the original Sites source on October 23, 2026, at commit `e6f79626200824f02e3c44d4f471f61d866350a9`. The old Cloudflare/Sites implementation remains available in Git history. It has been replaced here with native Next.js routes, shared-password editing, and Vercel-native storage.

- Existing Vercel app: https://engage-company-browser.vercel.app
- Original Sites app: https://engage-company-profiles.davyu.chatgpt.site

The original Vercel storage adapter was subsequently recovered from its deployment source: a private Blob at `engage/profiles.json`, using strong ETags for concurrent writes. The updated app reuses it and the current editing password. Before intentionally changing storage, use **Export profiles** on the existing app. Keep that backup outside Git, for example under `.local-data/`. Import it into the target Postgres database with:

```sh
npm run db:setup -- .local-data/engage-company-profiles.json
```

The importer inserts missing records only, preserves existing target records, and promotes imported version-zero records to version one. It never replaces saved workshop edits with the fictional starter profiles.

## Editing and pictures

Anyone can view company profiles. **Unlock editing** asks for the shared workshop password. Access lasts up to eight hours, using an HttpOnly, SameSite cookie that is Secure in production. **Lock editing** clears that browser's cookie. Rotating the shared password or signing secret invalidates existing tokens. Every save checks the cookie, request origin, and optimistic record version. The app does not accept Sites identity headers as authorization.

Tabs size to their words and scroll horizontally if necessary. The top Help button is removed. Editing supports a displayed profile address, profile picture, cover/hero picture, and pictures attached to individual posts. The displayed address is separate from the stable `?company=` share URL.

The five format choices are **Number only**, **LinkedIn**, **Facebook**, **Website**, and **Poster**. LinkedIn uses a company-page layout with a cover, square logo, overview, company details, contact card, and updates feed. Poster uses a paper-style sheet with a large headline, image, services, updates, and contact footer. All formats retain the same company data and uploaded pictures. Older corporate, artisan, and community styles open as Website; the old bold style opens as Poster. Existing stored records remain valid and are converted to a current format when saved.

Uploads accept JPEG, PNG, and WebP files up to 10 MB. The browser resizes pictures to at most 1200 pixels (640 for avatars) and 200,000 encoded characters each. Pictures are saved inside the company record. The combined profile budget is 1,600,000 UTF-8 bytes. Up to 30 posts can have pictures. Removing a post removes its picture; cancelling an edit retains the saved version. Older profiles work without image fields.

## Checks

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests cover legacy data, media validation and limits, text-picture association, password sessions, origin checks, request limits, local persistence, and stale updates. The existing private Blob store has also been checked with an isolated read/write/concurrency test object; live company records were left intact. The optional remote Postgres integration remains unverified.
