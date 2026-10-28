# Working in this repository

## Git and collaborators

- The shared baseline is the current `origin/main`, not an older conversation or source archive. Before editing, inspect `git status`, fetch `origin` when network access is available, and review upstream commits and affected files.
- Fast-forward a clean local `main` with `git merge --ff-only origin/main`. Preserve uncommitted work and existing commits; do not reset, auto-stash, force-push, or select one side of all conflicts blindly.
- Prefer a task branch for new changes. Before publishing, fetch again and incorporate any new `origin/main` commits into that branch, resolve conflicts deliberately, and rerun the relevant checks. Follow an explicitly requested branch workflow when the user provides one.
- Keep changes scoped. Do not reformat unrelated files or replace collaborators' deployment configuration with an older version.
- See `CONTRIBUTING.md` for the workflow and checkout-local Git settings. Those settings are not inherited by new clones.

## Production and persistence

- The current deployment uses `Dockerfile` and `compose.yaml` with the VPS's existing Traefik. Preserve the Compose project name, persistent volume names/mounts, proxy routing, and startup migrations unless the requested task requires changing them.
- Put machine-specific settings in ignored `.env` or `compose.override.yaml`; keep `.env.example` free of real credentials. Never commit databases, uploads, backups, or local build/test state.
- Applied `drizzle/*.sql` migrations have checksums. Add a new migration for schema changes instead of editing an applied migration.
- Never reset production data as part of a code update. Deployment is performed by the user; do not access or change the VPS or deploy just because code was committed or pushed.

## Verification

- For application changes, run checks appropriate to the affected behavior: TypeScript, storage tests, build, and the isolated integration suite as needed. See `README.md` for commands.
- For documentation or ignore-file changes, check the diff, referenced paths, and ignore behavior; a full application build is not required.
- Report which checks actually ran. Do not claim Docker/VPS/mobile testing based only on a collaborator's earlier report.
