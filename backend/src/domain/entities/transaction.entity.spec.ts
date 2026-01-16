import { Transaction, TransactionStatus } from './transaction.entity';

describe('Transaction Entity', () => {
  describe('constructor', () => {
    it('should create a transaction with all fields', () => {
      const data = {
        id: '123',
        idempotencyKey: 'key-123',
        amount: 100.5,
        currency: 'BRL',
        description: 'Test transaction',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const transaction = new Transaction(data);

      expect(transaction.id).toBe(data.id);
      expect(transaction.idempotencyKey).toBe(data.idempotencyKey);
      expect(transaction.amount).toBe(data.amount);
      expect(transaction.currency).toBe(data.currency);
      expect(transaction.description).toBe(data.description);
      expect(transaction.status).toBe(data.status);
    });
  });

  describe('isValid', () => {
    it('should return true for valid transaction', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: 'key-123',
        amount: 100.5,
        currency: 'BRL',
        description: 'Test transaction',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(true);
    });

    it('should return false if idempotencyKey is missing', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: '',
        amount: 100.5,
        currency: 'BRL',
        description: 'Test',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(false);
    });

    it('should return false if amount is zero', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: 'key-123',
        amount: 0,
        currency: 'BRL',
        description: 'Test',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(false);
    });

    it('should return false if amount is negative', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: 'key-123',
        amount: -10,
        currency: 'BRL',
        description: 'Test',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(false);
    });

    it('should return false if currency is missing', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: 'key-123',
        amount: 100,
        currency: '',
        description: 'Test',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(false);
    });

    it('should return false if description is missing', () => {
      const transaction = new Transaction({
        id: '123',
        idempotencyKey: 'key-123',
        amount: 100,
        currency: 'BRL',
        description: '',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(transaction.isValid()).toBe(false);
    });
  });

  describe('TransactionStatus', () => {
    it('should have correct status values', () => {
      expect(TransactionStatus.PENDING).toBe('pending');
      expect(TransactionStatus.COMPLETED).toBe('completed');
      expect(TransactionStatus.FAILED).toBe('failed');
    });
  });
});
