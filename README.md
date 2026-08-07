# @ninots/queue

Async job queue for Ninots — **sync** (immediate) and **Redis** (`Bun.redis`) connectors, plus a worker loop for `nino queue:work`.

## Install

```bash
bun add @ninots/queue@^0.1.0
```

## API

| Export | Role |
|--------|------|
| `QueueManager` | Resolve connections by name from config |
| `SyncQueue` | Run jobs immediately (`push` / `later`) |
| `RedisQueue` | Ready list + delayed ZSET via `Bun.redis` |
| `Worker` / `runQueueWork` | `pop` → registry → `handle` (ack = removed on pop) |
| `JobRegistry` | Map job name → factory for the worker |
| `QueueableJob` | `jobName` + `toData()` for Redis serialization |
| `createDefaultRedisClient` | Thin adapter over Bun `RedisClient` |
| `Job` / `ShouldQueue` / `Queue` | Local contracts (zero `@ninots/*` deps) |

## Trusted Publishing (npm)

See **[`TRUSTED_PUBLISHER.md`](./TRUSTED_PUBLISHER.md)** for the exact CEO checklist.

| Field | Value |
|-------|--------|
| Package | `@ninots/queue` |
| GitHub | `nino-ts/queue` |
| Workflow | `publish.yml` |

- No long-lived `NPM_TOKEN` in CI (`id-token: write` OIDC only).
- **First publish:** package must exist on npm **or** Trusted Publisher must be linked first — otherwise Actions fail with `404 PUT` (see run [31227895104](https://github.com/nino-ts/queue/actions/runs/31227895104)). Prefer one-time `bun publish` (S18 pattern), then link TP, then `workflow_dispatch` (skip-if-exists = PASS).

## Version

`0.1.0` — Sprint 20: Sync + Redis + Worker.

## License

MIT
