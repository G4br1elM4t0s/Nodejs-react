import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TransactionSchema } from '../database/entities/transaction.schema';

/**
 * Configuração do banco de dados
 * Usando SQLite para facilitar a execução local
 */
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: 'database.sqlite',
  entities: [TransactionSchema],
  synchronize: true, // Em produção, use migrations
  logging: process.env.NODE_ENV === 'development',
};
