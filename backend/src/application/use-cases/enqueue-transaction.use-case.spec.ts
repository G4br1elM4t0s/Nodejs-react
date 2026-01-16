import { Test, TestingModule } from '@nestjs/testing';
import { EnqueueTransactionUseCase } from './enqueue-transaction.use-case';
import { TransactionQueue } from '../../infrastructure/queue/transaction.queue';
import type { ILogger } from '../../domain/ports/logger.port';
import { LOGGER_TOKEN } from '../../domain/ports/tokens';

describe('EnqueueTransactionUseCase', () => {
  let useCase: EnqueueTransactionUseCase;
  let mockQueue: jest.Mocked<TransactionQueue>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockQueue = {
      addTransaction: jest.fn(),
      getQueueStats: jest.fn(),
      cleanCompleted: jest.fn(),
      getQueue: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnqueueTransactionUseCase,
        {
          provide: TransactionQueue,
          useValue: mockQueue,
        },
        {
          provide: LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<EnqueueTransactionUseCase>(EnqueueTransactionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const validInput = {
      idempotencyKey: 'test-key-123',
      amount: 100.5,
      currency: 'BRL',
      description: 'Test transaction',
    };

    it('should enqueue transaction successfully', async () => {
      const expectedJobId = 'job-123';
      mockQueue.addTransaction.mockResolvedValue(expectedJobId);

      const result = await useCase.execute(validInput);

      expect(result.jobId).toBe(expectedJobId);
      expect(mockQueue.addTransaction).toHaveBeenCalledWith({
        ...validInput,
        currency: 'BRL',
      });
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should use default currency if not provided', async () => {
      const inputWithoutCurrency = {
        idempotencyKey: 'test-key-456',
        amount: 50,
        description: 'Test',
      };

      mockQueue.addTransaction.mockResolvedValue('job-456');

      await useCase.execute(inputWithoutCurrency);

      expect(mockQueue.addTransaction).toHaveBeenCalledWith({
        ...inputWithoutCurrency,
        currency: 'BRL',
      });
    });

    it('should handle queue errors', async () => {
      const error = new Error('Queue error');
      mockQueue.addTransaction.mockRejectedValue(error);

      await expect(useCase.execute(validInput)).rejects.toThrow('Queue error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
