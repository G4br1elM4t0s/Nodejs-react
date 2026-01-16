import { Test, TestingModule } from '@nestjs/testing';
import { ListTransactionsUseCase } from './list-transactions.use-case';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import type { ILogger } from '../../domain/ports/logger.port';
import { TRANSACTION_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../../domain/ports/tokens';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

describe('ListTransactionsUseCase', () => {
  let useCase: ListTransactionsUseCase;
  let mockRepository: jest.Mocked<ITransactionRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTransactionsUseCase,
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<ListTransactionsUseCase>(ListTransactionsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [
        new Transaction({
          id: '1',
          idempotencyKey: 'key-1',
          amount: 100,
          currency: 'BRL',
          description: 'Test 1',
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        new Transaction({
          id: '2',
          idempotencyKey: 'key-2',
          amount: 200,
          currency: 'BRL',
          description: 'Test 2',
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      mockRepository.findAll.mockResolvedValue(mockTransactions);
      mockRepository.count.mockResolvedValue(25);

      const result = await useCase.execute(1, 10);

      expect(result.data).toEqual(mockTransactions);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(mockRepository.count).toHaveBeenCalled();
    });

    it('should use default values if not provided', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      const result = await useCase.execute();

      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should calculate correct total pages', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(23);

      const result = await useCase.execute(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      const result = await useCase.execute(1, 10);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
