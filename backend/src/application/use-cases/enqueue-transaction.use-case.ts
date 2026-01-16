import { Injectable, Inject } from '@nestjs/common';
import type { ILogger } from '../../domain/ports/logger.port';
import { LOGGER_TOKEN } from '../../domain/ports/tokens';
import { TransactionQueue } from '../../infrastructure/queue/transaction.queue';

export interface EnqueueTransactionInput {
  idempotencyKey: string;
  amount: number;
  currency?: string;
  description: string;
}

/**
 * Use Case: Enfileirar transação para processamento assíncrono
 */
@Injectable()
export class EnqueueTransactionUseCase {
  constructor(
    private readonly transactionQueue: TransactionQueue,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  async execute(data: EnqueueTransactionInput): Promise<{ jobId: string }> {
    this.logger.log('Enfileirando transação', 'EnqueueTransactionUseCase', {
      idempotencyKey: data.idempotencyKey,
      amount: data.amount,
    });

    try {
      const jobId = await this.transactionQueue.addTransaction({
        ...data,
        currency: data.currency || 'BRL',
      });

      this.logger.log('Transação enfileirada com sucesso', 'EnqueueTransactionUseCase', {
        jobId,
        idempotencyKey: data.idempotencyKey,
      });

      return { jobId };
    } catch (error) {
      this.logger.error(
        'Erro ao enfileirar transação',
        error.stack,
        'EnqueueTransactionUseCase',
        {
          error: error.message,
          idempotencyKey: data.idempotencyKey,
        },
      );

      throw error;
    }
  }
}
