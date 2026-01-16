import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionSchema } from './database/entities/transaction.schema';
import { TransactionRepository } from './repositories/transaction.repository';
import { AppLoggerService } from './logger/app-logger.service';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { EnqueueTransactionUseCase } from '../application/use-cases/enqueue-transaction.use-case';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.use-case';
import { TransactionsController } from './controllers/transactions.controller';
import { QueueController } from './controllers/queue.controller';
import { TransactionQueue } from './queue/transaction.queue';
import { TransactionProcessor } from './queue/processors/transaction.processor';
import { TRANSACTION_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../domain/ports/tokens';

/**
 * Módulo de Transações
 * Configura todas as dependências incluindo fila Redis/BullMQ
 */
@Module({
  imports: [TypeOrmModule.forFeature([TransactionSchema])],
  controllers: [TransactionsController, QueueController],
  providers: [
    // Repositórios
    {
      provide: TRANSACTION_REPOSITORY_TOKEN,
      useClass: TransactionRepository,
    },
    // Logger
    {
      provide: LOGGER_TOKEN,
      useClass: AppLoggerService,
    },
    // Queue
    TransactionQueue,
    TransactionProcessor,
    // Use Cases
    CreateTransactionUseCase,
    EnqueueTransactionUseCase,
    ListTransactionsUseCase,
  ],
  exports: [CreateTransactionUseCase, ListTransactionsUseCase],
})
export class TransactionsModule {}
