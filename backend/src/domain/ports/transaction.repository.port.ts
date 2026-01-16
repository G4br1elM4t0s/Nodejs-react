import { Transaction } from '../entities/transaction.entity';

/**
 * Port (Interface) para o repositório de transações
 * Define o contrato que a infraestrutura deve implementar
 */
export interface ITransactionRepository {
  /**
   * Cria uma nova transação
   * @throws Error se a transação já existir (violação de idempotência)
   */
  create(transaction: Transaction): Promise<Transaction>;

  /**
   * Busca uma transação pela chave de idempotência
   */
  findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null>;

  /**
   * Busca uma transação pelo ID
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * Lista todas as transações com paginação
   */
  findAll(page: number, limit: number): Promise<Transaction[]>;

  /**
   * Conta o total de transações
   */
  count(): Promise<number>;
}
