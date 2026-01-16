import { useState, useEffect } from 'react';
import { MainLayout } from '../../components/templates/MainLayout';
import { TransactionForm } from '../../components/organisms/TransactionForm';
import { TransactionList } from '../../components/organisms/TransactionList';
import { Alert } from '../../components/atoms/Alert';
import { transactionService } from '../../services/api';
import type { Transaction, CreateTransactionInput } from '../../types/transaction';
import { AxiosError } from 'axios';

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar transações
  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await transactionService.listTransactions(1, 20);
      setTransactions(response.data);
    } catch (err) {
      const error = err as AxiosError;
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Tempo de conexão esgotado. Verifique sua conexão.');
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        setError('Erro de conexão. Verifique se o backend está rodando.');
      } else {
        setError('Erro ao carregar transações. Tente novamente.');
      }
      console.error('Erro ao carregar transações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Criar transação
  const handleCreateTransaction = async (data: CreateTransactionInput) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const newTransaction = await transactionService.createTransaction(data);
      
      // Adicionar nova transação no início da lista
      setTransactions((prev) => [newTransaction, ...prev]);
      setSuccess('Transação criada com sucesso!');

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const error = err as AxiosError<{ message: string | string[] }>;
      
      if (error.response?.data?.message) {
        const message = error.response.data.message;
        const errorMessage = Array.isArray(message)
          ? message.join(', ')
          : message;
        setError(errorMessage);
      } else {
        setError('Erro ao criar transação. Tente novamente.');
      }
      
      console.error('Erro ao criar transação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Carregar transações ao montar o componente
  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Alertas */}
        {error && (
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert type="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Formulário */}
        <TransactionForm
          onSubmit={handleCreateTransaction}
          isLoading={isSubmitting}
        />

        {/* Lista de Transações */}
        <TransactionList transactions={transactions} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
};
