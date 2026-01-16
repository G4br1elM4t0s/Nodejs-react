# Multi-stage build para otimizar imagem final

# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar apenas arquivos de dependências primeiro (cache layer)
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Aceitar variável de ambiente durante o build
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

# Build da aplicação
RUN npm run build

# Estágio 2: Produção com Nginx
FROM nginx:alpine

# Copiar build do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1

# Nginx roda em foreground
CMD ["nginx", "-g", "daemon off;"]
