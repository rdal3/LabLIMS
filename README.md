# 🧪 Lab-LIMS - Sistema de Gestão Laboratorial

Sistema completo de gestão para laboratórios de análises ambientais. Desenvolvido como plataforma **whitelabel**, esta versão foi customizada para o **LabÁgua** da Universidade do Estado do Pará (UEPA).

![Status](https://img.shields.io/badge/Status-MVP%20v1.0-brightgreen)
![Licença](https://img.shields.io/badge/Licença-Proprietária-red)

---

## ✨ Funcionalidades

### 📋 Gestão de Amostras
- **Geração de lotes** com códigos sequenciais automáticos
- **QR Codes** únicos para cada amostra
- **Scanner QR** integrado para acesso rápido (mobile e desktop)
- **Rastreamento de status**: Aguardando → Em Análise → Concluído

### 🏷️ Etiquetas
- Impressão em **papel A4** (múltiplas por página)
- Suporte para **etiquetadoras térmicas** (30mm × 60mm)
- Seleção de **quantidade de cópias**
- QR Code + código legível + data + cliente

### 📊 Parâmetros Analíticos
- **Físico-Químicos**: pH, condutividade, turbidez, OD, DBO, DQO...
- **Microbiológicos**: Coliformes, E. coli, Bactérias Heterotróficas
- **Metais**: Ferro, Chumbo, Cádmio, Cromo...
- **BTEX**: Benzeno, Tolueno, Etilbenzeno, Xilenos
- Configurável por **matriz analítica** (água superficial, subterrânea, efluente...)

### 📄 Relatórios
- Impressão de **laudo de amostra única**
- Impressão de **lote completo** (todas amostras do mesmo prefixo)
- Barra de progresso das análises
- Status de cada parâmetro (concluído/pendente)
- Design profissional para A4

### 🔐 Segurança
- Autenticação JWT com sessões controladas
- **4 níveis de acesso**: Admin, Professor, Técnico, Voluntário
- Logs de auditoria completos
- Histórico de modificações por amostra
- Controle de sessões simultâneas

### 📱 Responsivo
- Interface adaptada para **desktop e mobile**
- Scanner QR funciona na câmera do celular
- Navegação simplificada em telas pequenas

---

## 🏗️ Arquitetura

```
Lab-LIMS/
├── backend/           # API Node.js + Express
│   ├── app.js         # Servidor principal
│   ├── lims.db        # Banco SQLite
│   └── .env           # Configurações
│
└── frontend/          # React + TypeScript + Vite
    ├── src/
    │   ├── pages/     # Páginas da aplicação
    │   ├── components/# Componentes reutilizáveis
    │   ├── config/    # Configurações do laboratório
    │   └── contexts/  # AuthContext
    └── dist/          # Build de produção
```

---

## 🚀 Instalação Rápida (Windows)

### Pré-requisitos
- [Node.js 18+](https://nodejs.org/)
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/rdal3/LabLIMS.git
cd Lab-LIMS
```

### 2. Configure o Backend
```bash
cd backend
npm install
copy .env.example .env
# Edite o .env com seu JWT_SECRET
node app.js
```

### 3. Configure o Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Acesse
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Credenciais iniciais
- **Email**: admin@lab.com
- **Senha**: admin123

⚠️ **Importante**: Troque a senha no primeiro login!

---

## 🐧 Instalação em Ubuntu Server

Veja o guia completo em [INSTALL_UBUNTU.md](./INSTALL_UBUNTU.md)

---

## 📋 Uso Básico

### Fluxo de Trabalho

1. **Login** com suas credenciais
2. **Gerar Lote** de amostras:
   - Selecione a matriz (água superficial, efluente, etc)
   - Informe cliente e ponto de coleta
   - Defina intervalo (ex: 1 a 10)
   - Gere e imprima as etiquetas
3. **Editar Amostras**:
   - Escaneie o QR code ou busque no banco
   - Preencha os resultados das análises
   - Salve e atualize o status
4. **Gerar Relatório**:
   - Clique em "Relatório" na amostra
   - Escolha amostra única ou lote
   - Imprima para apresentar

### Painel Admin (ADMIN e PROFESSOR)
- **Visão Geral**: Estatísticas do sistema
- **Logs de Auditoria**: Todas as ações no sistema
- **Modificações de Amostras**: Histórico detalhado de edições
- **Sessões Ativas**: Controle de logins
- **Usuários**: Criar, editar, desativar usuários
- **Parâmetros**: Gerenciar parâmetros analíticos

---

## 🔧 Configuração

### Variáveis de Ambiente (backend/.env)

```env
# Porta do servidor
PORT=3001

# Chave secreta para JWT (gere uma aleatória!)
JWT_SECRET=sua_chave_super_secreta_aqui

# URLs permitidas (CORS)
ALLOWED_ORIGINS=http://localhost:5173,http://192.168.1.100:5173
```

### Matrizes Analíticas (frontend/src/config/labConfig.ts)

Edite este arquivo para adicionar/remover matrizes e parâmetros do seu laboratório.

---

## ⚖️ Licença

**© 2026 Raphael David Alvarenga Lopes. Todos os direitos reservados.**

Este software é proprietário e confidencial. É proibido copiar, modificar, distribuir ou utilizar este código sem autorização expressa do autor.

Para licenciamento comercial ou parcerias, entre em contato.

---

## 👤 Autor

**Raphael D. A. Lopes**

Desenvolvido como plataforma whitelabel para gestão de laboratórios de análises ambientais.

---

## 📞 Suporte

Para suporte, licenciamento ou customizações, entre em contato com o autor.
