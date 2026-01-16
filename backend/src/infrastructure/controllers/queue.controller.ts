import { Controller, Get, Inject } from '@nestjs/common';
import { TransactionQueue } from '../queue/transaction.queue';
import type { ILogger } from '../../domain/ports/logger.port';
import { LOGGER_TOKEN } from '../../domain/ports/tokens';

/**
 * Controller para gerenciar informações da fila
 */
@Controller('queue')
export class QueueController {
  constructor(
    private readonly transactionQueue: TransactionQueue,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  @Get('stats')
  async getStats() {
    this.logger.log('Requisição recebida: GET /queue/stats', 'QueueController');

    const stats = await this.transactionQueue.getQueueStats();

    return {
      success: true,
      data: stats,
    };
  }
}
