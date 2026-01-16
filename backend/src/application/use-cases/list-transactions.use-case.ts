import { Injectable, Inject } from '@nestjs/common';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import type { ILogger } from '../../domain/ports/logger.port';
import { TRANSACTION_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../../domain/ports/tokens';

/**
 * Use Case: Listar transações com paginação
 */
@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  async execute(page: number = 1, limit: number = 10): Promise<ListTransactionsOutput> {
    this.logger.log('Listando transações', 'ListTransactionsUseCase', {
      page,
      limit,
    });

    const transactions = await this.transactionRepository.findAll(page, limit);
    const total = await this.transactionRepository.count();

    this.logger.log('Transações listadas com sucesso', 'ListTransactionsUseCase', {
      total,
      returned: transactions.length,
    });

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export interface ListTransactionsOutput {
  data: Transaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
