import axios from 'axios';
import type {
  Transaction,
  CreateTransactionInput,
  TransactionListResponse,
  TransactionCreateResponse,
} from '../types/transaction';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

export const transactionService = {
  /**
   * Criar nova transação
   */
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const response = await api.post<TransactionCreateResponse>('/transactions', data);
    return response.data.data;
  },

  /**
   * Listar transações com paginação
   */
  async listTransactions(page: number = 1, limit: number = 10): Promise<TransactionListResponse> {
    const response = await api.get<TransactionListResponse>('/transactions', {
      params: { page, limit },
    });
    return response.data;
  },
};
