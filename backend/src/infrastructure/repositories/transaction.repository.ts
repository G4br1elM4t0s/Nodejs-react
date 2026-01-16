import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';
import { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { TransactionSchema } from '../database/entities/transaction.schema';

/**
 * Implementação do repositório de transações
 * Adapter para o TypeORM
 */
@Injectable()
export class TransactionRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionSchema)
    private readonly repository: Repository<TransactionSchema>,
  ) {}

  async create(transaction: Transaction): Promise<Transaction> {
    const schema = this.repository.create(transaction);
    const saved = await this.repository.save(schema);
    return this.toDomain(saved);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null> {
    const schema = await this.repository.findOne({
      where: { idempotencyKey },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findById(id: string): Promise<Transaction | null> {
    const schema = await this.repository.findOne({
      where: { id },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findAll(page: number, limit: number): Promise<Transaction[]> {
    const schemas = await this.repository.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return schemas.map((schema) => this.toDomain(schema));
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Converte o schema do TypeORM para a entidade de domínio
   */
  private toDomain(schema: TransactionSchema): Transaction {
    return new Transaction({
      id: schema.id,
      idempotencyKey: schema.idempotencyKey,
      amount: Number(schema.amount),
      currency: schema.currency,
      description: schema.description,
      status: schema.status,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }
}
