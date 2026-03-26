#!/bin/bash

# Script de Atualização - Vitale Fila de Corretores
# Uso: ./atualizar.sh

echo "🔄 Atualizando Vitale Fila de Corretores..."

# Verificar se estamos em um repositório Git
if [ -d .git ]; then
    echo "📥 Baixando atualizações do Git..."
    git pull
else
    echo "⚠️  Não é um repositório Git. Pulando git pull..."
fi

echo "⏸  Parando containers..."
sudo docker-compose --env-file .env.docker down

echo "🔨 Reconstruindo imagens..."
sudo docker-compose --env-file .env.docker build --no-cache

echo "🚀 Iniciando containers atualizados..."
sudo docker-compose --env-file .env.docker up -d

echo "⏳ Aguardando inicialização..."
sleep 5

echo ""
echo "📊 Status dos containers:"
sudo docker-compose ps

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "📋 Ver logs: sudo docker-compose logs -f"
