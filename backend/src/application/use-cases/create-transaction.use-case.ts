import { Injectable, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import type { ILogger } from '../../domain/ports/logger.port';
import { TRANSACTION_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../../domain/ports/tokens';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use Case: Criar uma nova transação
 * Garante idempotência e valida a transação
 */
@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  async execute(data: CreateTransactionInput): Promise<Transaction> {
    const { idempotencyKey, amount, currency, description } = data;

    this.logger.log('Iniciando criação de transação', 'CreateTransactionUseCase', {
      idempotencyKey,
      amount,
      currency,
    });

    // Validações de negócio
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      this.logger.error('Chave de idempotência inválida', '', 'CreateTransactionUseCase', {
        idempotencyKey,
      });
      throw new BadRequestException('Idempotency key is required');
    }

    if (amount <= 0) {
      this.logger.error('Valor da transação inválido', '', 'CreateTransactionUseCase', {
        amount,
      });
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Verificar idempotência - se já existe, retorna a existente
    const existingTransaction = await this.transactionRepository.findByIdempotencyKey(
      idempotencyKey,
    );

    if (existingTransaction) {
      this.logger.warn('Transação duplicada detectada', 'CreateTransactionUseCase', {
        idempotencyKey,
        existingTransactionId: existingTransaction.id,
      });
      return existingTransaction;
    }

    // Criar nova transação
    const transaction = new Transaction({
      id: uuidv4(),
      idempotencyKey,
      amount,
      currency: currency || 'BRL',
      description,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Validar entidade
    if (!transaction.isValid()) {
      this.logger.error('Transação inválida', '', 'CreateTransactionUseCase', {
        transaction,
      });
      throw new BadRequestException('Invalid transaction data');
    }

    try {
      const savedTransaction = await this.transactionRepository.create(transaction);

      this.logger.log('Transação criada com sucesso', 'CreateTransactionUseCase', {
        transactionId: savedTransaction.id,
        idempotencyKey,
      });

      return savedTransaction;
    } catch (error) {
      // Se houver erro de concorrência (unique constraint), tentar buscar novamente
      if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
        this.logger.warn('Conflito de concorrência detectado', 'CreateTransactionUseCase', {
          idempotencyKey,
        });

        const existingTx = await this.transactionRepository.findByIdempotencyKey(
          idempotencyKey,
        );

        if (existingTx) {
          return existingTx;
        }
      }

      this.logger.error(
        'Erro ao criar transação',
        error.stack,
        'CreateTransactionUseCase',
        { error: error.message },
      );
      throw error;
    }
  }
}

export interface CreateTransactionInput {
  idempotencyKey: string;
  amount: number;
  currency?: string;
  description: string;
}
