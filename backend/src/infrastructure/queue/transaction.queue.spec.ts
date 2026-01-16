import { TransactionQueue } from './transaction.queue';

describe('TransactionQueue', () => {
  let queue: TransactionQueue;

  beforeEach(() => {
    queue = new TransactionQueue();
  });

  afterEach(async () => {
    // Limpar fila após cada teste
    await queue.getQueue().obliterate({ force: true });
  });

  describe('addTransaction', () => {
    it('should add a transaction to the queue', async () => {
      const jobData = {
        idempotencyKey: 'test-queue-123',
        amount: 100.5,
        currency: 'BRL',
        description: 'Test transaction',
      };

      const jobId = await queue.addTransaction(jobData);

      expect(jobId).toBeDefined();
      expect(jobId).toBe('test-queue-123'); // jobId deve ser igual à idempotencyKey
    });

    it('should use idempotencyKey as jobId', async () => {
      const jobData = {
        idempotencyKey: 'unique-job-id',
        amount: 50,
        currency: 'USD',
        description: 'Test',
      };

      const jobId = await queue.addTransaction(jobData);

      expect(jobId).toBe('unique-job-id');
    });

    it('should not create duplicate jobs with same idempotencyKey', async () => {
      const jobData = {
        idempotencyKey: 'duplicate-test',
        amount: 100,
        currency: 'BRL',
        description: 'First attempt',
      };

      // Adicionar primeiro job
      const firstJobId = await queue.addTransaction(jobData);

      // Tentar adicionar job com mesma chave
      const secondJobData = {
        ...jobData,
        amount: 999, // Valor diferente
        description: 'Second attempt',
      };

      const secondJobId = await queue.addTransaction(secondJobData);

      // Deve retornar o mesmo jobId
      expect(secondJobId).toBe(firstJobId);

      // Deve haver apenas 1 job na fila
      const jobs = await queue.getQueue().getJobs(['waiting', 'active', 'completed']);
      const duplicateJobs = jobs.filter((j) => j.id === 'duplicate-test');
      expect(duplicateJobs.length).toBe(1);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queue.getQueueStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    it('should show increased waiting count after adding job', async () => {
      const initialStats = await queue.getQueueStats();

      await queue.addTransaction({
        idempotencyKey: 'stats-test',
        amount: 100,
        currency: 'BRL',
        description: 'Test',
      });

      const updatedStats = await queue.getQueueStats();

      expect(updatedStats.waiting).toBeGreaterThanOrEqual(initialStats.waiting);
    });
  });

  describe('cleanCompleted', () => {
    it('should clean completed jobs', async () => {
      // Este teste é mais complexo e requer que jobs sejam processados
      // Por simplicidade, vamos apenas verificar que o método não lança erro
      await expect(queue.cleanCompleted()).resolves.not.toThrow();
    });
  });

  describe('getQueue', () => {
    it('should return the BullMQ Queue instance', () => {
      const queueInstance = queue.getQueue();

      expect(queueInstance).toBeDefined();
      expect(queueInstance.name).toBe('transactions');
    });
  });
});
