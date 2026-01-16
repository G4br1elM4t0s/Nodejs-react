/**
 * Port (Interface) para logging estruturado
 */
export interface ILogger {
  log(message: string, context?: string, metadata?: any): void;
  error(message: string, trace?: string, context?: string, metadata?: any): void;
  warn(message: string, context?: string, metadata?: any): void;
  debug(message: string, context?: string, metadata?: any): void;
}
