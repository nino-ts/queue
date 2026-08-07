import { describe, expect, test } from "bun:test";
import { RedisQueue } from "../../src/redis-queue";
import { JobRegistry, type QueueableJob } from "../../src/types";
import { Worker } from "../../src/worker";
import { MemoryQueueRedisClient } from "./memory-redis-client";

class WorkJob implements QueueableJob {
    public static handled: number[] = [];
    public readonly jobName = "WorkJob";
    private readonly n: number;

    constructor(n: number) {
        this.n = n;
    }

    public toData(): Record<string, unknown> {
        return { n: this.n };
    }

    public async handle(): Promise<void> {
        WorkJob.handled.push(this.n);
    }
}

class FailJob implements QueueableJob {
    public readonly jobName = "FailJob";

    public toData(): Record<string, unknown> {
        return {};
    }

    public async handle(): Promise<void> {
        throw new Error("boom");
    }
}

function registry(): JobRegistry {
    return new JobRegistry()
        .register("WorkJob", (data) => new WorkJob(Number(data["n"])))
        .register("FailJob", () => new FailJob());
}

describe("Worker", () => {
    test("processes one job with once:true", async () => {
        WorkJob.handled = [];
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "w:" });
        await queue.push(new WorkJob(1));

        const worker = new Worker({
            queue,
            registry: registry(),
            once: true,
            sleepMs: 1,
        });

        await worker.run();
        expect(WorkJob.handled).toEqual([1]);
        expect(await queue.size()).toBe(0);
    });

    test("reports onError when handle fails", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "w:" });
        await queue.push(new FailJob());

        const errors: string[] = [];
        const worker = new Worker({
            queue,
            registry: registry(),
            once: true,
            sleepMs: 1,
            onError: (error, payload) => {
                errors.push(
                    `${payload.name}:${error instanceof Error ? error.message : "unknown"}`,
                );
            },
        });

        await worker.run();
        expect(errors).toEqual(["FailJob:boom"]);
        expect(await queue.size()).toBe(0);
    });

    test("stops after maxJobs", async () => {
        WorkJob.handled = [];
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "w:" });
        await queue.push(new WorkJob(1));
        await queue.push(new WorkJob(2));
        await queue.push(new WorkJob(3));

        const worker = new Worker({
            queue,
            registry: registry(),
            maxJobs: 2,
            sleepMs: 1,
        });

        await worker.run();
        expect(WorkJob.handled).toEqual([1, 2]);
        expect(await queue.size()).toBe(1);
    });

    test("workOnce returns false when empty", async () => {
        const client = new MemoryQueueRedisClient();
        const queue = new RedisQueue({ client, prefix: "w:" });
        const worker = new Worker({ queue, registry: registry() });
        expect(await worker.workOnce()).toBe(false);
    });
});
