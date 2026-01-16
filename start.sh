#!/bin/bash

# Script para iniciar o sistema completo
# ./start.sh

echo "🚀 Iniciando Sistema de Transações..."
echo ""

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker Desktop."
    exit 1
fi

# Verificar se docker-compose existe
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose não encontrado. Por favor, instale o Docker Compose."
    exit 1
fi

echo "✅ Docker está rodando"
echo ""

# Build e start
echo "📦 Construindo e iniciando containers..."
docker-compose up -d --build

echo ""
echo "⏳ Aguardando serviços ficarem saudáveis..."
sleep 5

# Verificar status
echo ""
echo "📊 Status dos serviços:"
docker-compose ps

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001/api"
echo "   Redis:    localhost:6379"
echo ""
