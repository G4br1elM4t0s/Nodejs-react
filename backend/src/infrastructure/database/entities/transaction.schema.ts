import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TransactionStatus } from '../../../domain/entities/transaction.entity';

/**
 * Schema do TypeORM para persistência da Transaction
 * Adapter para a camada de dados
 */
@Entity('transactions')
export class TransactionSchema {
  @PrimaryColumn('varchar')
  id: string;

  @Index({ unique: true })
  @Column('varchar', { unique: true })
  idempotencyKey: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('text')
  description: string;

  @Column({
    type: 'varchar',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
