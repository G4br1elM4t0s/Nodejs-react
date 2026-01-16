/**
 * Domain Entity - Transaction
 * Representa uma transação financeira no domínio
 */
export class Transaction {
  id: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Transaction>) {
    Object.assign(this, partial);
  }

  isValid(): boolean {
    return (
      !!this.idempotencyKey &&
      this.amount > 0 &&
      !!this.currency &&
      !!this.description
    );
  }
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
