import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/infrastructure/filters/http-exception.filter';

describe('Queue E2E (Redis + BullMQ)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    // Aguardar um pouco para garantir que o worker está pronto
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/transactions/async (POST)', () => {
    it('should enqueue transaction successfully', () => {
      const transactionData = {
        idempotencyKey: `test-queue-${Date.now()}`,
        amount: 100.5,
        currency: 'BRL',
        description: 'Queue Test Transaction',
      };

      return request(app.getHttpServer())
        .post('/api/transactions/async')
        .send(transactionData)
        .expect(202)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('enfileirada');
          expect(res.body.data).toHaveProperty('jobId');
          expect(res.body.data).toHaveProperty('idempotencyKey');
          expect(res.body.data.status).toBe('queued');
        });
    });

    it('should process queued transaction', async () => {
      const idempotencyKey = `test-queue-process-${Date.now()}`;
      const transactionData = {
        idempotencyKey,
        amount: 150.75,
        currency: 'USD',
        description: 'Async processing test',
      };

      // Enfileirar transação
      await request(app.getHttpServer())
        .post('/api/transactions/async')
        .send(transactionData)
        .expect(202);

      // Aguardar processamento (worker pode demorar)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verificar se foi criada no banco
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .expect(200);

      const transaction = response.body.data.find(
        (t: any) => t.idempotencyKey === idempotencyKey,
      );

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(150.75);
      expect(transaction.currency).toBe('USD');
      expect(transaction.status).toBe('completed');
    });

    it('should handle duplicate async requests (idempotency in queue)', async () => {
      const idempotencyKey = `test-queue-duplicate-${Date.now()}`;
      const transactionData = {
        idempotencyKey,
        amount: 200.0,
        currency: 'BRL',
        description: 'Duplicate queue test',
      };

      // Primeira requisição
      const firstResponse = await request(app.getHttpServer())
        .post('/api/transactions/async')
        .send(transactionData)
        .expect(202);

      // Segunda requisição com mesma chave
      const secondResponse = await request(app.getHttpServer())
        .post('/api/transactions/async')
        .send(transactionData)
        .expect(202);

      // Ambas devem ter o mesmo jobId (idempotencyKey é usado como jobId)
      expect(firstResponse.body.data.jobId).toBe(idempotencyKey);
      expect(secondResponse.body.data.jobId).toBe(idempotencyKey);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verificar que apenas uma transação foi criada
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .expect(200);

      const transactions = response.body.data.filter(
        (t: any) => t.idempotencyKey === idempotencyKey,
      );

      expect(transactions.length).toBe(1);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/transactions/async')
        .send({
          amount: 100.5,
          // Faltando campos obrigatórios
        })
        .expect(400);
    });
  });

  describe('/api/queue/stats (GET)', () => {
    it('should return queue statistics', () => {
      return request(app.getHttpServer())
        .get('/api/queue/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('waiting');
          expect(res.body.data).toHaveProperty('active');
          expect(res.body.data).toHaveProperty('completed');
          expect(res.body.data).toHaveProperty('failed');
          expect(typeof res.body.data.waiting).toBe('number');
          expect(typeof res.body.data.active).toBe('number');
          expect(typeof res.body.data.completed).toBe('number');
          expect(typeof res.body.data.failed).toBe('number');
        });
    });

    it('should show increased completed count after processing', async () => {
      // Pegar estatísticas iniciais
      const initialStats = await request(app.getHttpServer())
        .get('/api/queue/stats')
        .expect(200);

      const initialCompleted = initialStats.body.data.completed;

      // Enfileirar nova transação
      await request(app.getHttpServer())
        .post('/api/transactions/async')
        .send({
          idempotencyKey: `test-stats-${Date.now()}`,
          amount: 50,
          currency: 'BRL',
          description: 'Stats test',
        })
        .expect(202);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verificar estatísticas atualizadas
      const updatedStats = await request(app.getHttpServer())
        .get('/api/queue/stats')
        .expect(200);

      expect(updatedStats.body.data.completed).toBeGreaterThan(initialCompleted);
    });
  });

  describe('Queue performance and reliability', () => {
    it('should handle multiple concurrent async requests', async () => {
      const timestamp = Date.now();
      const promises = Array(20)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/api/transactions/async')
            .send({
              idempotencyKey: `test-concurrent-queue-${timestamp}-${index}`,
              amount: 10 + index,
              currency: 'BRL',
              description: `Concurrent queue test ${index}`,
            }),
        );

      const responses = await Promise.all(promises);

      // Todas devem ter sucesso (202)
      responses.forEach((res) => {
        expect(res.status).toBe(202);
        expect(res.body.success).toBe(true);
      });

      // Aguardar processamento de todas
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Verificar que todas foram processadas
      const transactionsResponse = await request(app.getHttpServer())
        .get('/api/transactions?limit=50')
        .expect(200);

      const processedTransactions = transactionsResponse.body.data.filter((t: any) =>
        t.idempotencyKey.startsWith(`test-concurrent-queue-${timestamp}`),
      );

      expect(processedTransactions.length).toBe(20);
    });

    it('should process transactions in background while accepting new requests', async () => {
      // Enfileirar várias transações rapidamente
      const enqueuePromises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app.getHttpServer())
            .post('/api/transactions/async')
            .send({
              idempotencyKey: `test-background-${Date.now()}-${index}`,
              amount: 100,
              currency: 'BRL',
              description: `Background test ${index}`,
            }),
        );

      // Todas as requisições devem ser aceitas rapidamente
      const startTime = Date.now();
      await Promise.all(enqueuePromises);
      const endTime = Date.now();

      // Deve ser rápido (< 1 segundo para aceitar todas)
      expect(endTime - startTime).toBeLessThan(1000);

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Verificar que foram processadas
      const stats = await request(app.getHttpServer())
        .get('/api/queue/stats')
        .expect(200);

      expect(stats.body.data.completed).toBeGreaterThan(0);
    });
  });
});
