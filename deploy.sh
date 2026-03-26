#!/bin/bash

# Script de Deploy Rápido - Vitale Fila de Corretores
# Uso: ./deploy.sh

echo "🚀 Iniciando deploy do Vitale Fila de Corretores..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo "Instale com: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado!"
    echo "Instale com: sudo apt install docker-compose -y"
    exit 1
fi

echo "✅ Docker está instalado"
echo "✅ Docker Compose está instalado"
echo ""

# Verificar se arquivo .env.docker existe
if [ ! -f .env.docker ]; then
    echo "❌ Arquivo .env.docker não encontrado!"
    echo "📝 Você precisa criar o arquivo .env.docker com as credenciais do PostgreSQL"
    echo ""
    echo "Execute:"
    echo "  cp .env.docker.example .env.docker"
    echo "  nano .env.docker"
    echo ""
    echo "Configure:"
    echo "  DB_HOST - IP ou hostname do PostgreSQL (ex: localhost ou 192.168.1.100)"
    echo "  DB_PORT - Porta do PostgreSQL (padrão: 5432)"
    echo "  DB_USER - Usuário do PostgreSQL"
    echo "  DB_PASSWORD - Senha do PostgreSQL"
    echo "  DB_NAME - Nome do banco (ex: vitale_corretores)"
    echo ""
    echo "⚠️  IMPORTANTE: Crie o banco antes de continuar!"
    echo "  psql -U seu_usuario -c 'CREATE DATABASE vitale_corretores;'"
    echo ""
    exit 1
fi

# Parar containers antigos se existirem
echo "⏸  Parando containers antigos..."
sudo docker-compose down 2>/dev/null

# Construir e iniciar
echo "🔨 Construindo imagens..."
sudo docker-compose --env-file .env.docker build

echo "🚀 Iniciando containers..."
sudo docker-compose --env-file .env.docker up -d

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 5

# Verificar status
echo ""
echo "📊 Status dos containers:"
sudo docker-compose ps

echo ""
echo "📋 Logs da aplicação:"
sudo docker-compose logs app | tail -n 20

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📱 Acesse a aplicação em:"
echo "   - Local: http://localhost:3000"
echo "   - Servidor: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "📝 Comandos úteis:"
echo "   - Ver logs: sudo docker-compose logs -f"
echo "   - Parar: sudo docker-compose down"
echo "   - Reiniciar: sudo docker-compose restart"
echo ""
