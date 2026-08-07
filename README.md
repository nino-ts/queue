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

1. On [npmjs.com](https://www.npmjs.com): package `@ninots/queue` → **Trusted Publisher** → GitHub Actions  
   - Org/user: `nino-ts`  
   - Repo: `queue`  
   - Workflow: `publish.yml`  
2. No long-lived `NPM_TOKEN` / `NPM_CONFIG_TOKEN` in CI.  
3. First publish: create a GitHub Release **or** run `workflow_dispatch` after the publisher is linked.  
4. Workflow skips if `@ninots/queue@0.1.0` already exists on npm.

## Version

`0.1.0` — Sprint 20: Sync + Redis + Worker.

## License

MIT
