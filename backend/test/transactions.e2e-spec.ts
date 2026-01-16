import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/infrastructure/filters/http-exception.filter';

describe('Transactions E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Aplicar mesmas configurações do main.ts
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/transactions (POST)', () => {
    it('should create a new transaction', () => {
      const transactionData = {
        idempotencyKey: `test-e2e-${Date.now()}`,
        amount: 100.5,
        currency: 'BRL',
        description: 'E2E Test Transaction',
      };

      return request(app.getHttpServer())
        .post('/api/transactions')
        .send(transactionData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.idempotencyKey).toBe(transactionData.idempotencyKey);
          expect(res.body.data.amount).toBe(transactionData.amount);
          expect(res.body.data.currency).toBe(transactionData.currency);
          expect(res.body.data.description).toBe(transactionData.description);
          expect(res.body.data.status).toBe('completed');
        });
    });

    it('should return existing transaction with same idempotency key', async () => {
      const idempotencyKey = `test-idempotency-${Date.now()}`;
      const transactionData = {
        idempotencyKey,
        amount: 100.5,
        currency: 'BRL',
        description: 'First transaction',
      };

      // Primeira criação
      const firstResponse = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(transactionData)
        .expect(201);

      // Segunda tentativa com mesma chave
      const secondResponse = await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          ...transactionData,
          amount: 999.99, // Tentando mudar o valor
          description: 'Second transaction', // Tentando mudar a descrição
        })
        .expect(201);

      // Deve retornar a primeira transação
      expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
      expect(secondResponse.body.data.amount).toBe(100.5); // Mantém valor original
      expect(secondResponse.body.data.description).toBe('First transaction'); // Mantém descrição original
    });

    it('should fail with invalid data - missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          amount: 100.5,
          // Faltando idempotencyKey e description
        })
        .expect(400);
    });

    it('should fail with invalid amount - zero', () => {
      return request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          idempotencyKey: `test-invalid-${Date.now()}`,
          amount: 0,
          currency: 'BRL',
          description: 'Invalid transaction',
        })
        .expect(400);
    });

    it('should fail with invalid amount - negative', () => {
      return request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          idempotencyKey: `test-invalid-${Date.now()}`,
          amount: -10,
          currency: 'BRL',
          description: 'Invalid transaction',
        })
        .expect(400);
    });

    it('should use default currency if not provided', () => {
      return request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          idempotencyKey: `test-default-currency-${Date.now()}`,
          amount: 50,
          description: 'Transaction without currency',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.currency).toBe('BRL');
        });
    });
  });

  describe('/api/transactions (GET)', () => {
    beforeAll(async () => {
      // Criar algumas transações para testar a listagem
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/transactions')
          .send({
            idempotencyKey: `test-list-${i}-${Date.now()}`,
            amount: 100 + i,
            currency: 'BRL',
            description: `Test transaction ${i}`,
          });
      }
    });

    it('should list transactions with default pagination', () => {
      return request(app.getHttpServer())
        .get('/api/transactions')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('totalPages');
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(10);
        });
    });

    it('should list transactions with custom pagination', () => {
      return request(app.getHttpServer())
        .get('/api/transactions?page=1&limit=3')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(3);
          expect(res.body.data.length).toBeLessThanOrEqual(3);
        });
    });

    it('should return empty array for page beyond available data', () => {
      return request(app.getHttpServer())
        .get('/api/transactions?page=9999&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toEqual([]);
        });
    });
  });

  describe('Concurrent requests - Idempotency test', () => {
    it('should handle concurrent requests with same idempotency key', async () => {
      const idempotencyKey = `test-concurrent-${Date.now()}`;
      const transactionData = {
        idempotencyKey,
        amount: 100.5,
        currency: 'BRL',
        description: 'Concurrent test',
      };

      // Fazer 10 requisições simultâneas com a mesma chave
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/transactions')
            .send(transactionData),
        );

      const responses = await Promise.all(promises);

      // Todas devem ter sucesso (201)
      responses.forEach((res) => {
        expect(res.status).toBe(201);
      });

      // Todas devem retornar o mesmo ID
      const firstId = responses[0].body.data.id;
      responses.forEach((res) => {
        expect(res.body.data.id).toBe(firstId);
      });
    });
  });
});
