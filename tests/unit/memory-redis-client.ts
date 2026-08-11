/**
 * In-memory {@link QueueRedisClient} for unit tests.
 *
 * @packageDocumentation
 */

import type { QueueRedisClient } from "../../src/types";

/**
 * Minimal Redis list + zset mock.
 */
export class MemoryQueueRedisClient implements QueueRedisClient {
    private readonly lists = new Map<string, string[]>();
    private readonly zsets = new Map<string, Map<string, number>>();

    public async lpush(key: string, ...values: string[]): Promise<number> {
        const list = this.lists.get(key) ?? [];
        for (const value of [...values].reverse()) {
            list.unshift(value);
        }
        this.lists.set(key, list);
        return list.length;
    }

    public async rpop(key: string): Promise<string | null> {
        const list = this.lists.get(key);
        if (list === undefined || list.length === 0) {
            return null;
        }
        return list.pop() ?? null;
    }

    public async brpop(key: string, timeoutSeconds: number): Promise<[string, string] | null> {
        const immediate = await this.rpop(key);
        if (immediate !== null) {
            return [key, immediate];
        }
        if (timeoutSeconds <= 0) {
            return null;
        }
        await sleep(Math.min(timeoutSeconds, 0.05) * 1000);
        const afterWait = await this.rpop(key);
        return afterWait === null ? null : [key, afterWait];
    }

    public async llen(key: string): Promise<number> {
        return this.lists.get(key)?.length ?? 0;
    }

    public async zadd(key: string, score: number | string, member: string): Promise<number> {
        const set = this.zsets.get(key) ?? new Map<string, number>();
        const existed = set.has(member);
        set.set(member, Number(score));
        this.zsets.set(key, set);
        return existed ? 0 : 1;
    }

    public async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
        const set = this.zsets.get(key);
        if (set === undefined) {
            return [];
        }
        const minScore = Number(min);
        const maxScore = Number(max);
        return [...set.entries()]
            .filter(([, score]) => score >= minScore && score <= maxScore)
            .sort((a, b) => a[1] - b[1])
            .map(([member]) => member);
    }

    public async zrem(key: string, member: string, ...members: string[]): Promise<number> {
        const set = this.zsets.get(key);
        if (set === undefined) {
            return 0;
        }
        let removed = 0;
        for (const m of [member, ...members]) {
            if (set.delete(m)) {
                removed += 1;
            }
        }
        return removed;
    }

    public async zcard(key: string): Promise<number> {
        return this.zsets.get(key)?.size ?? 0;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
