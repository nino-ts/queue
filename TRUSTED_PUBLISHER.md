# Trusted Publisher checklist — `@ninots/queue`

OIDC only — **do not** add long-lived `NPM_TOKEN` / `NPM_CONFIG_TOKEN` secrets to this repo’s Actions.

**Registry policy (Sprint 19+):** npm only. Do **not** create JSR / `publish-jsr` / `jsr.json`.

## Blocker (Sprint 20)

First OIDC publish **FAILED** with misleading `404 PUT @ninots/queue`:

- Run: https://github.com/nino-ts/queue/actions/runs/31227895104
- Provenance/OIDC handshake ran (sigstore notice in logs), then registry rejected the package PUT.
- Cause: **Trusted Publisher not linked** for `@ninots/queue` (and/or package does not exist yet on npm). Same pattern as S18 `social-auth` first publish.

**Agent auth:** no `npm login` / org token available in hub — **CEO must** complete the manual steps below, then re-run `workflow_dispatch`.

## Exact Trusted Publisher config (copy/paste)

After the npm package exists (see CEO steps), open package settings → **Trusted Publisher** → **GitHub Actions**:

| Field | Value |
|-------|--------|
| Package | `@ninots/queue` |
| Organization / user | `nino-ts` |
| Repository | `queue` (full: `nino-ts/queue`) |
| Workflow filename | `publish.yml` (**filename only**, under `.github/workflows/`) |
| Environment | *(leave empty)* |
| Allowed actions | `npm publish` (and provenance as offered) |

Confirm workflow already has:

- `permissions.id-token: write`
- Job `publish-npm` with `npm publish --access public --provenance`
- Skip-if-exists when `npm view @ninots/queue@0.1.0` succeeds

## CEO — manual steps (required once)

Chicken-and-egg: Trusted Publisher UI lives on an **existing** npm package. First version of a brand-new name often cannot land via OIDC alone.

### Path A (preferred — matches S18 social-auth)

1. On a machine logged into npm as an `@ninots` org member with publish rights:
   ```bash
   cd packages/queue   # or clone nino-ts/queue @ tag v0.1.0
   bun publish --access public
   # or: npm publish --access public
   ```
2. Confirm: `https://registry.npmjs.org/@ninots/queue/0.1.0` returns `"version":"0.1.0"`.
3. On [npmjs.com/@ninots/queue](https://www.npmjs.com/package/@ninots/queue) → **Settings** → **Trusted Publisher** → add GitHub Actions with the table above.
4. GitHub → `nino-ts/queue` → **Actions** → **Publish package on registry** → **Run workflow** (`workflow_dispatch`).
5. Expect **skip-if-exists** PASS: `npm already has @ninots/queue@0.1.0 — skipping publish`.

### Path B (if npm UI allows creating empty package / TP before first version)

1. Create `@ninots/queue` under org `@ninots` on npmjs.com (if available).
2. Add Trusted Publisher with the table above **before** any version exists.
3. Re-run `workflow_dispatch` so OIDC publishes `0.1.0` with provenance.

**Do not** store long-lived tokens in GitHub Actions secrets.

## Verify

```bash
# Package present
curl -s https://registry.npmjs.org/@ninots/queue/0.1.0 | head

# Or
bunx npm view @ninots/queue version
# → 0.1.0
```

- [ ] `@ninots/queue@0.1.0` on npm (`latest`)
- [ ] Trusted Publisher linked: `nino-ts/queue` + `publish.yml`
- [ ] `workflow_dispatch` green (publish or skip-if-exists)

## Notes

- Tag `v0.1.0` / `main` already contain the package source (PR #3 merged).
- Re-running publish **before** TP/package exists will fail again with the same `404 PUT`.
- After `0.1.0` is on npm + TP linked, subsequent SemVer bumps publish via OIDC only.
