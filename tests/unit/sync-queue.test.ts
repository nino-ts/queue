import { describe, expect, test } from "bun:test";
import { SyncQueue } from "../../src/sync-queue";
import type { Job } from "../../src/types";

class CountingJob implements Job {
    public calls = 0;

    public async handle(): Promise<void> {
        this.calls += 1;
    }
}

describe("SyncQueue", () => {
    test("push runs handle immediately", async () => {
        const queue = new SyncQueue();
        const job = new CountingJob();

        await queue.push(job);

        expect(job.calls).toBe(1);
        expect(await queue.size()).toBe(0);
        expect(await queue.pop()).toBeNull();
    });

    test("later ignores delay and runs immediately", async () => {
        const queue = new SyncQueue();
        const job = new CountingJob();

        await queue.later(60, job);

        expect(job.calls).toBe(1);
    });

    test("JobPayload push is a no-op without a registry", async () => {
        const queue = new SyncQueue();
        await queue.push({ name: "x", data: {} });
        expect(await queue.size()).toBe(0);
    });
});
