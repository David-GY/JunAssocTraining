# ENGAGE repository guidance

- Treat `David-GY/JunAssocTraining` as the working source repository. Use `codex/` branches and pull requests. Keep a visible working preview open while making changes, as requested by the user.
- Target native Next.js on Vercel. Do not reintroduce Sites/Cloudflare dependencies or publish to the old Sites project. The original source is retained in history at `e6f79626200824f02e3c44d4f471f61d866350a9`.
- Public viewing and a shared editing password require no saved users. Never add user accounts, identity headers, or user/session tables without an explicit requirement. All writes must verify the signed editor cookie and same-origin request.
- Production requires durable Postgres via `DATABASE_URL`. `.local-data/` is for local development only and must never become a Vercel persistence fallback.
- Preserve existing production company records. Export/import current data before a storage migration; never overwrite it with fictional defaults. Do not claim a GitHub push updates Vercel without verifying the deployment connection.
- Keep credentials, environment files, runtime state, and data backups out of commits. `.env.example` contains names and empty placeholders only.
- Displayed profile addresses are separate from stable `?company=` share URLs. Keep older records compatible and enforce request/record image size limits.
- Edit posts as text-picture pairs so insertion and deletion cannot assign a picture to another post. Run `npm test`, the TypeScript check, and the production build after behavior changes. Report verification limits honestly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
