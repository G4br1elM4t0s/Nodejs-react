# Multi-stage build para otimizar tamanho da imagem final

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY src ./src

# Build da aplicação
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar build do stage anterior
COPY --from=builder /app/dist ./dist

# Mudar ownership para usuário não-root
RUN chown -R nestjs:nodejs /app

USER nestjs

# Expor porta
EXPOSE 3001

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"]
