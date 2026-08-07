import { describe, expect, test } from "bun:test";
import {
    isJobPayload,
    isQueueableJob,
    resolveJobQueueName,
    toJobPayload,
} from "../../src/serialize";
import type { Job, QueueableJob, ShouldQueue } from "../../src/types";

class PlainJob implements Job {
    public async handle(): Promise<void> {}
}

class NamedJob implements QueueableJob {
    public readonly jobName = "custom.job";
    public toData(): Record<string, unknown> {
        return { ok: true };
    }
    public async handle(): Promise<void> {}
}

class MarkedJob extends NamedJob implements ShouldQueue {
    public readonly $queue = "high";
}

describe("serialize helpers", () => {
    test("isQueueableJob / toJobPayload", () => {
        expect(isQueueableJob(new PlainJob())).toBe(false);
        expect(isQueueableJob(new NamedJob())).toBe(true);
        expect(toJobPayload(new NamedJob())).toEqual({
            name: "custom.job",
            data: { ok: true },
        });
        expect(toJobPayload({ name: "raw", data: { a: 1 } })).toEqual({
            name: "raw",
            data: { a: 1 },
        });
    });

    test("isJobPayload", () => {
        expect(isJobPayload({ name: "x", data: {} })).toBe(true);
        expect(isJobPayload(new NamedJob())).toBe(false);
    });

    test("resolveJobQueueName reads ShouldQueue.$queue", () => {
        expect(resolveJobQueueName(new MarkedJob(), "default")).toBe("high");
        expect(resolveJobQueueName(new NamedJob(), "default")).toBe("default");
    });

    test("toJobPayload rejects plain Job", () => {
        expect(() => toJobPayload(new PlainJob())).toThrow("RedisQueue requires a QueueableJob");
    });
});
