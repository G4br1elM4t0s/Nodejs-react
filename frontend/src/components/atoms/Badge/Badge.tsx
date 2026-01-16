interface BadgeProps {
  status: 'pending' | 'completed' | 'failed';
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pendente',
  completed: 'Concluída',
  failed: 'Falhou',
};

export const Badge = ({ status }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
};
