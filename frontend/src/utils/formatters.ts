/**
 * Formata valor monetário
 */
export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

/**
 * Formata data
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Gera uma chave de idempotência única
 */
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
