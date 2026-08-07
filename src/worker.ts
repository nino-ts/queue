/**
 * Worker loop — pop → resolve via {@link JobRegistry} → handle (ack = removed on pop).
 *
 * Domain worker only (no `@ninots/console` dependency). Register `nino queue:work`
 * in the app (`bootstrap/cli.ts`) via {@link runQueueWork}.
 *
 * @packageDocumentation
 */

import type { JobPayload, JobRegistry, Queue } from "./types";

export interface WorkerOptions {
    queue: Queue;
    registry: JobRegistry;
    /** Named queue list (passed to {@link Queue.pop}). */
    queueName?: string;
    /** Sleep when the queue is empty (ms). Default 1000. */
    sleepMs?: number;
    /** Process at most one job then exit (tests / one-shot). */
    once?: boolean;
    /** Max jobs to process before exiting (`undefined` = unlimited). */
    maxJobs?: number;
    /** Optional abort signal to stop the loop. */
    signal?: AbortSignal;
    /** Called when a job fails (payload already popped — not re-queued). */
    onError?: (error: unknown, payload: JobPayload) => void;
}

/**
 * Processes jobs from a {@link Queue} using a {@link JobRegistry}.
 */
export class Worker {
    private readonly queue: Queue;
    private readonly registry: JobRegistry;
    private readonly queueName: string | undefined;
    private readonly sleepMs: number;
    private readonly once: boolean;
    private readonly maxJobs: number | undefined;
    private readonly signal: AbortSignal | undefined;
    private readonly onError: ((error: unknown, payload: JobPayload) => void) | undefined;

    constructor(options: WorkerOptions) {
        this.queue = options.queue;
        this.registry = options.registry;
        this.queueName = options.queueName;
        this.sleepMs = options.sleepMs ?? 1000;
        this.once = options.once === true;
        this.maxJobs = options.maxJobs;
        this.signal = options.signal;
        this.onError = options.onError;
    }

    /**
     * Process at most one job. Returns `true` if a job was handled successfully.
     */
    public async workOnce(): Promise<boolean> {
        const payload = await this.queue.pop(this.queueName);
        if (payload === null) {
            return false;
        }

        try {
            const job = this.registry.resolve(payload.name, payload.data);
            await job.handle();
            return true;
        } catch (error) {
            this.onError?.(error, payload);
            throw error;
        }
    }

    /**
     * Run the worker loop until stopped (`once`, `maxJobs`, or `signal`).
     */
    public async run(): Promise<void> {
        let processed = 0;

        while (this.signal === undefined || !this.signal.aborted) {
            const payload = await this.queue.pop(this.queueName);

            if (payload === null) {
                if (this.once || this.signal?.aborted === true) {
                    return;
                }
                if (this.maxJobs !== undefined && processed >= this.maxJobs) {
                    return;
                }
                await sleep(this.sleepMs);
                continue;
            }

            try {
                const job = this.registry.resolve(payload.name, payload.data);
                await job.handle();
            } catch (error) {
                this.onError?.(error, payload);
            }

            processed += 1;

            if (this.once) {
                return;
            }
            if (this.maxJobs !== undefined && processed >= this.maxJobs) {
                return;
            }
        }
    }

    /**
     * Alias for {@link run} (Laravel-style naming).
     */
    public async work(signal?: AbortSignal): Promise<void> {
        if (signal !== undefined) {
            const merged = new Worker({
                queue: this.queue,
                registry: this.registry,
                queueName: this.queueName,
                sleepMs: this.sleepMs,
                once: this.once,
                maxJobs: this.maxJobs,
                signal,
                onError: this.onError,
            });
            await merged.run();
            return;
        }
        await this.run();
    }
}

/** @deprecated Prefer {@link Worker}. */
export const QueueWorker = Worker;
export type QueueWorkerOptions = WorkerOptions;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
