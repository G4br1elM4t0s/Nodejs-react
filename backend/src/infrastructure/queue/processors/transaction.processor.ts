import { Worker, Job } from 'bullmq';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { redisConfig } from '../config/redis.config';
import { CreateTransactionUseCase } from '../../../application/use-cases/create-transaction.use-case';
import type { TransactionJobData } from '../transaction.queue';
import type { ILogger } from '../../../domain/ports/logger.port';
import { LOGGER_TOKEN } from '../../../domain/ports/tokens';
import { Inject } from '@nestjs/common';

/**
 * Worker para processar transações da fila
 */
@Injectable()
export class TransactionProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<TransactionJobData>;

  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  onModuleInit() {
    this.worker = new Worker<TransactionJobData>(
      'transactions',
      async (job: Job<TransactionJobData>) => {
        return this.processTransaction(job);
      },
      {
        connection: redisConfig,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(
        `Job ${job.id} completado com sucesso`,
        'TransactionProcessor',
        { jobId: job.id, idempotencyKey: job.data.idempotencyKey },
      );
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} falhou`,
        err.stack,
        'TransactionProcessor',
        { jobId: job?.id, error: err.message },
      );
    });

    this.logger.log('Transaction Worker iniciado', 'TransactionProcessor');
  }

  async onModuleDestroy() {
    await this.worker.close();
    this.logger.log('Transaction Worker encerrado', 'TransactionProcessor');
  }

  private async processTransaction(job: Job<TransactionJobData>) {
    this.logger.log(
      `Processando transação do job ${job.id}`,
      'TransactionProcessor',
      {
        jobId: job.id,
        attempt: job.attemptsMade + 1,
        idempotencyKey: job.data.idempotencyKey,
      },
    );

    try {
      const transaction = await this.createTransactionUseCase.execute({
        idempotencyKey: job.data.idempotencyKey,
        amount: job.data.amount,
        currency: job.data.currency,
        description: job.data.description,
      });

      return {
        success: true,
        transactionId: transaction.id,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao processar transação no job ${job.id}`,
        error.stack,
        'TransactionProcessor',
        {
          jobId: job.id,
          error: error.message,
          idempotencyKey: job.data.idempotencyKey,
        },
      );

      throw error;
    }
  }
}
