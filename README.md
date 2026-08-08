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

## Version

`0.1.0` — Sprint 20: Sync + Redis + Worker.

## License

MIT
