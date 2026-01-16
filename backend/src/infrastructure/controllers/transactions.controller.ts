import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.use-case';
import { EnqueueTransactionUseCase } from '../../application/use-cases/enqueue-transaction.use-case';
import { ListTransactionsUseCase } from '../../application/use-cases/list-transactions.use-case';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { QueryTransactionsDto } from '../dto/query-transactions.dto';
import type { ILogger } from '../../domain/ports/logger.port';
import { LOGGER_TOKEN } from '../../domain/ports/tokens';

/**
 * Controller para gerenciar transações
 * Adapter HTTP para os casos de uso
 */
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly enqueueTransactionUseCase: EnqueueTransactionUseCase,
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateTransactionDto) {
    this.logger.log('Requisição recebida: POST /transactions (síncrona)', 'TransactionsController', {
      idempotencyKey: dto.idempotencyKey,
    });

    const transaction = await this.createTransactionUseCase.execute(dto);

    return {
      success: true,
      data: transaction,
    };
  }

  @Post('async')
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createAsync(@Body() dto: CreateTransactionDto) {
    this.logger.log('Requisição recebida: POST /transactions/async (fila)', 'TransactionsController', {
      idempotencyKey: dto.idempotencyKey,
    });

    const { jobId } = await this.enqueueTransactionUseCase.execute(dto);

    return {
      success: true,
      message: 'Transação enfileirada para processamento',
      data: {
        jobId,
        idempotencyKey: dto.idempotencyKey,
        status: 'queued',
      },
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(@Query() query: QueryTransactionsDto) {
    this.logger.log('Requisição recebida: GET /transactions', 'TransactionsController', {
      page: query.page,
      limit: query.limit,
    });

    const result = await this.listTransactionsUseCase.execute(query.page, query.limit);

    return {
      success: true,
      ...result,
    };
  }
}
