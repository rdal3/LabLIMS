# Lab-LIMS

Sistema de Gestão de Informações para Laboratórios (Laboratory Information Management System)

## 🎯 Sobre o Projeto

Lab-LIMS é um sistema completo para gerenciamento de amostras laboratoriais desenvolvido especificamente para laboratórios de análise de água e ambientais. Oferece controle de amostras, rastreabilidade, geração de etiquetas com QR Code e dashboard em tempo real.

## ✨ Funcionalidades

- 🔐 **Autenticação e RBAC** - 4 níveis de acesso (Admin, Professor, Técnico, Voluntário)
- 📊 **Dashboard Interativo** - Visualização em tempo real de estatísticas e progresso
- 🏷️ **Geração de Etiquetas** - QR Codes para rastreabilidade
- 🔬 **Gestão de Amostras** - CRUD completo com múltiplos parâmetros analíticos
- 📝 **Auditoria Completa** - Registro de todas as ações do sistema
- 🎨 **Interface Moderna** - Design responsivo e intuitivo

## 🚀 Início Rápido

```bash
# Backend
cd backend
npm install
node app.js

# Frontend (novo terminal)
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**  
Login padrão: `admin@lab.com` / `admin123`

## 📖 Documentação

- **[Manual de Instalação Completo](INSTALL.md)** - Instalação local e produção
- **[Arquitetura de Segurança](SECURITY_ARCHITECTURE.md)** - Especificações RBAC e auditoria

## 🛠️ Tecnologias

**Backend:**
- Node.js + Express
- SQLite3 (better-sqlite3)
- JWT + bcrypt

**Frontend:**
- React + TypeScript
- Vite
- React Router
- Lucide Icons

## 📦 Estrutura

```
Lab-LIMS/
├── backend/         # API REST + Banco de dados
├── frontend/        # Interface React
├── INSTALL.md       # Manual de instalação
└── README.md        # Este arquivo
```

## 🔒 Segurança

- ✅ Senhas com bcrypt (12 rounds)
- ✅ JWT stateless com expiração
- ✅ Auditoria de todas as ações críticas
- ✅ RBAC com 4 níveis de permissão
- ✅ Soft delete para dados sensíveis

## 📊 Sistema de Códigos Únicos

- **UUID Interno:** Identificação única por amostra
- **Código Visível:** Pode repetir em datas diferentes
- **Rastreabilidade:** QR Code em cada etiqueta

## 🧪 Matrizes Analíticas Suportadas

- Água (diversos tipos)
- Solo
- Efluente
- Personalizável via configuração

## 👥 Contribuindo

Este projeto foi desenvolvido para uso acadêmico. Sugestões e melhorias são bem-vindas!

## 📄 Licença

Este projeto é de uso interno do laboratório.

## 🆘 Suporte

Consulte o [Manual de Instalação](INSTALL.md) para resolução de problemas comuns.

---

Desenvolvido por Raphael David Alvarenga Lopes (https://github.com/rdal3) com carinho para gestão laboratorial eficiente
