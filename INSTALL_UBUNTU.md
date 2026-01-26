# 🐧 Instalação do Lab-LIMS em Ubuntu Server

Guia completo para implantar o Lab-LIMS em um servidor Ubuntu (20.04 LTS ou superior).

---

## 📋 Requisitos

- Ubuntu Server 20.04 LTS ou superior
- Acesso root ou sudo
- Mínimo 1GB RAM / 10GB disco
- Porta 80 (HTTP) e 443 (HTTPS) liberadas

---

## 🚀 Instalação Passo a Passo

### 1. Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js 20 LTS

```bash
# Adiciona repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instala Node.js
sudo apt install -y nodejs

# Verifica instalação
node --version  # Deve mostrar v20.x.x
npm --version
```

### 3. Instalar Dependências do Sistema

```bash
# Git e build tools
sudo apt install -y git build-essential

# PM2 para gerenciar processos
sudo npm install -g pm2
```

### 4. Clonar o Repositório

```bash
# Cria diretório para aplicações
sudo mkdir -p /var/www
cd /var/www

# Clona o repositório
sudo git clone https://github.com/rdal3/LabLIMS.git
cd LabLIMS

# Ajusta permissões
sudo chown -R $USER:$USER /var/www/LabLIMS
```

### 5. Configurar Backend

```bash
cd /var/www/LabLIMS/backend

# Instala dependências
npm install

# Cria arquivo de configuração
cp .env.example .env

# Edita configurações
nano .env
```

**Configurações do .env:**
```env
# Porta do servidor
PORT=3001

# Chave secreta JWT (GERE UMA NOVA!)
# Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=gere_uma_chave_aleatoria_muito_longa_aqui

# URLs permitidas (ajuste para seu domínio)
ALLOWED_ORIGINS=http://seu-dominio.com,http://IP-DO-SERVIDOR
```

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. Iniciar Backend com PM2

```bash
cd /var/www/LabLIMS/backend

# Inicia aplicação
pm2 start app.js --name "lims-backend"

# Configura inicialização automática
pm2 save
pm2 startup

# Verifica status
pm2 status
pm2 logs lims-backend
```

### 7. Build do Frontend

```bash
cd /var/www/LabLIMS/frontend

# Instala dependências
npm install

# Edita a URL da API (se necessário)
# Se o backend roda na mesma máquina, pode deixar localhost
nano src/services/api.ts

# Gera build de produção
npm run build
```

**Ajustar API_BASE_URL em src/services/api.ts:**
```typescript
// Para produção com proxy Nginx (recomendado)
export const API_BASE_URL = '/api';

// Ou acesso direto ao backend
export const API_BASE_URL = 'http://SEU-IP-OU-DOMINIO:3001';
```

### 8. Instalar e Configurar Nginx

```bash
# Instala Nginx
sudo apt install -y nginx

# Cria configuração do site
sudo nano /etc/nginx/sites-available/lims
```

**Conteúdo do arquivo /etc/nginx/sites-available/lims:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # ou IP do servidor

    # Frontend - arquivos estáticos
    root /var/www/LabLIMS/frontend/dist;
    index index.html;

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Rota do Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Limites de upload (para futuras funcionalidades)
    client_max_body_size 10M;
}
```

**Ativar site:**
```bash
# Ativa configuração
sudo ln -s /etc/nginx/sites-available/lims /etc/nginx/sites-enabled/

# Remove site default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testa configuração
sudo nginx -t

# Reinicia Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 9. Configurar Firewall (UFW)

```bash
# Permite SSH, HTTP e HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Ativa firewall
sudo ufw enable

# Verifica status
sudo ufw status
```

### 10. (Opcional) Configurar HTTPS com Let's Encrypt

```bash
# Instala Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtém certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Teste de renovação automática
sudo certbot renew --dry-run
```

---

## ✅ Verificação Final

### Testar serviços

```bash
# Backend rodando
pm2 status
curl http://localhost:3001/health

# Nginx rodando
sudo systemctl status nginx

# Acesso externo
curl http://SEU-IP-OU-DOMINIO
```

### Acessar o sistema

1. Abra no navegador: `http://SEU-IP-OU-DOMINIO`
2. Login: `admin@lab.com` / `admin123`
3. **Troque a senha imediatamente!**

---

## 🔧 Comandos Úteis

### PM2 (Backend)
```bash
pm2 status              # Status dos processos
pm2 logs lims-backend   # Ver logs
pm2 restart lims-backend # Reiniciar
pm2 stop lims-backend   # Parar
pm2 monit               # Monitor interativo
```

### Nginx
```bash
sudo systemctl status nginx   # Status
sudo systemctl restart nginx  # Reiniciar
sudo nginx -t                 # Testar configuração
sudo tail -f /var/log/nginx/error.log  # Logs de erro
```

### Atualizações
```bash
cd /var/www/LabLIMS

# Baixa atualizações
git pull origin main

# Atualiza backend
cd backend && npm install
pm2 restart lims-backend

# Atualiza frontend
cd ../frontend && npm install && npm run build
```

---

## 🛡️ Segurança Adicional

### Backup do Banco de Dados

```bash
# Cria diretório de backups
sudo mkdir -p /var/backups/lims

# Script de backup
cat << 'EOF' | sudo tee /usr/local/bin/backup-lims.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/LabLIMS/backend/lims.db /var/backups/lims/lims_$DATE.db
# Mantém apenas últimos 30 backups
ls -t /var/backups/lims/*.db | tail -n +31 | xargs -r rm
EOF

sudo chmod +x /usr/local/bin/backup-lims.sh

# Agenda backup diário (2h da manhã)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-lims.sh") | crontab -
```

### Fail2ban (proteção contra brute force)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## ❓ Troubleshooting

### Backend não inicia
```bash
# Verifica logs
pm2 logs lims-backend --lines 50

# Verifica se porta está em uso
sudo lsof -i :3001

# Reinstala dependências
cd /var/www/LabLIMS/backend
rm -rf node_modules && npm install
```

### Frontend retorna 404
```bash
# Verifica se build existe
ls -la /var/www/LabLIMS/frontend/dist/

# Se não existir, gera novamente
cd /var/www/LabLIMS/frontend
npm run build
```

### API retorna CORS error
```bash
# Edita .env do backend
nano /var/www/LabLIMS/backend/.env
# Adicione seu domínio em ALLOWED_ORIGINS

# Reinicia backend
pm2 restart lims-backend
```

### Permissões do banco de dados
```bash
# Garante permissões corretas
sudo chown -R www-data:www-data /var/www/LabLIMS/backend/lims.db
sudo chmod 664 /var/www/LabLIMS/backend/lims.db
```

---

## 📞 Suporte

Encontrou problemas? Abra uma [Issue](https://github.com/rdal3/LabLIMS/issues)
