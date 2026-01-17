# Manual de Instalação - Lab-LIMS

## 📋 Pré-requisitos

### Obrigatórios
- **Node.js** versão 18 ou superior ([Download](https://nodejs.org/))
- **npm** (vem com Node.js)
- **Git** (opcional, para clonar o repositório)

### Sistema Operacional
- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, etc.)
- ✅ macOS

## 🚀 Instalação Passo a Passo

### 1. Copiar o Projeto

**Opção A: Via Git**
```bash
git clone <url-do-repositorio>
cd Lab-LIMS
```

**Opção B: Download Manual**
1. Baixe e extraia o ZIP do projeto
2. Abra o terminal na pasta `Lab-LIMS`

### 2. Instalar Backend

```bash
cd backend
npm install
```

**Dependências instaladas:**
- express
- cors
- better-sqlite3
- bcrypt
- jsonwebtoken

### 3. Instalar Frontend

```bash
cd ../frontend
npm install
```

**Dependências instaladas:**
- react
- react-router-dom
- lucide-react
- qrcode.react

### 4. Configurar Ambiente (Opcional)

Crie um arquivo `.env` na pasta `backend`:

```env
PORT=3001
JWT_SECRET=sua-chave-secreta-super-segura-aqui
```

> ⚠️ **Importante:** Em produção, use uma chave JWT forte e única!

### 5. Iniciar Backend

```bash
cd backend
node app.js
```

Você verá:
```
✅ Migração de banco concluída
🔑 ======================================
   PRIMEIRO ACESSO - Usuário Admin Criado
🔑 ======================================
   Email:    admin@lab.com
   Senha:    admin123
   ⚠️  TROQUE A SENHA APÓS PRIMEIRO LOGIN
========================================
✅ Backend (Híbrido) rodando em http://localhost:3001
```

### 6. Iniciar Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

Você verá:
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

### 7. Acessar o Sistema

1. Abra o navegador em: **http://localhost:5173**
2. Faça login com:
   - **Email:** `admin@lab.com`
   - **Senha:** `admin123`
3. **Troque a senha imediatamente!** (Clique no ícone de chave 🔑)

## 🏭 Instalação em Produção

### Opção 1: Servidor Local (Windows/Linux)

#### Backend como Serviço (Windows)

Usando **NSSM** (Non-Sucking Service Manager):

```powershell
# 1. Download NSSM
# https://nssm.cc/download

# 2. Instalar serviço
nssm install LabLIMS-Backend "C:\Program Files\nodejs\node.exe"
nssm set LabLIMS-Backend AppDirectory "C:\caminho\Lab-LIMS\backend"
nssm set LabLIMS-Backend AppParameters "app.js"
nssm start LabLIMS-Backend
```

#### Backend como Serviço (Linux)

Crie `/etc/systemd/system/lablims-backend.service`:

```ini
[Unit]
Description=Lab-LIMS Backend
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/Lab-LIMS/backend
ExecStart=/usr/bin/node app.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable lablims-backend
sudo systemctl start lablims-backend
```

#### Frontend (Build de Produção)

```bash
cd frontend
npm run build
```

Servir a pasta `dist/` com **nginx** ou **Apache**.

**Nginx - exemplo de configuração:**

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        root /caminho/Lab-LIMS/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opção 2: Docker (Recomendado para Produção)

Crie `Dockerfile` na raiz:

```dockerfile
# Backend
FROM node:18-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./

# Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Final
FROM node:18-alpine
WORKDIR /app
COPY --from=backend /app/backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
WORKDIR /app/backend

EXPOSE 3001
CMD ["node", "app.js"]
```

Crie `docker-compose.yml`:

```yaml
version: '3.8'
services:
  lablims:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/backend/lims.db
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

Executar:

```bash
docker-compose up -d
```

## 🔐 Segurança em Produção

### 1. Variáveis de Ambiente

```env
JWT_SECRET=gere-uma-chave-forte-com-openssl-rand-base64-32
NODE_ENV=production
```

### 2. HTTPS (Obrigatório)

Use **Let's Encrypt** com **Certbot**:

```bash
sudo certbot --nginx -d seu-dominio.com
```

### 3. Firewall

```bash
# Linux (UFW)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 4. Backup Automático

Script de backup do banco de dados:

```bash
#!/bin/bash
BACKUP_DIR="/backups/lablims"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /caminho/Lab-LIMS/backend/lims.db "$BACKUP_DIR/lims_$DATE.db"

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "lims_*.db" -mtime +30 -delete
```

Adicionar ao **crontab** (diariamente às 2h):

```bash
0 2 * * * /caminho/backup-script.sh
```

## 📂 Estrutura de Arquivos

```
Lab-LIMS/
├── backend/
│   ├── app.js              # Servidor principal
│   ├── lims.db             # Banco de dados SQLite
│   ├── package.json
│   ├── middleware/         # Autenticação
│   ├── routes/             # Rotas API
│   └── utils/              # Utilitários
├── frontend/
│   ├── src/
│   │   ├── pages/          # Páginas
│   │   ├── components/     # Componentes
│   │   ├── contexts/       # Contextos React
│   │   └── config/         # Configurações
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🔧 Solução de Problemas

### Backend não inicia

```bash
# Verificar porta em uso
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# Matar processo
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Linux/Mac
```

### Frontend não conecta ao Backend

Verifique `frontend/src/services/api.ts`:

```typescript
export const endpoints = {
  amostras: 'http://localhost:3001/amostras',
  // ...
};
```

Em produção, altere para o domínio real.

### Banco de dados corrompido

```bash
# Backup
cp lims.db lims.db.backup

# Verificar integridade
sqlite3 lims.db "PRAGMA integrity_check;"

# Se necessário, reconstruir
rm lims.db
node app.js  # Recria automaticamente
```

## 📞 Suporte

- **Logs do Backend:** Terminal onde `node app.js` está rodando
- **Logs do Frontend:** Console do navegador (F12)
- **Banco de Dados:** `backend/lims.db` (pode ser aberto com [DB Browser for SQLite](https://sqlitebrowser.org/))

## 🎓 Primeiros Passos Após Instalação

1. ✅ Login como admin
2. ✅ Trocar senha padrão
3. ✅ Criar usuários Professor e Técnico
4. ✅ Configurar matrizes analíticas em `frontend/src/config/labConfig.ts`
5. ✅ Criar primeira amostra de teste
6. ✅ Imprimir etiqueta de teste

## 📊 Especificações do Sistema

- **Backend:** Node.js + Express + SQLite
- **Frontend:** React + TypeScript + Vite
- **Autenticação:** JWT + bcrypt
- **Banco:** SQLite (arquivo único, fácil backup)
- **Portas:** 3001 (backend), 5173 (dev frontend)

---

**Versão:** 1.0.0  
**Última atualização:** 2026-01-05
