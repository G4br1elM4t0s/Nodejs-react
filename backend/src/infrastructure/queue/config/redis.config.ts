import { RedisOptions } from 'ioredis';

/**
 * Configuração do Redis
 */
export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};
