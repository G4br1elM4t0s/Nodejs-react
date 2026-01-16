import { useForm } from 'react-hook-form';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { generateIdempotencyKey } from '../../../utils/formatters';
import type { CreateTransactionInput } from '../../../types/transaction';

interface TransactionFormData {
  amount: string;
  currency: string;
  description: string;
}

interface TransactionFormProps {
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  isLoading: boolean;
}

export const TransactionForm = ({ onSubmit, isLoading }: TransactionFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    defaultValues: {
      currency: 'BRL',
      amount: '',
      description: '',
    },
  });

  const handleFormSubmit = async (data: TransactionFormData) => {
    const amount = parseFloat(data.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    const transactionData: CreateTransactionInput = {
      amount,
      currency: data.currency,
      description: data.description,
      idempotencyKey: generateIdempotencyKey(),
    };

    await onSubmit(transactionData);
    reset();
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova Transação</h2>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Valor *"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount', {
              required: 'Valor é obrigatório',
              min: {
                value: 0.01,
                message: 'Valor deve ser maior que zero',
              },
            })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moeda *
            </label>
            <select
              className="input-field"
              {...register('currency')}
            >
              <option value="BRL">BRL - Real</option>
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </div>

        <Textarea
          label="Descrição *"
          placeholder="Descreva a transação..."
          rows={3}
          error={errors.description?.message}
          {...register('description', {
            required: 'Descrição é obrigatória',
            minLength: {
              value: 1,
              message: 'Descrição é obrigatória',
            },
            maxLength: {
              value: 200,
              message: 'Descrição muito longa (máximo 200 caracteres)',
            },
          })}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
            disabled={isLoading}
          >
            Limpar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Criar Transação
          </Button>
        </div>
      </form>
    </Card>
  );
};
