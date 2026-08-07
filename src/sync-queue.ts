/**
 * Synchronous queue — executes jobs immediately (Laravel SyncQueue parity).
 *
 * @packageDocumentation
 */

import type { Job, JobPayload, Queue } from "./types";
import { isJobPayload } from "./serialize";

/**
 * Sync connector: `push` / `later` run {@link Job.handle} now; `pop` is always empty.
 * Accepts any {@link Job} (serialization not required). {@link JobPayload} is a no-op
 * (nothing to execute without a registry — use Redis + worker for that path).
 */
export class SyncQueue implements Queue {
    public async push(job: Job | JobPayload, _queueName?: string): Promise<void> {
        void _queueName;
        if (isJobPayload(job)) {
            return;
        }
        await job.handle();
    }

    public async later(
        delaySeconds: number,
        job: Job | JobPayload,
        queueName?: string,
    ): Promise<void> {
        void delaySeconds;
        await this.push(job, queueName);
    }

    public async pop(_queueName?: string): Promise<JobPayload | null> {
        void _queueName;
        return null;
    }

    public async size(_queueName?: string): Promise<number> {
        void _queueName;
        return 0;
    }
}
