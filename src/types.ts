/**
 * Local queue contracts for @ninots/queue (zero cross-package deps).
 *
 * @packageDocumentation
 */

/**
 * Executable job — implement {@link handle}.
 */
export interface Job {
    handle(): void | Promise<void>;
}

/**
 * Optional marker for jobs that may be dispatched asynchronously.
 * Apps may also set `$queue` to pick a named queue list.
 */
export interface ShouldQueue {
    readonly $queue?: string;
}

/**
 * Job that can be serialized onto Redis (name + data payload).
 */
export interface QueueableJob extends Job {
    readonly jobName: string;
    toData(): Record<string, unknown>;
}

/**
 * Wire payload stored on Redis lists / delayed sets.
 */
export interface JobPayload {
    name: string;
    data: Record<string, unknown>;
}

/**
 * Reconstruct a {@link Job} from a payload name + data.
 */
export type JobFactory = (data: Record<string, unknown>) => Job;

/**
 * Registry: job name → factory used by the worker.
 */
export class JobRegistry {
    private readonly factories = new Map<string, JobFactory>();

    public register(name: string, factory: JobFactory): this {
        this.factories.set(name, factory);
        return this;
    }

    public has(name: string): boolean {
        return this.factories.has(name);
    }

    public resolve(name: string, data: Record<string, unknown>): Job {
        const factory = this.factories.get(name);
        if (factory === undefined) {
            throw new Error(`Job [${name}] is not registered`);
        }
        return factory(data);
    }
}

/**
 * Queue connector contract.
 */
export interface Queue {
    push(job: Job | JobPayload, queueName?: string): Promise<void>;
    later(delaySeconds: number, job: Job | JobPayload, queueName?: string): Promise<void>;
    pop(queueName?: string): Promise<JobPayload | null>;
    size(queueName?: string): Promise<number>;
}

/**
 * Thin Redis surface used by {@link RedisQueue} (mockable in tests).
 */
export interface QueueRedisClient {
    lpush(key: string, ...values: string[]): Promise<number>;
    rpop(key: string): Promise<string | null>;
    brpop(key: string, timeoutSeconds: number): Promise<[string, string] | null>;
    llen(key: string): Promise<number>;
    zadd(key: string, score: number | string, member: string): Promise<number>;
    zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]>;
    zrem(key: string, member: string, ...members: string[]): Promise<number>;
    zcard(key: string): Promise<number>;
}

/**
 * Supported connector drivers.
 */
export type QueueDriver = "sync" | "redis";

/**
 * Per-connection config for {@link QueueManager}.
 */
export type QueueConnectionConfig =
    | { driver: "sync"; queue?: string }
    | {
          driver: "redis";
          client: QueueRedisClient;
          queue?: string;
          prefix?: string;
          /**
           * When &gt; 0, {@link RedisQueue.pop} uses BRPOP with this timeout (seconds).
           * When 0, uses non-blocking RPOP.
           */
          blockTimeoutSeconds?: number;
      };

/**
 * Manager config — connections keyed by name.
 */
export interface QueueManagerConfig {
    default: string;
    connections: Record<string, QueueConnectionConfig>;
}
