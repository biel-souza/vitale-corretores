# 🔒 Guia de Segurança - Vitale Fila de Corretores

## ⚠️ Importante: Protegendo Suas Credenciais

Este projeto agora usa variáveis de ambiente para proteger informações sensíveis como senhas do banco de dados.

## 📁 Arquivos de Configuração

### Arquivos que devem ser commitados no Git:

- ✅ `.env.example` - Template sem credenciais reais
- ✅ `docker-compose.yml` - Usa variáveis de ambiente
- ✅ `SECURITY.md` - Este arquivo

### Arquivos que NÃO devem ser commitados (já estão no .gitignore):

- ❌ `.env` - Desenvolvimento local
- ❌ `.env.docker` - Produção com Docker
- ❌ `.env.production` - Produção

## 🚀 Configuração no Servidor

### Primeira Vez (Deploy Inicial)

O script `deploy.sh` automaticamente:

1. Verifica se `.env.docker` existe
2. Se não existir, cria um com senha aleatória forte
3. Usa esse arquivo para subir os containers

```bash
./deploy.sh
```

### Configuração Manual (Recomendado para Produção)

Se preferir definir suas próprias credenciais:

```bash
# 1. Criar arquivo .env.docker
nano .env.docker
```

Cole este conteúdo e **altere a senha**:

```env
# Configuração para Docker Compose
PORT=3000
DB_USER=vitale_user
DB_PASSWORD=SuaSenhaMuitoForteAqui123!@#
DB_NAME=vitale_corretores
DB_PORT=5432
```

```bash
# 2. Proteger o arquivo (somente usuário pode ler)
chmod 600 .env.docker

# 3. Fazer deploy
./deploy.sh
```

## 🔐 Boas Práticas de Segurança

### 1. Senhas Fortes

```bash
# Gerar senha aleatória forte
openssl rand -base64 32
```

### 2. Permissões de Arquivos

```bash
# Proteger arquivos de ambiente
chmod 600 .env.docker
chmod 600 .env
```

### 3. Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 5432   # PostgreSQL (bloquear acesso externo)
sudo ufw deny 3000   # App direta (usar apenas via Nginx)
sudo ufw enable
```

### 4. SSH com Chave (não senha)

```bash
# Desabilitar login por senha no SSH
sudo nano /etc/ssh/sshd_config
# Adicionar:
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart sshd
```

### 5. Atualizar Senhas Regularmente

```bash
# 1. Editar .env.docker com nova senha
nano .env.docker

# 2. Recriar banco com nova senha
sudo docker-compose down -v
./deploy.sh
```

## 🛡️ Proteção de Dados

### Backup Seguro

```bash
# Criar backup
./backup.sh

# Criptografar backup
gpg -c backups/vitale_backup_20240326.sql.gz
# Digite uma senha forte

# Agora você tem:
# vitale_backup_20240326.sql.gz.gpg (criptografado)
# Pode deletar o .gz original
```

### Restaurar Backup Criptografado

```bash
# Descriptografar
gpg -d backups/vitale_backup_20240326.sql.gz.gpg > backup_temp.sql.gz

# Descomprimir
gunzip backup_temp.sql.gz

# Restaurar
cat backup_temp.sql | sudo docker exec -i vitale-postgres psql -U vitale_user vitale_corretores

# Deletar arquivo temporário
rm backup_temp.sql
```

## 📊 Checklist de Segurança

Antes de colocar em produção, verifique:

- [ ] `.env.docker` criado com senha forte
- [ ] `.env.docker` tem permissão 600 (chmod 600)
- [ ] `.env.docker` está no .gitignore
- [ ] Firewall configurado (ufw)
- [ ] SSH com chave (não senha)
- [ ] Nginx configurado com SSL/HTTPS
- [ ] Senhas alteradas dos valores padrão
- [ ] Backups automatizados configurados
- [ ] Acesso ao PostgreSQL bloqueado externamente

## 🚨 O Que Fazer se Expor Credenciais

Se você acidentalmente commitou `.env.docker` no Git:

```bash
# 1. Remover do histórico do Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.docker" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Forçar push
git push origin --force --all

# 3. IMPORTANTE: Alterar TODAS as senhas imediatamente
nano .env.docker  # nova senha
sudo docker-compose down -v
./deploy.sh
```

## 📞 Dúvidas sobre Segurança?

- Nunca compartilhe arquivos `.env*` por email/chat
- Use gerenciadores de senhas (1Password, Bitwarden)
- Mantenha logs de quem tem acesso ao servidor
- Faça backups criptografados regularmente

---

**Segurança é responsabilidade de todos! 🔒**
