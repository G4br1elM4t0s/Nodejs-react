import { Queue, QueueOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { redisConfig } from './config/redis.config';
import type { CreateTransactionInput } from '../../application/use-cases/create-transaction.use-case';

export interface TransactionJobData extends CreateTransactionInput {
  correlationId?: string;
}

/**
 * Fila para processamento de transações
 */
@Injectable()
export class TransactionQueue {
  private queue: Queue<TransactionJobData>;

  constructor() {
    const queueOptions: QueueOptions = {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 1000,
        },
      },
    };

    this.queue = new Queue<TransactionJobData>('transactions', queueOptions);
  }

  /**
   * Adiciona uma transação na fila
   */
  async addTransaction(data: TransactionJobData): Promise<string> {
    const job = await this.queue.add('process-transaction', data, {
      jobId: data.idempotencyKey,
    });

    return job.id || '';
  }

  /**
   * Obtém informações da fila
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Limpa jobs completados
   */
  async cleanCompleted() {
    await this.queue.clean(3600000, 100, 'completed');
  }

  getQueue(): Queue<TransactionJobData> {
    return this.queue;
  }
}
