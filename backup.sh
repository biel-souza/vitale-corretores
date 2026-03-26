#!/bin/bash

# Script de Backup Automático - Vitale Fila de Corretores
# Configurado para PostgreSQL EXTERNO (não Docker)
# Uso: ./backup.sh

# Carregar variáveis de ambiente
if [ -f .env.docker ]; then
    export $(cat .env.docker | grep -v '^#' | xargs)
else
    echo "❌ Arquivo .env.docker não encontrado!"
    echo "Configure as credenciais do PostgreSQL primeiro."
    exit 1
fi

# Criar diretório de backups se não existir
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Nome do arquivo com data e hora
BACKUP_FILE="$BACKUP_DIR/vitale_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "💾 Criando backup do banco de dados PostgreSQL..."
echo "📁 Arquivo: $BACKUP_FILE"
echo "🗄️  Banco: $DB_NAME@$DB_HOST:$DB_PORT"

# Criar backup usando pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > $BACKUP_FILE

# Verificar se backup foi criado
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    # Obter tamanho do arquivo
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup criado com sucesso! ($SIZE)"
    
    # Comprimir backup
    echo "📦 Comprimindo backup..."
    gzip $BACKUP_FILE
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    echo "✅ Backup comprimido! ($COMPRESSED_SIZE)"
    
    # Remover backups com mais de 30 dias
    echo "🧹 Limpando backups antigos (>30 dias)..."
    find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
    
    echo ""
    echo "📊 Backups disponíveis:"
    ls -lh $BACKUP_DIR
    
else
    echo "❌ Erro ao criar backup!"
    echo "Verifique:"
    echo "  - PostgreSQL está rodando"
    echo "  - Credenciais em .env.docker estão corretas"
    echo "  - pg_dump está instalado (sudo apt install postgresql-client)"
    exit 1
fi

echo ""
echo "✅ Processo de backup concluído!"
echo ""
echo "💡 Para restaurar:"
echo "   gunzip $BACKUP_FILE.gz"
echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME < ${BACKUP_FILE}"

