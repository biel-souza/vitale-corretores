# 🗄️ Configuração do PostgreSQL Externo

Este projeto agora está configurado para usar um PostgreSQL **externo** já existente, ao invés de criar um novo container.

## 📋 Pré-requisitos

Você precisa ter:

- PostgreSQL instalado e rodando no servidor
- Usuário e senha do PostgreSQL
- Criar um banco de dados para a aplicação

## 🚀 Configuração Rápida

### 1️⃣ Criar Banco de Dados

Se ainda não criou, conecte ao PostgreSQL e crie o banco:

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE vitale_corretores;

# Criar usuário (opcional, se não tiver um)
CREATE USER vitale_user WITH PASSWORD 'sua_senha_aqui';

# Dar permissões
GRANT ALL PRIVILEGES ON DATABASE vitale_corretores TO vitale_user;

# Sair
\q
```

### 2️⃣ Configurar Credenciais

Crie o arquivo `.env.docker` com as credenciais do seu PostgreSQL:

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Configure:

```env
PORT=3000

# ALTERE com os dados do SEU PostgreSQL
DB_HOST=localhost           # ou IP do servidor PostgreSQL
DB_PORT=5432               # porta do PostgreSQL
DB_USER=vitale_user        # seu usuário
DB_PASSWORD=sua_senha      # sua senha
DB_NAME=vitale_corretores  # nome do banco criado
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

### 3️⃣ Proteger Credenciais

```bash
chmod 600 .env.docker
```

### 4️⃣ Deploy

```bash
./deploy.sh
```

Pronto! A aplicação vai conectar no seu PostgreSQL existente! 🎉

## 🌐 Casos de Uso Comuns

### PostgreSQL no mesmo servidor (localhost)

```env
DB_HOST=localhost
DB_PORT=5432
```

### PostgreSQL em outro servidor

```env
DB_HOST=192.168.1.100  # IP do servidor PostgreSQL
DB_PORT=5432
```

### PostgreSQL em servidor cloud (AWS RDS, etc)

```env
DB_HOST=meu-banco.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
```

## 🔧 Testar Conexão

Antes de fazer o deploy, teste se consegue conectar:

```bash
# Do servidor da aplicação, tente conectar ao PostgreSQL
psql -h localhost -U vitale_user -d vitale_corretores

# Ou com host remoto
psql -h 192.168.1.100 -U vitale_user -d vitale_corretores
```

Se conectar com sucesso, está tudo certo! ✅

## 🔥 Firewall

Se o PostgreSQL está em outro servidor, libere a porta:

**No servidor do PostgreSQL:**

```bash
# Liberar porta 5432
sudo ufw allow from IP_DO_SERVIDOR_APP to any port 5432
```

**Arquivo pg_hba.conf:**

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Adicione (substitua o IP):

```
host    vitale_corretores    vitale_user    192.168.1.0/24    md5
```

**Arquivo postgresql.conf:**

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Encontre e altere:

```
listen_addresses = '*'
```

Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## 📝 Notas Importantes

- ✅ A tabela `corretores` será criada **automaticamente** na primeira execução
- ✅ O banco `vitale_corretores` precisa existir ANTES de rodar a aplicação
- ✅ O usuário precisa ter permissões para criar tabelas
- ✅ Use `network_mode: host` no docker-compose (já configurado)

## 🐛 Troubleshooting

**Erro: "ECONNREFUSED"**

- Verifique se PostgreSQL está rodando: `sudo systemctl status postgresql`
- Verifique DB_HOST e DB_PORT no .env.docker

**Erro: "password authentication failed"**

- Verifique DB_USER e DB_PASSWORD no .env.docker
- Verifique pg_hba.conf

**Erro: "database does not exist"**

- Crie o banco: `CREATE DATABASE vitale_corretores;`

**Não consegue conectar de outro servidor**

- Verifique firewall (ufw)
- Verifique postgresql.conf (listen_addresses)
- Verifique pg_hba.conf (host permitido)

---

**Tudo configurado? Execute:** `./deploy.sh` 🚀
