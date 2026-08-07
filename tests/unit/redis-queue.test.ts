import { describe, expect, test } from "bun:test";
import { RedisQueue } from "../../src/redis-queue";
import type { QueueableJob, ShouldQueue } from "../../src/types";
import { MemoryQueueRedisClient } from "./memory-redis-client";

class NamedJob implements QueueableJob {
    public readonly jobName = "NamedJob";
    private readonly value: number;

    constructor(value: number) {
        this.value = value;
    }

    public toData(): Record<string, unknown> {
        return { value: this.value };
    }

    public async handle(): Promise<void> {}
}

class QueuedNamedJob extends NamedJob implements ShouldQueue {
    public readonly $queue = "emails";
}

describe("RedisQueue", () => {
    test("push then pop returns payload", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "test:", queue: "default" });

        await queue.push(new NamedJob(42));
        expect(await queue.size()).toBe(1);

        const payload = await queue.pop();
        expect(payload).toEqual({ name: "NamedJob", data: { value: 42 } });
        expect(await queue.size()).toBe(0);
    });

    test("later stores delayed jobs until available", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "test:" });

        await queue.later(60, new NamedJob(1));
        expect(await queue.size()).toBe(1);
        expect(await queue.pop()).toBeNull();

        await client.zadd(
            "test:queues:default:delayed",
            Date.now() - 1,
            JSON.stringify({ name: "NamedJob", data: { value: 7 } }),
        );

        const payload = await queue.pop();
        expect(payload).toEqual({ name: "NamedJob", data: { value: 7 } });
    });

    test("accepts raw JobPayload", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "test:" });

        await queue.push({ name: "raw", data: { ok: true } });
        expect(await queue.pop()).toEqual({ name: "raw", data: { ok: true } });
    });

    test("respects ShouldQueue.$queue", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "test:", queue: "default" });

        await queue.push(new QueuedNamedJob(3));
        expect(await queue.pop("default")).toBeNull();

        const payload = await queue.pop("emails");
        expect(payload).toEqual({ name: "NamedJob", data: { value: 3 } });
    });

    test("rejects plain Job without serialization", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "test:" });

        await expect(
            queue.push({
                handle: async () => {},
            }),
        ).rejects.toThrow("RedisQueue requires a QueueableJob");
    });
});
