import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import type { Transaction } from '../../../types/transaction';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface TransactionCardProps {
  transaction: Transaction;
}

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {formatCurrency(transaction.amount, transaction.currency)}
          </h3>
          <p className="text-sm text-gray-600">{transaction.description}</p>
        </div>
        <Badge status={transaction.status} />
      </div>
      
      <div className="space-y-1 text-sm text-gray-500">
        <p>
          <span className="font-medium">ID:</span> {transaction.id}
        </p>
        <p>
          <span className="font-medium">Chave:</span> {transaction.idempotencyKey}
        </p>
        <p>
          <span className="font-medium">Criado em:</span> {formatDate(transaction.createdAt)}
        </p>
      </div>
    </Card>
  );
};
