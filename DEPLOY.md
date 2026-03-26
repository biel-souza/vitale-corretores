# 🚀 Guia Rápido de Deploy no Ubuntu com Docker

## ⚡ Deploy em 3 Passos

### ⚠️ Requisito: PostgreSQL Externo

Este projeto requer um **PostgreSQL já instalado e rodando**. Veja [POSTGRESQL.md](POSTGRESQL.md) para configuração completa.

### 1️⃣ Preparar o Servidor

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y

# Instalar Nginx (para domínio)
sudo apt install nginx -y

# Verificar PostgreSQL
psql --version
sudo systemctl status postgresql
```

### 2️⃣ Subir a Aplicação

```bash
# Clonar/Enviar código para o servidor
cd /home/seu-usuario
# (cole seus arquivos aqui)

# IMPORTANTE: Criar banco no PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE vitale_corretores;"

# Configurar credenciais do PostgreSQL EXTERNO
cp .env.docker.example .env.docker
nano .env.docker
# Configure: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# Salve: Ctrl+O, Enter, Ctrl+X

# Proteger arquivo de credenciais
chmod 600 .env.docker

# Executar script de deploy
chmod +x deploy.sh
./deploy.sh
```

**Pronto!** Aplicação rodando em `http://seu-ip:3000` 🎉

**📖 Problemas com PostgreSQL?** Veja [POSTGRESQL.md](POSTGRESQL.md)

**🔒 Segurança:** O Docker roda apenas a aplicação. O PostgreSQL é seu banco externo já existente.

### 3️⃣ Configurar Domínio (Opcional)

```bash
# 1. Configurar DNS no seu provedor
#    Criar registro A: seu-dominio.com.br → IP do servidor

# 2. Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/vitale
sudo nano /etc/nginx/sites-available/vitale
# Trocar "seu-dominio.com.br" pelo seu domínio

sudo ln -s /etc/nginx/sites-available/vitale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 3. Instalar SSL (HTTPS)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com.br
```

**Pronto!** Acesse `https://seu-dominio.com.br` 🔒

---

## 📋 Comandos Úteis

```bash
# Ver status
sudo docker-compose ps

# Ver logs
sudo docker-compose logs -f app

# Reiniciar
sudo docker-compose restart

# Parar tudo
sudo docker-compose down

# Atualizar aplicação
./atualizar.sh
```

---

## 🔗 URLs da Aplicação

Depois de configurado, use estas URLs:

- **Interface Web:** `https://seu-dominio.com.br`
- **API para N8N:** `https://seu-dominio.com.br/api/fila/proximo`

---

## 🆘 Problemas?

```bash
# Container não inicia?
sudo docker-compose logs app

# Resetar tudo
sudo docker-compose down -v
./deploy.sh

# Nginx dando erro?
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## ⚙️ Configurações Importantes

### Alterar Senha do Banco (RECOMENDADO para produção)

Edite o arquivo `docker-compose.yml`:

```yaml
environment:
  POSTGRES_PASSWORD: SUA_SENHA_FORTE_AQUI
```

E também:

```yaml
app:
  environment:
    DB_PASSWORD: SUA_SENHA_FORTE_AQUI
```

Depois:

```bash
sudo docker-compose down -v
./deploy.sh
```

(PostgreSQL externo)
./backup.sh

# Ou manualmente

pg_dump -U vitale_user vitale_corretores > backup.sql

```bash
# Backup
sudo docker exec vitale-postgres pg_dump -U vitale_user vitale_corretores > backup.sql

# Restaurar
cat backup.sql | sudo docker exec -i vitale-postgres psql -U vitale_user vitale_corretores
```

---

## 🔥 Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

**Dúvidas?** Consulte o [README.md](README.md) completo!
