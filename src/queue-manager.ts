/**
 * Queue manager — resolve named connections (sync | redis).
 *
 * @packageDocumentation
 */

import { RedisQueue } from "./redis-queue";
import { SyncQueue } from "./sync-queue";
import type { Job, JobPayload, Queue, QueueConnectionConfig, QueueManagerConfig } from "./types";

/**
 * Resolves queue connections from config and dispatches jobs.
 */
export class QueueManager {
    private readonly defaultConnection: string;
    private readonly configs: Record<string, QueueConnectionConfig>;
    private readonly resolved = new Map<string, Queue>();

    constructor(config: QueueManagerConfig) {
        this.defaultConnection = config.default;
        this.configs = config.connections;
    }

    /**
     * Default connection name.
     */
    public getDefaultConnection(): string {
        return this.defaultConnection;
    }

    /**
     * Resolve (and cache) a named queue connection.
     */
    public connection(name?: string): Queue {
        const connectionName = name ?? this.defaultConnection;
        const cached = this.resolved.get(connectionName);
        if (cached !== undefined) {
            return cached;
        }

        const config = this.configs[connectionName];
        if (config === undefined) {
            throw new Error(`Queue connection [${connectionName}] is not configured`);
        }

        const queue = this.createQueue(config);
        this.resolved.set(connectionName, queue);
        return queue;
    }

    /**
     * Push a job on the given (or default) connection.
     */
    public async push(job: Job | JobPayload, connectionName?: string): Promise<void> {
        await this.connection(connectionName).push(job);
    }

    /**
     * Delay a job on the given (or default) connection.
     */
    public async later(delaySeconds: number, job: Job | JobPayload, connectionName?: string): Promise<void> {
        await this.connection(connectionName).later(delaySeconds, job);
    }

    private createQueue(config: QueueConnectionConfig): Queue {
        switch (config.driver) {
            case "sync":
                return new SyncQueue();
            case "redis":
                return new RedisQueue({
                    client: config.client,
                    queue: config.queue,
                    prefix: config.prefix,
                    blockTimeoutSeconds: config.blockTimeoutSeconds,
                });
            default: {
                const neverDriver: never = config;
                throw new Error(`Queue driver [${JSON.stringify(neverDriver)}] is not supported`);
            }
        }
    }
}
