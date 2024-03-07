import { UILogger } from '@gms/ui-util';
import findLastIndex from 'lodash/findLastIndex';

const logger = UILogger.create('GMS_LOG_FILTERS', process.env.GMS_LOG_FILTERS);

type RunFunction = () => Promise<unknown>;
type Task<TaskResultType> = (() => PromiseLike<TaskResultType>) | (() => TaskResultType);

// Port of lower_bound from https://en.cppreference.com/w/cpp/algorithm/lower_bound
// Used to compute insertion index to keep queue sorted after insertion
function lowerBound<T>(array: readonly T[], value: T, comparator: (a: T, b: T) => number): number {
  let first = 0;
  let count = array.length;

  while (count > 0) {
    const step = Math.trunc(count / 2);
    let it = first + step;

    if (comparator(array[it], value) <= 0) {
      it += 1;
      first = it;
      count -= step + 1;
    } else {
      count = step;
    }
  }

  return first;
}

export interface OrderedPriorityQueueOptions {
  tag: string;
  priority?: number;
}

/**
 * Creates a priority queue and allows in flight adjustment to the priority of the tasks in the queue.
 *
 * Usage:
 *
 * ```ts
 * const queue = new OrderedPriorityQueue({ concurrency: 15 });
 * ```
 */
export class OrderedPriorityQueue {
  private readonly queue: (OrderedPriorityQueueOptions & { run: RunFunction })[] = [];

  private tag: string;

  private pending = 0;

  private readonly concurrency = 0;

  public constructor(options) {
    this.concurrency = options.concurrency || Number.MAX_SAFE_INTEGER;
  }

  private get doesConcurrencyAllowAnother(): boolean {
    return this.pending < this.concurrency;
  }

  private tryToStartAnother() {
    if (this.doesConcurrencyAllowAnother) {
      const job = this.dequeue();

      if (!job) return false;

      job().catch(error => {
        logger.error(error);
        throw error;
      });

      return true;
    }

    return false;
  }

  private next() {
    this.pending -= 1;
    this.tryToStartAnother();
  }

  private enqueue(run: RunFunction, options?: Partial<OrderedPriorityQueueOptions>): void {
    options = {
      priority: 0,
      ...options
    };

    const element = {
      priority: options.priority,
      tag: options.tag,
      run
    };

    if (this.size && this.queue[this.size - 1]?.priority >= options.priority) {
      this.queue.push(element);
      return;
    }

    const index = lowerBound(
      this.queue,
      element,
      (a: Readonly<OrderedPriorityQueueOptions>, b: Readonly<OrderedPriorityQueueOptions>) =>
        b.priority - a.priority
    );
    this.queue.splice(index, 0, element);
  }

  private dequeue(): RunFunction | undefined {
    if (this.tag) {
      const index = findLastIndex(this.queue, item => item.tag === this.tag);
      if (index >= 0) {
        const item = this.queue.splice(index, 1);
        return item[0]?.run;
      }

      this.tag = undefined;
    }

    const item = this.queue.shift();
    return item?.run;
  }

  /**
   * Get the size of the remaining items in the queue
   */
  public get size(): number {
    return this.queue.length;
  }

  /**
   * Clear the promise queue of all pending promises
   */
  public clear(): void {
    this.queue.length = 0;
  }

  /**
   * Prioritize the queue against a new tag
   *
   * @param tag the tag to prioritize the queue against
   */
  public prioritize(tag: string): void {
    this.tag = tag;
  }

  /**
   * Add a task to the priority queue.
   *
   * @param func the function to resolve
   * @param options the options for this task (tag and priority)
   * @returns a promise
   */
  public async add<TaskResultType>(
    func: Task<TaskResultType>,
    options: Partial<OrderedPriorityQueueOptions> = {}
  ): Promise<TaskResultType | void> {
    return new Promise((resolve, reject) => {
      this.enqueue(async () => {
        this.pending += 1;
        try {
          const result = await func();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.next();
        }
      }, options);

      this.tryToStartAnother();
    });
  }
}
