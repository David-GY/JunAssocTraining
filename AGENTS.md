# ENGAGE repository guidance

- Treat `David-GY/JunAssocTraining` as the working source repository. Start future work from its current branch state, not a fresh export of the old Sites project.
- The original Sites source is retained in Git history at `e6f79626200824f02e3c44d4f471f61d866350a9`. Read the recovery and hosting notes in `README.md` before changing deployment code.
- The recovered runtime uses Vinext, Cloudflare D1, and Sites authentication. The existing Vercel deployment has a separate `/api/editor` implementation that has not been recovered. Do not claim a GitHub push updates either deployed app without verifying its deployment connection.
- Keep production database records and workshop edits intact. Source recovery is not a database migration.
- Keep credentials, `.env*`, local runtime state, and access lists out of commits. Preserve the existing ignore rules.
- Use `codex/` branches for changes, review diffs, and run checks appropriate to the change. Record any runtime or verification limits honestly.
- The requested editable profile link and uploads for all picture fields remain pending after the recovery baseline. Reconcile the target runtime before publishing those changes.
