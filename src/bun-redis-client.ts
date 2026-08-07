/**
 * Default Redis client helper — Bun.redis / RedisClient from `"bun"`.
 *
 * No npm Redis package.
 *
 * @packageDocumentation
 */

import { RedisClient } from "bun";
import type { QueueRedisClient } from "./types";

/**
 * Wrap Bun's native Redis client for {@link RedisQueue}.
 *
 * - With `url`: `new RedisClient(url)`
 * - Without: prefer `Bun.redis` when available, else `new RedisClient()`
 */
export function createDefaultRedisClient(url?: string): QueueRedisClient {
    const client =
        url !== undefined
            ? new RedisClient(url)
            : ((Bun.redis as RedisClient | undefined) ?? new RedisClient());

    return wrapRedisClient(client);
}

/**
 * Alias for {@link createDefaultRedisClient}.
 */
export function createBunQueueRedisClient(url?: string): QueueRedisClient {
    return createDefaultRedisClient(url);
}

function wrapRedisClient(client: RedisClient): QueueRedisClient {
    return {
        lpush: async (key, ...values): Promise<number> => {
            if (values.length === 0) {
                return client.llen(key);
            }
            const [first, ...rest] = values;
            if (first === undefined) {
                return client.llen(key);
            }
            return client.lpush(key, first, ...rest);
        },
        rpop: (key) => client.rpop(key),
        brpop: (key, timeoutSeconds) => client.brpop(key, timeoutSeconds),
        llen: (key) => client.llen(key),
        zadd: (key, score, member) => client.zadd(key, String(score), member),
        zrangebyscore: (key, min, max) => client.zrangebyscore(key, min, max),
        zrem: async (key, member, ...members): Promise<number> => {
            if (members.length === 0) {
                return client.zrem(key, member);
            }
            return client.zrem(key, member, ...members);
        },
        zcard: (key) => client.zcard(key),
    };
}
