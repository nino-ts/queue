/**
 * Job payload helpers for Redis serialization.
 *
 * @packageDocumentation
 */

import type { Job, JobPayload, QueueableJob, ShouldQueue } from "./types";

/**
 * Type guard for {@link QueueableJob}.
 */
export function isQueueableJob(job: Job | JobPayload): job is QueueableJob {
    return (
        typeof job === "object" &&
        job !== null &&
        "handle" in job &&
        typeof (job as QueueableJob).handle === "function" &&
        "jobName" in job &&
        typeof (job as QueueableJob).jobName === "string" &&
        "toData" in job &&
        typeof (job as QueueableJob).toData === "function"
    );
}

/**
 * Type guard for a raw {@link JobPayload}.
 */
export function isJobPayload(value: Job | JobPayload): value is JobPayload {
    return (
        typeof value === "object" &&
        value !== null &&
        !("handle" in value) &&
        "name" in value &&
        typeof value.name === "string" &&
        "data" in value &&
        typeof value.data === "object" &&
        value.data !== null &&
        !Array.isArray(value.data)
    );
}

/**
 * Convert a {@link QueueableJob} or {@link JobPayload} into a Redis wire payload.
 */
export function toJobPayload(job: Job | JobPayload): JobPayload {
    if (isJobPayload(job)) {
        return { name: job.name, data: { ...job.data } };
    }

    if (isQueueableJob(job)) {
        return { name: job.jobName, data: job.toData() };
    }

    throw new Error("RedisQueue requires a QueueableJob (jobName + toData) or a JobPayload { name, data }");
}

/**
 * Resolve optional `$queue` from a {@link ShouldQueue} marker.
 */
export function resolveJobQueueName(job: Job | JobPayload, fallback?: string): string | undefined {
    if (isJobPayload(job)) {
        return fallback;
    }
    const marker = job as Job & ShouldQueue;
    if (typeof marker.$queue === "string" && marker.$queue.length > 0) {
        return marker.$queue;
    }
    return fallback;
}

/**
 * Encode payload as JSON for Redis list members.
 */
export function encodeJobPayload(payload: JobPayload): string {
    return JSON.stringify(payload);
}

/**
 * Decode a Redis list member into a {@link JobPayload}.
 */
export function decodeJobPayload(raw: string): JobPayload {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("name" in parsed) || !("data" in parsed)) {
        throw new Error("Invalid job payload on Redis queue");
    }

    const record = parsed as { name: unknown; data: unknown };
    if (typeof record.name !== "string") {
        throw new Error("Invalid job payload name on Redis queue");
    }
    if (typeof record.data !== "object" || record.data === null || Array.isArray(record.data)) {
        throw new Error("Invalid job payload data on Redis queue");
    }

    return {
        name: record.name,
        data: record.data as Record<string, unknown>,
    };
}
