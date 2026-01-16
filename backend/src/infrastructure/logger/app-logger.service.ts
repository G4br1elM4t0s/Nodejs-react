import { Injectable, Logger } from '@nestjs/common';
import { ILogger } from '../../domain/ports/logger.port';

/**
 * Implementação do logger estruturado
 * Adapter para o Logger do NestJS
 */
@Injectable()
export class AppLoggerService implements ILogger {
  private readonly logger = new Logger();

  log(message: string, context?: string, metadata?: any): void {
    const logMessage = this.formatMessage(message, metadata);
    this.logger.log(logMessage, context);
  }

  error(message: string, trace?: string, context?: string, metadata?: any): void {
    const logMessage = this.formatMessage(message, metadata);
    this.logger.error(logMessage, trace, context);
  }

  warn(message: string, context?: string, metadata?: any): void {
    const logMessage = this.formatMessage(message, metadata);
    this.logger.warn(logMessage, context);
  }

  debug(message: string, context?: string, metadata?: any): void {
    const logMessage = this.formatMessage(message, metadata);
    this.logger.debug(logMessage, context);
  }

  private formatMessage(message: string, metadata?: any): string {
    if (!metadata) {
      return message;
    }

    return `${message} ${JSON.stringify(metadata)}`;
  }
}
