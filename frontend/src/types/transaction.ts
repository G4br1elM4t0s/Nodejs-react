export interface Transaction {
  id: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  idempotencyKey: string;
  amount: number;
  currency?: string;
  description: string;
}

export interface TransactionListResponse {
  success: boolean;
  data: Transaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionCreateResponse {
  success: boolean;
  data: Transaction;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}
