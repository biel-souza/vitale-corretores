# 🏢 Vitale - Sistema de Fila de Corretores

Sistema completo para gerenciamento de fila de corretores integrado com N8N.

## 📋 Funcionalidades

- ✅ Cadastro de corretores (nome e telefone)
- 📊 Sistema de fila baseado em data do último atendimento
- 🔄 Rota automática para N8N buscar próximo corretor
- 👥 Gerenciamento de corretores (ativar/desativar)
- 📱 Interface web responsiva e moderna
- 🎨 Design clean e intuitivo

## 🚀 Como Instalar

### 1. Pré-requisitos

- Node.js (versão 14 ou superior) - para desenvolvimento local
- PostgreSQL instalado e rodando (banco externo)
- Docker e Docker Compose - para produção
- npm ou yarn

### 2. Instalar dependências (desenvolvimento local)

```bash
npm install
```

### 3. Configurar Banco de Dados

#### Criar banco de dados no PostgreSQL:

```sql
-- Conectar ao PostgreSQL
CREATE DATABASE vitale_corretores;

-- Opcional: Criar usuário dedicado
CREATE USER vitale_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE vitale_corretores TO vitale_user;
```

Edite o arquivo `.env` com suas credenciais do PostgreSQL **local**:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=vitale_corretores
```

#### Para produção com Docker (.env.docker):

Veja instruções completas em [POSTGRESQL.md](POSTGRESQL.md)

```bash
cp .env.docker.example .env.docker
nano .env.docker
# Configure com credenciais do seu PostgreSQL
```

### 4. Iniciar o Servidor (Desenvolvimento Local)

DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=vitale_corretores

````

### 4. Iniciar o Servidor

```bash
npm start
````

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

O servidor estará rodando em: **http://localhost:3000**

A tabela `corretores` será criada automaticamente na primeira execução! ✨

## 📡 API Endpoints

### 1. Cadastrar Corretor

```
POST /api/corretores
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "(11) 98765-4321"
}
```

### 2. Listar Corretores

```
GET /api/corretores
```

### 3. Obter Próximo Corretor da Fila (para N8N)

```
GET /api/fila/proximo
```

**Resposta:**

```json
{
  "id": 1,
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "mensagem": "Próximo corretor da fila"
}
```

**IMPORTANTE:** Esta rota automaticamente atualiza o campo `ultimo_imovel` do corretor para a data/hora atual, colocando-o no final da fila.

### 4. Ver Status da Fila

```
GET /api/fila/status
```

### 5. Atualizar Corretor

```
PUT /api/corretores/:id
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "ativo": true
}
```

### 6. Desativar Corretor

```
DELETE /api/corretores/:id
```

## 🔗 Integração com N8N

Para integrar com o N8N, use um nó HTTP Request:

**Configuração:**

- Method: GET
- URL: `http://localhost:3000/api/fila/proximo`

O N8N receberá:

```json
{
  "id": 1,
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "mensagem": "Próximo corretor da fila"
}
```

Use `{{ $json.telefone }}` para acessar o telefone do corretor na mensagem.

## 🎯 Lógica da Fila

A fila funciona da seguinte forma:

1. **Prioridade:** Corretores que nunca atenderam têm prioridade
2. **Ordem:** Depois, ordem crescente pela data do `ultimo_imovel`
3. **Auto-atualização:** Ao chamar `/api/fila/proximo`, o corretor vai para o final da fila automaticamente

## 📁 Estrutura do Projeto

```
vitale-fila-corretor/
│
├── public/                 # Frontend
│   ├── index.html         # Interface principal
│   ├── styles.css         # Estilos
│   └── script.js          # Lógica do frontend
│
├── server.js              # Servidor Express e rotas API
├── database.js            # Configuração do PostgreSQL
├── package.json           # Dependências
├── .env                   # Configurações (não versionar)
└── README.md             # Este arquivo
```

## 🗄️ Estrutura da Tabela

```sql
CREATE TABLE corretores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  ultimo_imovel TIMESTAMP DEFAULT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 💡 Dicas de Uso

1. **Cadastro Inicial:** Cadastre todos os corretores antes de começar a usar
2. **Desativar Corretores:** Use para pausar corretores temporariamente (férias, licença)
3. **Monitorar Fila:** Acesse a interface web para ver a ordem da fila em tempo real
4. **N8N:** Configure um webhook ou cron job no N8N para distribuir imóveis automaticamente

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)

### ⚠️ Importante: PostgreSQL Externo

Este projeto está configurado para usar um **PostgreSQL já existente** (externo ao Docker).

Antes de fazer o deploy, certifique-se de que:

- ✅ PostgreSQL está instalado e rodando
- ✅ Banco de dados `vitale_corretores` foi criado
- ✅ Você tem usuário e senha com permissões no banco

📖 **Guia completo:** [POSTGRESQL.md](POSTGRESQL.md)

## 📝 Notas

- O servidor cria a tabela automaticamente na primeira execução
- Corretores desativados não aparecem na fila
- A interface atualiza em tempo real
- Todos os horários são do servidor

## � Deploy no Servidor Ubuntu com Docker

### Pré-requisitos no Servidor

1. **Instalar Docker e Docker Compose:**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y

# Verificar instalação
docker --version
docker-compose --version
```

2. **Instalar Nginx (para configurar domínio):**

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Passo 1: Enviar Código para o Servidor

**Opção A - Via Git (recomendado):**

```bash
# No servidor do PostgreSQL EXTERNO
cp .env.docker.example .env.docker
nano .env.docker

# Configure com as credenciais do seu PostgreSQL:
# DB_HOST=localhost (ou IP do servidor PostgreSQL)
# DB_PORT=5432
# DB_USER=seu_usuario_do_postgres
# DB_PASSWORD=sua_senha_do_postgres
# DB_NAME=vitale_corretores

# Salvar: Ctrl+O, Enter, Ctrl+X

# Proteger arquivo de credenciais
chmod 600 .env.docker

# ANTES DE CONTINUAR: Verifique se o banco existe
# psql -U seu_usuario -c "CREATE DATABASE vitale_corretores;"

# Construir e iniciar containers
sudo docker-compose --env-file .env.docker up -d

# Verificar se está rodando
sudo docker-compose ps

# Ver logs
sudo docker-compose logs -f app
```

**📖 Problemas com PostgreSQL?** Veja o guia completo: [POSTGRESQL.md](POSTGRESQL.md)

**ℹ️ Nota:** O Docker agora roda apenas a aplicação. O PostgreSQL usado é **externo** (seu banco já existente)
cp .env.docker.example .env.docker
nano .env.docker

# Altere DB_PASSWORD para uma senha forte!

# Gerar senha: openssl rand -base64 32

# Proteger arquivo de credenciais

chmod 600 .env.docker

# Construir e iniciar containers

sudo docker-compose --env-file .env.docker up -d

# Verificar se está rodando

sudo docker-compose ps

# Ver logs

sudo docker-compose logs -f app

````

**ℹ️ Nota de Segurança:** O [docker-compose.yml](docker-compose.yml) agora usa variáveis de ambiente do arquivo `.env.docker` para proteger suas credenciais. Nunca commite este arquivo no Git! Veja [SECURITY.md](SECURITY.md) para mais detalhes.

**Pronto!** A aplicação estará rodando em `http://seu-servidor-ip:3000`

### Passo 3: Configurar Domínio com Nginx

#### 3.1. Configurar DNS

No seu provedor de domínio (Registro.br, GoDaddy, etc):

- Crie um registro **A** apontando para o IP do seu servidor
- Exemplo: `corretores.vitale.com.br` → `123.456.789.0`

#### 3.2. Configurar Nginx

```bash
# Copiar arquivo de configuração
sudo cp nginx.conf /etc/nginx/sites-available/vitale-corretores

# Editar com seu domínio
sudo nano /etc/nginx/sites-available/vitale-corretores
# Trocar "seu-dominio.com.br" pelo seu domínio real

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/vitale-corretores /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
````

Agora acesse: `http://seu-dominio.com.br` 🎉

#### 3.3. Configurar SSL/HTTPS com Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Seguir instruções do Certbot
# Escolha opção 2 para redirecionar HTTP para HTTPS

# Renovação automática já está configurada!
# Testar renovação:
sudo certbot renew --dry-run
```

Pronto! Agora você tem **HTTPS** configurado! 🔒

Acesse: `https://seu-dominio.com.br`

### Comandos Úteis Docker

**⚠️ IMPORTANTE:** Todos os comandos docker-compose devem usar `--env-file .env.docker` para carregar as credenciais corretas.

````bash
# Ver containers rodando
sudo docker-compose ps

# Ver logs em tempo real
sudo docker-compose --env-file .env.docker logs -f

# Reiniciar aplicação
sudo docker-compose --env-file .env.docker restart app

# Parar tudo
sudo docker-compose --env-file .env.docker down

# Parar e remover volumes (CUIDADO: apaga banco de dados)
sudo docker-compose --env-file .env.docker down -v

**Se estiver usando PostgreSQL externo:**

```bash
# Criar backup
pg_dump -U vitale_user vitale_corretores > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U vitale_user vitale_corretores < backup_20240326.sql
````

**Automatizar com script:**

```bash
# O script backup.sh está configurado para backup do PostgreSQL externo
./backup.sh
# Ver banco de dados
sudo docker exec -it vitale-postgres psql -U vitale_user -d vitale_corretores
```

**💡 Dica:** Use os scripts automatizados que já incluem o --env-file:

- `./deploy.sh` - Deploy completo
- `./atualizar.sh` - Atualizar aplicação
- `./backup.sh` - Backup do banco

### Atualizar Aplicação (após mudanças no código)

```bash
# Opção 1: Usar script automatizado (RECOMENDADO)
./atualizar.sh

# Opção 2: Manual
sudo docker-compose --env-file .env.docker down
git pull  # se usando Git
sudo docker-compose --env-file .env.docker up -d --build
sudo docker-compose --env-file .env.docker logs -f app
```

### Backup do Banco de Dados

```bash
# Criar backup
sudo docker exec vitale-postgres pg_dump -U vitale_user vitale_corretores > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20240326.sql | sudo docker exec -i vitale-postgres psql -U vitale_user vitale_corretores
```

### Configurar Firewall

```bash
# Permitir portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verificar status
sudo ufw status
```

### Integração N8N com URL

Após configurar o domínio, use no N8N:

```
https://seu-dominio.com.br/api/fila/proximo
```

Ao invés de:

```
http://localhost:3000/api/fila/proximo
```

## �🐛 Troubleshooting

### Desenvolvimento Local

**Erro de conexão com banco:**

- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Certifique-se que o banco de dados existe

**Porta 3000 já em uso:**

- Altere a porta no arquivo `.env`
- Ou mate o processo: `lsof -ti:3000 | xargs kill -9`

### Docker

**Container não inicia:**

```bash
# Ver logs detalhados
sudo docker-compose --env-file .env.docker logs app
sudo docker-compose --env-file .env.docker logs postgres
```

**Erro de conexão entre containers:**

- Verifique se o PostgreSQL está saudável: `sudo docker-compose ps`
- Aguarde alguns segundos para o banco inicializar completamente
- Reinicie: `sudo docker-compose --env-file .env.docker restart app`

**Aplicação não atualiza após mudanças:**

```bash
# Reconstruir imagem
sudo docker-compose --env-file .env.docker up -d --build --force-recreate
```

**Resetar tudo (CUIDADO - apaga dados):**

```bash
sudo docker-compose --env-file .env.docker down -v
./deploy.sh
```

### Nginx/Domínio

**Erro 502 Bad Gateway:**

- Verifique se a aplicação está rodando: `sudo docker-compose ps`
- Teste a aplicação localmente: `curl http://localhost:3000`
- Verifique logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

**Domínio não resolve:**

- Aguarde propagação DNS (pode levar até 48h)
- Teste com: `nslookup seu-dominio.com.br`
- Verifique configuração no provedor de domínio

## 📞 Suporte

Para dúvidas ou problemas, verifique os logs do servidor no terminal.

---

**Desenvolvido para Vitale Imóveis** 🏢
