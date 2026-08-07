/**
 * @ninots/queue — sync + Redis job queue and worker.
 *
 * @packageDocumentation
 */

export {
    createBunQueueRedisClient,
    createDefaultRedisClient,
} from "./src/bun-redis-client";
export { runQueueWork } from "./src/commands/queue-work";
export type { RunQueueWorkOptions } from "./src/commands/queue-work";
export { QueueManager } from "./src/queue-manager";
export { RedisQueue } from "./src/redis-queue";
export type { RedisQueueOptions } from "./src/redis-queue";
export {
    decodeJobPayload,
    encodeJobPayload,
    isJobPayload,
    isQueueableJob,
    resolveJobQueueName,
    toJobPayload,
} from "./src/serialize";
export { SyncQueue } from "./src/sync-queue";
export { JobRegistry } from "./src/types";
export type {
    Job,
    JobFactory,
    JobPayload,
    Queue,
    QueueableJob,
    QueueConnectionConfig,
    QueueDriver,
    QueueManagerConfig,
    QueueRedisClient,
    ShouldQueue,
} from "./src/types";
export { QueueWorker, Worker } from "./src/worker";
export type { QueueWorkerOptions, WorkerOptions } from "./src/worker";
