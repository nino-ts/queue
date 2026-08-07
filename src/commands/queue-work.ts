/**
 * Plain async entry for `nino queue:work` — starter wraps this in a Command.
 * Does NOT import `@ninots/console`.
 *
 * @packageDocumentation
 */

import type { JobRegistry, Queue } from "../types";
import { Worker } from "../worker";

export interface RunQueueWorkOptions {
    queue: Queue;
    registry: JobRegistry;
    queueName?: string;
    sleepMs?: number;
    /** Abort to stop the loop (SIGINT/SIGTERM from the app). */
    signal?: AbortSignal;
    onError?: (error: unknown, jobName: string) => void;
}

/**
 * Run the queue worker until aborted.
 */
export async function runQueueWork(options: RunQueueWorkOptions): Promise<void> {
    const worker = new Worker({
        queue: options.queue,
        registry: options.registry,
        queueName: options.queueName,
        sleepMs: options.sleepMs,
        signal: options.signal,
        onError: options.onError
            ? (error, payload) => {
                  options.onError?.(error, payload.name);
              }
            : undefined,
    });

    await worker.run();
}
