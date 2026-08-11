import { describe, expect, test } from "bun:test";
import { QueueManager } from "../../src/queue-manager";
import { RedisQueue } from "../../src/redis-queue";
import { SyncQueue } from "../../src/sync-queue";
import type { QueueableJob } from "../../src/types";
import { MemoryQueueRedisClient } from "./memory-redis-client";

class FlagJob implements QueueableJob {
    public static ran = false;
    public readonly jobName = "FlagJob";

    public toData(): Record<string, unknown> {
        return {};
    }

    public async handle(): Promise<void> {
        FlagJob.ran = true;
    }
}

describe("QueueManager", () => {
    test("resolves sync connection and pushes immediately", async () => {
        FlagJob.ran = false;
        const manager = new QueueManager({
            default: "sync",
            connections: {
                sync: { driver: "sync" },
            },
        });

        expect(manager.getDefaultConnection()).toBe("sync");
        expect(manager.connection()).toBeInstanceOf(SyncQueue);

        await manager.push(new FlagJob());
        expect(FlagJob.ran).toBe(true);
    });

    test("resolves redis connection", async () => {
        const client = new MemoryQueueRedisClient();
        const manager = new QueueManager({
            default: "redis",
            connections: {
                sync: { driver: "sync" },
                redis: { driver: "redis", client, prefix: "mgr:" },
            },
        });

        expect(manager.connection("redis")).toBeInstanceOf(RedisQueue);
        await manager.push(new FlagJob(), "redis");
        expect(await manager.connection("redis").size()).toBe(1);
    });

    test("throws for unknown connection", () => {
        const manager = new QueueManager({
            default: "sync",
            connections: { sync: { driver: "sync" } },
        });

        expect(() => manager.connection("missing")).toThrow("Queue connection [missing] is not configured");
    });
});
