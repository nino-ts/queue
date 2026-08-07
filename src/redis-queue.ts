/**
 * Redis queue via injected {@link QueueRedisClient} (`Bun.redis`).
 *
 * Ready jobs: LPUSH / RPOP|BRPOP. Delayed jobs: ZADD score=availableAtMs, migrated on pop.
 *
 * @packageDocumentation
 */

import {
    decodeJobPayload,
    encodeJobPayload,
    resolveJobQueueName,
    toJobPayload,
} from "./serialize";
import type { Job, JobPayload, Queue, QueueRedisClient } from "./types";

export interface RedisQueueOptions {
    client: QueueRedisClient;
    /** Default list name. */
    queue?: string;
    /** Key prefix, e.g. `ninots:`. */
    prefix?: string;
    /**
     * When &gt; 0, {@link pop} uses BRPOP with this timeout (seconds).
     * When 0, uses non-blocking RPOP.
     */
    blockTimeoutSeconds?: number;
}

/**
 * Redis connector — requires {@link QueueableJob} or {@link JobPayload}.
 */
export class RedisQueue implements Queue {
    private readonly client: QueueRedisClient;
    private readonly defaultQueue: string;
    private readonly prefix: string;
    private readonly blockTimeoutSeconds: number;

    constructor(options: RedisQueueOptions) {
        this.client = options.client;
        this.defaultQueue = options.queue ?? "default";
        this.prefix = options.prefix ?? "ninots:";
        this.blockTimeoutSeconds = options.blockTimeoutSeconds ?? 0;
    }

    public async push(job: Job | JobPayload, queueName?: string): Promise<void> {
        const name = resolveJobQueueName(job, queueName) ?? this.defaultQueue;
        const payload = toJobPayload(job);
        await this.client.lpush(this.readyKey(name), encodeJobPayload(payload));
    }

    public async later(
        delaySeconds: number,
        job: Job | JobPayload,
        queueName?: string,
    ): Promise<void> {
        const name = resolveJobQueueName(job, queueName) ?? this.defaultQueue;
        const delayMs = Math.max(0, delaySeconds) * 1000;
        const payload = toJobPayload(job);
        const encoded = encodeJobPayload(payload);

        if (delayMs === 0) {
            await this.client.lpush(this.readyKey(name), encoded);
            return;
        }

        const availableAt = Date.now() + delayMs;
        await this.client.zadd(this.delayedKey(name), availableAt, encoded);
    }

    public async pop(queueName?: string): Promise<JobPayload | null> {
        const name = queueName ?? this.defaultQueue;
        await this.migrateDue(name);

        const raw =
            this.blockTimeoutSeconds > 0
                ? await this.blockingPop(name)
                : await this.client.rpop(this.readyKey(name));

        if (raw === null) {
            return null;
        }

        return decodeJobPayload(raw);
    }

    public async size(queueName?: string): Promise<number> {
        const name = queueName ?? this.defaultQueue;
        const ready = await this.client.llen(this.readyKey(name));
        const delayed = await this.client.zcard(this.delayedKey(name));
        return ready + delayed;
    }

    private readyKey(queueName: string): string {
        return `${this.prefix}queues:${queueName}`;
    }

    private delayedKey(queueName: string): string {
        return `${this.prefix}queues:${queueName}:delayed`;
    }

    private async migrateDue(queueName: string): Promise<void> {
        const now = Date.now();
        const due = await this.client.zrangebyscore(this.delayedKey(queueName), 0, now);
        for (const member of due) {
            const removed = await this.client.zrem(this.delayedKey(queueName), member);
            if (removed > 0) {
                await this.client.lpush(this.readyKey(queueName), member);
            }
        }
    }

    private async blockingPop(queueName: string): Promise<string | null> {
        const result = await this.client.brpop(
            this.readyKey(queueName),
            this.blockTimeoutSeconds,
        );
        if (result === null) {
            return null;
        }
        return result[1] ?? null;
    }
}
