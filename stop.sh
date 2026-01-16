#!/bin/bash

# Script para parar o sistema
# ./stop.sh

echo "🛑 Parando Sistema de Transações..."
echo ""

docker-compose down

echo ""
echo "✅ Sistema parado com sucesso!"
echo ""
echo "💡 Para remover também os volumes (dados do Redis):"
echo "   docker-compose down -v"
echo ""
