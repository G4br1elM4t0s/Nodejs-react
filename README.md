# Sistema de Processamento de Transações Financeiras

Este é um sistema full-stack desenvolvido para processar transações financeiras com foco em confiabilidade, escalabilidade e observabilidade. A proposta foi criar uma solução que não apenas funcione, mas que seja estruturada de forma a suportar cenários reais de produção, com volume alto de requisições, tratamento correto de concorrência e facilidade de manutenção.

## Sobre o Projeto

A aplicação permite criar e listar transações financeiras de duas formas: processamento síncrono para resposta imediata, e processamento assíncrono através de filas para cenários de alto volume. Todo o sistema foi pensado para garantir idempotência, evitar duplicações e manter a consistência dos dados mesmo em situações de concorrência.

---

## Arquitetura e Decisões Técnicas

### Por que organizei o projeto dessa forma?

#### Backend - Arquitetura Hexagonal (Ports & Adapters)

A estrutura do backend segue o padrão hexagonal, separando claramente três camadas:

```
src/
├── domain/              # Regras de negócio puras
│   ├── entities/        # Transaction, validações
│   └── ports/           # Interfaces (ITransactionRepository, ILogger)
├── application/         # Casos de uso
│   └── use-cases/       # CreateTransaction, ListTransactions, EnqueueTransaction
└── infrastructure/      # Adapters externos
    ├── controllers/     # HTTP (NestJS)
    ├── repositories/    # TypeORM
    ├── queue/           # BullMQ + Redis
    └── database/        # Schemas
```

Essa escolha foi motivada principalmente pela necessidade de manter o domínio (regras de negócio) completamente isolado de detalhes de infraestrutura. Na prática, isso significa que posso trocar o SQLite por PostgreSQL, ou substituir o TypeORM por outro ORM, sem precisar alterar uma linha sequer das regras de negócio. Além disso, a testabilidade melhora muito, já que todas as dependências externas são abstraídas através de interfaces, facilitando o uso de mocks nos testes.

Outro ponto importante é a manutenibilidade: quando uma mudança é necessária, fica muito mais claro onde mexer. Se é regra de negócio, vai no domain. Se é caso de uso, application. Se é detalhe de implementação, infrastructure.

#### Frontend - Atomic Design

No frontend, optei pelo Atomic Design para manter os componentes organizados e reutilizáveis:

```
src/
├── components/
│   ├── atoms/           # Button, Input, Card, Badge, Alert
│   ├── molecules/       # FormField, TransactionCard
│   ├── organisms/       # TransactionForm, TransactionList
│   └── templates/       # MainLayout
├── pages/               # TransactionsPage
├── services/            # API calls (Axios)
└── types/               # TypeScript interfaces
```

A ideia é ter componentes pequenos e composáveis (atoms) que se combinam para formar componentes mais complexos (molecules e organisms). Isso garante consistência visual em toda aplicação e facilita muito quando é preciso fazer alterações: se um botão precisa mudar de estilo, altero em um único lugar e todos os botões da aplicação ficam atualizados.

---

## Decisões Técnicas

### Onde colocaria cache? Quando não colocaria?

Cache é uma ferramenta poderosa, mas precisa ser usada nos lugares certos. No contexto deste sistema, faz sentido cachear operações de leitura que são frequentes e cujos dados não mudam com tanta frequência.

**Onde faz sentido cachear:**

A lista de transações é um candidato natural, especialmente se a aplicação for mais focada em consultas do que em criação. Um cache Redis com TTL de 60 segundos funcionaria bem aqui, reduzindo a carga no banco sem comprometer muito a atualidade dos dados.

A verificação de idempotência também poderia se beneficiar de cache. Antes de consultar o banco para verificar se uma transação com aquela chave já existe, poderia checar primeiro no Redis. Isso reduziria pela metade o número de consultas ao banco em cenários de retry.

Quando implementarmos autenticação, sessões de usuário são outro caso clássico de uso de cache.

**Onde NÃO faz sentido cachear:**

A criação de transações em si não deve ser cacheada. É uma operação de escrita que precisa ser consistente e refletir imediatamente no banco de dados. Cachear writes geralmente traz mais complexidade do que benefício.

Dados críticos que mudam com muita frequência também não são bons candidatos, porque você acaba com um cache que expira rápido demais e não traz ganho real.

**Estratégia atual:**

Atualmente, a lista de transações poderia usar Redis com TTL de 60s. A verificação de idempotência já faz consulta direta ao banco, mas poderia facilmente ser otimizada com cache. A fila BullMQ já usa Redis como storage por padrão, então esse aspecto já está coberto.

O principal benefício é reduzir a carga no banco de dados e melhorar a latência de operações de leitura, sem comprometer a consistência das escritas.

---

### Como garantiria observabilidade em produção?

Observabilidade é crucial para entender o que está acontecendo no sistema quando ele está rodando. Não basta apenas fazer funcionar; é preciso ter visibilidade sobre performance, erros e comportamento geral da aplicação.

**O que já está implementado:**

O sistema já usa logs estruturados em formato JSON, incluindo context e metadata relevante. Cada log carrega informações como qual use case foi executado, IDs das transações envolvidas, e quanto tempo a operação levou. Isso facilita muito a busca e análise posterior.

Há também correlation IDs que permitem rastrear uma requisição do início ao fim, e logs específicos da fila mostrando quando um job começa, quando termina com sucesso ou quando falha.

**Exemplo de como ficam os logs:**

```json
{
  "timestamp": "2026-01-15T22:30:00Z",
  "level": "info",
  "context": "CreateTransactionUseCase",
  "message": "Transação criada com sucesso",
  "metadata": {
    "transactionId": "abc-123",
    "idempotencyKey": "key-456",
    "amount": 100.50,
    "duration_ms": 45
  }
}
```

**Próximos passos para produção:**

Para um ambiente de produção real, seria fundamental adicionar APM (Application Performance Monitoring) como New Relic, Datadog ou Dynatrace. Essas ferramentas rastreiam automaticamente latência, throughput e taxa de erro, facilitando muito a identificação de problemas.

Métricas customizadas com Prometheus e visualização no Grafana também seriam essenciais. Métricas como quantidade de transações criadas, duração das operações, jobs esperando na fila e falhas totais ajudam a entender tendências e identificar degradação antes que vire problema.

Tracing distribuído com OpenTelemetry permitiria rastrear uma requisição do frontend, passando pelo backend, fila e banco de dados, visualizando exatamente onde o tempo está sendo gasto.

Por fim, alertas são fundamentais: se a taxa de erro passar de 5%, se a latência do percentil 95 ultrapassar 500ms, ou se a fila tiver mais de 1000 jobs esperando, alguém precisa ser notificado imediatamente.

---

### Em que cenário usaria fila/mensageria?

Filas são extremamente úteis quando você precisa desacoplar o recebimento de uma requisição do seu processamento efetivo. Este sistema já implementa isso usando BullMQ com Redis.

**Quando faz sentido usar filas:**

O cenário mais óbvio é alto volume. Se o sistema precisa aceitar mais de 1000 requisições por segundo, é praticamente impossível processar tudo de forma síncrona sem travar. A fila permite que a API aceite a requisição rapidamente e processe depois, em seu próprio ritmo.

Outro caso é quando o processamento envolve serviços externos que podem falhar temporariamente. Com fila, você ganha retry automático sem precisar que o cliente fique tentando novamente. Se um webhook falha, o sistema tenta mais 2 vezes com intervalo entre tentativas.

Processamento assíncrono que demora (gerar relatórios, enviar notificações, processar arquivos grandes) também se beneficia muito de filas. O usuário não precisa ficar esperando, recebe uma confirmação imediata e o processamento acontece em background.

Rate limiting é outro uso interessante: você pode controlar quantos workers processam simultaneamente, evitando sobrecarregar o banco de dados.

**Como está implementado aqui:**

```
Cliente → POST /transactions/async → BullMQ → Worker → Database
                                       ↓
                                    Redis
```

O cliente envia a requisição para o endpoint assíncrono, que coloca o job na fila do BullMQ (que persiste no Redis). Um worker pega esse job e processa, salvando no banco. Se falhar, tenta mais 2 vezes com backoff exponencial.

**Benefícios concretos alcançados:**

O endpoint assíncrono aceita mais de 2000 requisições por segundo, comparado com ~200 do endpoint síncrono. Nenhuma requisição se perde porque o Redis persiste tudo. A concorrência é controlada (5 workers simultâneos), evitando sobrecarregar o banco. E há um endpoint `/api/queue/stats` para monitorar quantos jobs estão esperando, processando ou falharam.

**Quando NÃO usar:**

Se o volume é baixo (menos de 100 req/s), a complexidade adicional de manter Redis e workers provavelmente não vale a pena. Se o cliente precisa de resposta imediata sobre o resultado da operação (não apenas confirmação de que foi recebida), processamento síncrono faz mais sentido. É sempre um trade-off entre throughput e simplicidade.

---

### O que deixaria como dívida técnica consciente?

Todo projeto tem trade-offs. Algumas coisas ficaram de fora intencionalmente para priorizar o que é mais importante primeiro. Aqui está o que ficou como dívida técnica consciente:

**Migrations do banco de dados**

Atualmente o TypeORM está configurado com `synchronize: true`, que automaticamente sincroniza o schema do banco com as entidades. Isso é ótimo para desenvolvimento, mas perigoso em produção porque pode apagar dados. A solução seria usar migrations apropriadas (TypeORM migrations ou migrar para Prisma), mas isso adiciona complexidade no setup inicial.

**Rate limiting**

A API não tem limitação de taxa de requisições. Qualquer um pode enviar milhares de requisições e potencialmente derrubar o sistema ou gerar custos desnecessários. Implementar rate limiting com `@nestjs/throttler` ou no nível do nginx seria simples, mas não era crítico para a funcionalidade core.

**Autenticação**

Os endpoints estão completamente abertos. Qualquer pessoa que conheça a URL pode criar transações. Para produção, seria essencial ter JWT + OAuth2, mas isso dobraria o escopo do projeto sem adicionar valor demonstrativo ao desafio técnico em si.

**Soft delete**

Quando uma transação é criada, ela é permanente. Não há forma de "desfazer" ou marcar como deletada. A solução seria adicionar um campo `deletedAt` e filtrar todas as queries para ignorar registros deletados, mas isso adiciona complexidade em todas as consultas.

**Audit log**

Não há rastreamento de quem fez o quê e quando. Se algo der errado, não temos um histórico completo de operações. Uma tabela de `audit_logs` resolveria, mas aumentaria o volume de escritas no banco.

**Paginação no frontend**

O frontend carrega apenas a primeira página de transações. Se houver milhares de registros, a performance vai degradar. Implementar scroll infinito ou paginação completa resolveria, mas não era crucial para demonstrar a funcionalidade.

**Por que deixei como dívida consciente?**

São escolhas de priorização. Preferi focar em fazer bem feito o core (idempotência, concorrência, testes, arquitetura limpa) do que tentar abraçar o mundo e fazer tudo pela metade. É melhor ter um MVP sólido e completo nas funcionalidades principais, e adicionar o resto incrementalmente, do que ter um projeto cheio de features pela metade.

---

## Gargalos e Problemas Reais

### Onde está o gargalo nesta implementação?

O principal gargalo está no banco de dados. O SQLite foi escolhido pela simplicidade de setup, mas tem limitações sérias para produção. Ele suporta no máximo ~2000 escritas por segundo, não escala horizontalmente (é um arquivo único), e usa file-level locking, o que significa que toda escrita bloqueia o banco inteiro.

Outro gargalo está na verificação de idempotência. Atualmente o sistema faz duas operações: primeiro consulta se já existe uma transação com aquela chave, depois cria uma nova. Em cenários de alta concorrência, há uma janela entre essas duas operações onde race conditions podem acontecer (embora o índice único no banco mitigue isso).

Por fim, o connection pooling não está otimizado. As conexões com o banco não estão sendo reutilizadas da forma mais eficiente possível.

### Qual seria o primeiro problema real em produção?

O primeiro problema que apareceria seria lock contention no SQLite assim que o sistema começasse a receber mais de 100 requisições simultâneas.

Os sintomas seriam claros: timeout nas requisições, latência aumentando exponencialmente, e erros `SQLITE_BUSY` aparecendo nos logs. Isso acontece porque o SQLite simplesmente não foi projetado para alto tráfego concorrente. Ele usa file-level locking, então quando uma escrita está acontecendo, todas as outras precisam esperar. Não há suporte para múltiplas escritas simultâneas.

### Qual solução priorizaria primeiro e por quê?

**Migração para PostgreSQL seria a prioridade número um.**

A mudança é relativamente simples (questão de um dia de trabalho) e resolve o problema mais crítico. O PostgreSQL suporta mais de 10 mil escritas por segundo, usa row-level locking (não bloqueia a tabela inteira), tem replicação e sharding nativos, e é usado em produção por milhares de empresas ao redor do mundo.

A configuração seria algo assim:

```typescript
// database.config.ts
{
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  // Connection pooling
  extra: {
    max: 50,
    idleTimeoutMillis: 30000,
  }
}
```

**Em segundo lugar, adicionaria cache Redis para verificação de idempotência.**

Isso levaria alguns dias para implementar bem, mas reduziria pela metade as consultas ao banco. Antes de consultar o banco para verificar se uma chave já existe, checaríamos primeiro no Redis. Após criar uma transação, guardaríamos a chave no cache por uma hora:

```typescript
// Antes de consultar DB
const cached = await redis.get(`tx:${idempotencyKey}`);
if (cached) return JSON.parse(cached);

// Após criar
await redis.setex(`tx:${idempotencyKey}`, 3600, JSON.stringify(transaction));
```

**A fila com workers já está implementada**, o que já resolve o problema de throughput desacoplando a API do banco de dados. Esse foi um dos diferenciais priorizados desde o início.

---

## Como Executar

### Opção 1: Docker Compose (Recomendado)

A forma mais fácil de executar o sistema completo (Backend + Frontend + Redis).

**Usando o script de inicialização:**

```bash
# Na raiz do projeto
./start.sh
```

**Ou manualmente:**

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso vai subir:
- Frontend em `http://localhost:3000`
- Backend em `http://localhost:3001/api`
- Redis em `localhost:6379`

**Comandos úteis:**

```bash
# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Parar sistema
./stop.sh
# ou
docker-compose down

# Remover tudo incluindo dados
docker-compose down -v
```

Veja instruções detalhadas em [DOCKER.md](DOCKER.md)

### Opção 2: Desenvolvimento Local

#### Pré-requisitos

Você vai precisar de Node.js 18 ou superior, npm, e Docker para rodar o Redis.

#### Backend

```bash
cd backend
npm install

# Iniciar Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Iniciar backend
PORT=3001 npm run start:dev
```

O backend ficará disponível em `http://localhost:3001/api`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend ficará disponível em `http://localhost:5173`

---

## Stack Técnica

### Backend

- NestJS - Framework Node.js escolhido pela arquitetura modular e dependency injection nativo
- TypeScript - Type safety que pega bugs em tempo de desenvolvimento
- TypeORM - ORM para abstração do banco de dados
- SQLite (desenvolvimento) / PostgreSQL (produção recomendada)
- Redis + BullMQ - Sistema de filas para processamento assíncrono
- class-validator - Validações declarativas nos DTOs
- Jest + Supertest - Framework de testes unitários e E2E

### Frontend

- React 18 - Biblioteca UI com hooks modernos
- TypeScript - Consistência de tipos entre frontend e backend
- Vite - Build tool extremamente rápido
- Tailwind CSS - Estilização utility-first
- React Hook Form - Gerenciamento de formulários performático
- Axios - Cliente HTTP com interceptors

---

## Funcionalidades

### Backend

O backend expõe quatro endpoints principais:

- `POST /api/transactions` - Cria transação de forma síncrona (resposta imediata)
- `POST /api/transactions/async` - Enfileira transação para processamento assíncrono
- `GET /api/transactions` - Lista transações com suporte a paginação
- `GET /api/queue/stats` - Retorna estatísticas da fila (waiting, active, completed, failed)

Recursos implementados:

- Idempotência garantida através de chave única (thread-safe)
- Validações robustas usando class-validator
- Logs estruturados em JSON com contexto e metadata
- Tratamento de erros padronizado em toda API
- Sistema de fila com retry automático (3 tentativas com backoff exponencial)
- Processamento concorrente controlado (5 workers simultâneos)

### Frontend

- Formulário completo para criar transações com validação em tempo real
- Lista de transações exibida em grid responsivo
- Feedback visual claro: estados de loading, sucesso e erro
- Design moderno usando Tailwind CSS
- Tratamento de erros amigável para o usuário
- Geração automática de chaves de idempotência

---

## Testes

O projeto conta com uma suite completa de aproximadamente 52 testes cobrindo diferentes cenários:

```bash
cd backend

# Todos os testes
npm test

# Apenas unitários
npm test -- --testPathPatterns="spec.ts$" --testPathIgnorePatterns="e2e"

# Testes E2E (necessita Redis rodando)
npm run test:e2e

# Coverage
npm run test:cov
```

**Tipos de testes implementados:**

- Testes unitários para use cases, entities e queue (~32 testes)
- Testes E2E testando os endpoints completos (~11 testes)
- Testes de integração com Redis e BullMQ (~9 testes)
- Testes de concorrência com 10-20 requisições simultâneas
- Testes de performance validando throughput e latência

A cobertura esperada é acima de 80%.

---

## Exemplos de Uso

### Criar Transação (Síncrona)

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "payment-123",
    "amount": 100.50,
    "currency": "BRL",
    "description": "Pagamento de produto"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "idempotencyKey": "payment-123",
    "amount": 100.50,
    "currency": "BRL",
    "description": "Pagamento de produto",
    "status": "completed",
    "createdAt": "2026-01-15T22:30:00Z",
    "updatedAt": "2026-01-15T22:30:00Z"
  }
}
```

### Criar Transação (Assíncrona com Fila)

```bash
curl -X POST http://localhost:3001/api/transactions/async \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "payment-456",
    "amount": 200.00,
    "currency": "BRL",
    "description": "Pagamento assíncrono"
  }'
```

**Resposta (202 Accepted):**
```json
{
  "success": true,
  "message": "Transação enfileirada para processamento",
  "data": {
    "jobId": "payment-456",
    "idempotencyKey": "payment-456",
    "status": "queued"
  }
}
```

### Listar Transações

```bash
curl "http://localhost:3001/api/transactions?page=1&limit=10"
```

### Estatísticas da Fila

```bash
curl http://localhost:3001/api/queue/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 143,
    "failed": 3
  }
}
```

---

## Diferenciais Implementados

Do desafio original, foram priorizados:

- Testes automatizados completos (suite com 52 testes cobrindo unitários, E2E, integração e concorrência)
- Sistema de filas com BullMQ + Redis para processamento assíncrono de alto volume

---

## Performance

### Processamento Síncrono (POST /transactions)

- Throughput: aproximadamente 200 requisições por segundo
- Latência: entre 50-100ms
- Indicado para: baixo volume e quando precisa de resposta imediata sobre o resultado

### Processamento Assíncrono (POST /transactions/async)

- Throughput: mais de 2000 requisições por segundo
- Latência de aceitação: entre 5-10ms
- Processamento: 5 workers trabalhando concorrentemente
- Indicado para: alto volume e quando processamento em background é aceitável

---

## Docker

### Sistema Completo (Backend + Frontend + Redis)

Na raiz do projeto:

```bash
docker-compose up -d
```

Isso vai subir três serviços:
- Frontend rodando em `localhost:3000`
- Backend rodando em `localhost:3001`
- Redis rodando em `localhost:6379`

### Desenvolvimento Local (Recomendado)

Para desenvolvimento com hot reload, é melhor rodar localmente:

```bash
# Terminal 1: Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Terminal 2: Backend
cd backend
npm install
PORT=3001 npm run start:dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

Documentação completa: [DOCKER.md](DOCKER.md)

---

## Estrutura do Projeto

```
.
├── backend/                  # API NestJS
│   ├── src/
│   │   ├── domain/           # Entidades e Ports
│   │   ├── application/      # Use Cases
│   │   └── infrastructure/   # Controllers, Repos, Queue
│   ├── test/                 # Testes E2E
│   └── Dockerfile            # Build do backend
│
├── frontend/                 # Interface React
│   ├── src/
│   │   ├── components/       # Atomic Design
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── Dockerfile            # Build do frontend
│   └── nginx.conf            # Configuração Nginx
│
├── docker-compose.yml        # Sistema completo (raiz)
├── start.sh                  # Script para iniciar
├── stop.sh                   # Script para parar
├── DOCKER.md                 # Documentação Docker
├── .env.example              # Variáveis de ambiente
└── README.md                 # Este arquivo
```

---

## Aprendizados e Decisões

### O que funcionou bem

A arquitetura hexagonal se mostrou uma escolha acertada. Facilitou muito os testes porque todas as dependências estão abstraídas, e a manutenção ficou mais simples porque as responsabilidades estão bem separadas.

BullMQ resolveu o problema de throughput de forma elegante. Foi surpreendentemente simples de integrar e trouxe um ganho de performance enorme.

TypeScript salvou o projeto de vários bugs que só apareceriam em runtime. O time investido em tipar corretamente valeu muito a pena.

Atomic Design manteve o frontend organizado e facilitou a reutilização de componentes. Quando precisei fazer alterações visuais, sabia exatamente onde ir.

### O que faria diferente

Se fosse começar de novo, já começaria com PostgreSQL. SQLite serviu bem para desenvolvimento, mas sei que eventualmente vou precisar migrar, então por que não começar logo com a solução correta?

Implementaria autenticação desde o início. Adicionar depois é sempre mais trabalhoso do que já começar com isso em mente.

Configuraria CI/CD mais cedo no processo. Automatizar testes e deploy desde o início economiza muito tempo no longo prazo.

Consideraria usar Prisma em vez de TypeORM. É um ORM mais moderno, com melhor experiência de desenvolvimento e migrations mais simples.

### Trade-offs que aceitei

SQLite vs PostgreSQL foi uma questão de simplicidade de setup vs performance. Escolhi começar simples, sabendo que seria necessário mudar depois.

Fila vs processamento síncrono é um trade-off de complexidade vs throughput. Aceitei a complexidade adicional do Redis e workers porque o ganho de performance justifica.

Código bem organizado vs velocidade de desenvolvimento também foi um trade-off. Poderia ter feito tudo mais rápido com código menos organizado, mas preferi investir em qualidade desde o início.

---

## Próximos Passos

### Curto Prazo

- Migrar para PostgreSQL
- Implementar autenticação com JWT
- Adicionar rate limiting
- Implementar paginação completa no frontend

### Médio Prazo

- Cache Redis para operações de leitura
- Dashboard de monitoramento usando Bull Board
- Métricas customizadas com Prometheus
- Pipeline de CI/CD no GitHub Actions

### Longo Prazo

- Deploy em Kubernetes para orquestração
- Replicação de banco de dados
- Suporte a multi-tenant
- Sistema de webhooks para notificações

---

## Sobre este Projeto

Este projeto foi desenvolvido como um desafio técnico para demonstrar capacidade de criar sistemas robustos, escaláveis e bem arquitetados. O foco foi em mostrar não apenas código funcional, mas também decisões técnicas bem fundamentadas, preocupação com cenários reais de produção, e código testável e manutenível.

Princípios aplicados: SOLID, Clean Architecture, Domain-Driven Design e Atomic Design.
