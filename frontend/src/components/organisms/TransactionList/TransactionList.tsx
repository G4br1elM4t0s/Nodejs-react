import { TransactionCard } from '../../molecules/TransactionCard';
import type { Transaction } from '../../../types/transaction';
import { Card } from '../../atoms/Card';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export const TransactionList = ({ transactions, isLoading }: TransactionListProps) => {
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin h-10 w-10 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600">Carregando transações...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma transação</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comece criando uma nova transação usando o formulário acima.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Transações ({transactions.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
};
