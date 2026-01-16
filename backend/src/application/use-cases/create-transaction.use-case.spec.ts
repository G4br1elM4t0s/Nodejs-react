import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import type { ILogger } from '../../domain/ports/logger.port';
import { TRANSACTION_REPOSITORY_TOKEN, LOGGER_TOKEN } from '../../domain/ports/tokens';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
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
        CreateTransactionUseCase,
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

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
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

    it('should create a new transaction successfully', async () => {
      const expectedTransaction = new Transaction({
        id: 'generated-id',
        ...validInput,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(expectedTransaction);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(expectedTransaction);
      expect(mockRepository.findByIdempotencyKey).toHaveBeenCalledWith('test-key-123');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should return existing transaction if idempotency key already exists', async () => {
      const existingTransaction = new Transaction({
        id: 'existing-id',
        ...validInput,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.findByIdempotencyKey.mockResolvedValue(existingTransaction);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(existingTransaction);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('duplicada'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if idempotency key is empty', async () => {
      const invalidInput = {
        ...validInput,
        idempotencyKey: '',
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException if amount is zero', async () => {
      const invalidInput = {
        ...validInput,
        amount: 0,
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount is negative', async () => {
      const invalidInput = {
        ...validInput,
        amount: -10,
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(BadRequestException);
    });

    it('should use default currency if not provided', async () => {
      const inputWithoutCurrency = {
        idempotencyKey: 'test-key-456',
        amount: 50,
        description: 'Test',
      };

      const expectedTransaction = new Transaction({
        id: 'generated-id',
        ...inputWithoutCurrency,
        currency: 'BRL',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(expectedTransaction);

      const result = await useCase.execute(inputWithoutCurrency);

      expect(result.currency).toBe('BRL');
    });

    it('should handle race condition and return existing transaction', async () => {
      const existingTransaction = new Transaction({
        id: 'existing-id',
        ...validInput,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.findByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingTransaction);

      const error: any = new Error('Duplicate key');
      error.code = 'SQLITE_CONSTRAINT';
      mockRepository.create.mockRejectedValue(error);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(existingTransaction);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
