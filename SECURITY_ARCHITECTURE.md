# Arquitetura de Segurança Lab-LIMS
## Sistema de Gestão Laboratorial com Rastreabilidade Total

**Versão:** 1.0  
**Data:** 2026-01-05  
**Responsável Técnico:** [A definir]  
**Contexto:** Laboratório acadêmico com requisitos de auditoria institucional

---

## 🎯 Princípios Fundamentais

### 1. **Rastreabilidade Total**
> "Toda ação crítica deve ser atribuível a uma pessoa física específica"

### 2. **Defesa em Profundidade**
> "Múltiplas camadas de proteção contra erro humano e sabotagem"

### 3. **Responsabilidade Explícita**
> "Quem delega poder assume corresponsabilidade"

### 4. **Simplicidade Operacional**
> "Segurança não pode ser contornável por 'ser difícil de usar'"

### 5. **Imutabilidade do Passado**
> "Registros históricos nunca podem ser silenciosamente alterados"

---

## 👥 Modelo RBAC (Role-Based Access Control)

### Hierarquia de Papéis

```
┌─────────────────────────────────────┐
│         🔴 ADMIN (root)             │ ← Acesso total + auditoria
├─────────────────────────────────────┤
│   🟠 PROFESSOR / COORDENADOR        │ ← Gestão + delegação
├─────────────────────────────────────┤
│     🟡 TÉCNICO / BOLSISTA           │ ← Operação + edição
├─────────────────────────────────────┤
│       🟢 VOLUNTÁRIO                 │ ← Read-only temporário
└─────────────────────────────────────┘
```

### 🔴 ADMIN (Desenvolvedor / Root)

**Permissões:**
- ✅ Criar/editar/desativar usuários
- ✅ Definir e modificar papéis
- ✅ Acessar logs completos
- ✅ Configurar sistema
- ✅ Executar migrações de banco
- ✅ Revogar sessões ativas
- ❌ **NÃO pode apagar logs de auditoria**
- ❌ **NÃO pode fazer hard delete sem justificativa dupla**

**Responsabilidades:**
- Todas as ações são auditadas (inclusive as dele)
- Acesso direto ao banco **apenas via console local** (não via web)
- Manutenção de backups
- Gestão de incidentes de segurança

**Restrições:**
- Login requer autenticação 2FA (futuramente)
- Sessões expiram em 30 minutos de inatividade
- Ações críticas requerem confirmação + senha

---

### 🟠 PROFESSOR / COORDENADOR

**Permissões:**
- ✅ CRUD completo de amostras via interface
- ✅ Gerar tokens temporários para voluntários
- ✅ Solicitar exclusão lógica (soft delete)
- ✅ Visualizar histórico de auditoria **das próprias ações**
- ✅ Delegar privilégios temporários (max 30 dias)
- ❌ **NÃO acessa SQL diretamente**
- ❌ **NÃO pode hard delete**
- ❌ **NÃO pode editar logs**

**Responsabilidades:**
- Quando delega acesso, se torna **co-responsável** pelas ações do delegado
- Deve revisar ações de delegados periodicamente
- Responde institucionalmente por dados sob sua coordenação

**Fluxo de Delegação:**
```javascript
// Exemplo de registro ao conceder privilégio
{
  id: "PRIV-2026-001",
  grantedBy: "prof.maria@lab.edu",
  grantedTo: "joao.voluntario@email.com",
  role: "TÉCNICO",
  permissions: ["READ", "WRITE"],
  validFrom: "2026-01-05T10:00:00Z",
  validUntil: "2026-01-12T10:00:00Z", // Máx 7 dias
  justification: "Apoio em análises de água durante semana de coleta",
  revocable: true,
  status: "ACTIVE"
}
```

---

### 🟡 TÉCNICO / BOLSISTA

**Permissões:**
- ✅ Criar amostras
- ✅ Editar dados analíticos
- ✅ Atualizar status (Aguardando → Em Análise → Concluído)
- ✅ Gerar relatórios
- ❌ **NÃO pode deletar amostras**
- ❌ **NÃO pode conceder privilégios**
- ❌ **NÃO pode alterar matriz analítica após criação**

**Responsabilidades:**
- Todas as edições ficam vinculadas ao CPF/email
- Deve justificar alterações em campos críticos

**Proteções:**
```sql
-- Exemplo: Técnico não pode mudar matriz após 24h
UPDATE amostras 
SET matriz = 'nova_matriz'
WHERE id = ?
AND created_at > NOW() - INTERVAL 24 HOUR
AND created_by = current_user_id;
-- Falha se >24h ou não for o criador
```

---

### 🟢 VOLUNTÁRIO

**Permissões:**
- ✅ Read-only + export (padrão)
- ✅ Privilégios temporários concedidos por Professor

**Características:**
- Acesso via **token único** (não login/senha)
- Token contém: quem emitiu, validade, escopo
- **Dupla responsabilidade:** ações auditadas tanto no voluntário quanto no emissor do token

**Token JWT Exemplo:**
```json
{
  "sub": "joao.voluntario@email.com",
  "role": "VOLUNTÁRIO",
  "tempRole": "TÉCNICO",
  "permissions": ["READ", "WRITE"],
  "grantedBy": "prof.maria@lab.edu",
  "iat": 1704441600,
  "exp": 1705046400,
  "scope": ["amostras:read", "amostras:write"],
  "delegationId": "PRIV-2026-001"
}
```

---

## ⏳ Sistema de Privilégios Temporários

### Estrutura de Banco

```sql
CREATE TABLE user_delegations (
  id VARCHAR(50) PRIMARY KEY,
  grantor_id INT NOT NULL REFERENCES users(id),
  grantee_email VARCHAR(255) NOT NULL,
  original_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'),
  granted_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'),
  permissions JSON, -- ["READ", "WRITE", "DELETE_SOFT"]
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  justification TEXT NOT NULL,
  revoked_at TIMESTAMP NULL,
  revoked_by INT NULL REFERENCES users(id),
  revoked_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_period CHECK (valid_until > valid_from),
  CONSTRAINT max_duration CHECK (valid_until <= DATE_ADD(valid_from, INTERVAL 30 DAY))
);

CREATE INDEX idx_delegations_grantee ON user_delegations(grantee_email, valid_from, valid_until);
CREATE INDEX idx_delegations_grantor ON user_delegations(grantor_id);
```

### Fluxo de Uso

1. **Concessão:**
```typescript
async function grantTemporaryAccess(req: AuthRequest, res: Response) {
  const { granteeEmail, role, permissions, durationDays, justification } = req.body;
  
  // Validações
  if (!req.user.canDelegate()) {
    throw new ForbiddenError("Usuário não tem permissão para delegar");
  }
  
  if (durationDays > 30) {
    throw new ValidationError("Duração máxima: 30 dias");
  }
  
  if (!justification || justification.length < 20) {
    throw new ValidationError("Justificativa obrigatória (mín. 20 caracteres)");
  }
  
  const delegation = await db.userDelegations.create({
    grantorId: req.user.id,
    granteeEmail,
    originalRole: 'VOLUNTÁRIO',
    grantedRole: role,
    permissions,
    validFrom: new Date(),
    validUntil: addDays(new Date(), durationDays),
    justification
  });
  
  // Auditoria
  await audit.log({
    action: 'DELEGATION_GRANTED',
    userId: req.user.id,
    targetUser: granteeEmail,
    metadata: { delegationId: delegation.id, role, permissions }
  });
  
  return res.json({ delegation, temporaryToken: generateDelegationToken(delegation) });
}
```

2. **Validação em cada Request:**
```typescript
async function validateDelegatedAccess(token: string): Promise<DelegationContext | null> {
  const payload = verifyJWT(token);
  
  const delegation = await db.userDelegations.findOne({
    where: {
      id: payload.delegationId,
      granteeEmail: payload.sub,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
      revokedAt: null
    }
  });
  
  if (!delegation) return null;
  
  return {
    grantee: payload.sub,
    grantor: delegation.grantorId,
    permissions: delegation.permissions,
    delegationId: delegation.id
  };
}
```

3. **Auditoria de Ação Delegada:**
```typescript
// Toda ação executada sob delegação registra DUPLA responsabilidade
await audit.log({
  action: 'SAMPLE_EDITED',
  userId: delegation.granteeEmail,
  delegatedBy: delegation.grantorId,
  delegationId: delegation.id,
  entity: 'amostras',
  entityId: sampleId,
  changes: { /* diff */ },
  metadata: {
    message: `Voluntário ${delegation.granteeEmail} editou amostra sob autorização de ${delegation.grantorName}`
  }
});
```

---

## 🧾 Sistema de Auditoria

### Tabela de Logs (Append-Only)

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) UNIQUE NOT NULL DEFAULT (UUID()),
  timestamp TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  
  -- Identificação do ator
  user_id INT NULL REFERENCES users(id),
  user_email VARCHAR(255) NOT NULL,
  user_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO') NOT NULL,
  
  -- Delegação (se aplicável)
  delegated_by INT NULL REFERENCES users(id),
  delegation_id VARCHAR(50) NULL REFERENCES user_delegations(id),
  
  -- Ação
  action VARCHAR(100) NOT NULL, -- 'LOGIN', 'SAMPLE_CREATE', 'SAMPLE_EDIT', etc
  entity_type VARCHAR(50) NULL, -- 'amostras', 'users', 'delegations'
  entity_id VARCHAR(100) NULL,
  
  -- Estado
  state_before JSON NULL,
  state_after JSON NULL,
  
  -- Contexto
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  session_id VARCHAR(255) NULL,
  
  -- Classificação
  severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
  category ENUM('AUTH', 'DATA', 'ADMIN', 'SECURITY') NOT NULL,
  
  -- Metadados
  metadata JSON NULL,
  
  -- Imutabilidade
  checksum CHAR(64) GENERATED ALWAYS AS (
    SHA2(CONCAT(uuid, timestamp, user_email, action, IFNULL(entity_id, '')), 256)
  ) STORED,
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_user (user_id, timestamp),
  INDEX idx_action (action, timestamp),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_severity (severity, timestamp)
) ENGINE=INNODB ROW_FORMAT=COMPRESSED;

-- NUNCA permitir DELETE ou UPDATE
REVOKE DELETE, UPDATE ON audit_logs FROM 'lims_app'@'localhost';
```

### Eventos Auditáveis

| Código | Descrição | Severidade |
|--------|-----------|------------|
| `AUTH_LOGIN_SUCCESS` | Login bem-sucedido | INFO |
| `AUTH_LOGIN_FAILED` | Tentativa de login falhou | WARNING |
| `AUTH_LOGOUT` | Logout | INFO |
| `AUTH_SESSION_EXPIRED` | Sessão expirou | INFO |
| `SAMPLE_CREATE` | Criação de amostra | INFO |
| `SAMPLE_EDIT` | Edição de amostra | INFO |
| `SAMPLE_STATUS_CHANGE` | Mudança de status | INFO |
| `SAMPLE_DELETE_SOFT` | Exclusão lógica | WARNING |
| `SAMPLE_DELETE_REQUESTED` | Solicitação de exclusão definitiva | CRITICAL |
| `SAMPLE_DELETE_HARD` | Exclusão definitiva executada | CRITICAL |
| `DELEGATION_GRANTED` | Privilégio temporário concedido | WARNING |
| `DELEGATION_REVOKED` | Privilégio revogado | WARNING |
| `USER_CREATED` | Novo usuário criado | WARNING |
| `USER_ROLE_CHANGED` | Papel de usuário alterado | CRITICAL |
| `UNAUTHORIZED_ACCESS` | Tentativa de acesso não autorizado | CRITICAL |
| `CONFIG_CHANGED` | Configuração do sistema alterada | CRITICAL |

### Middleware de Auditoria

```typescript
// Middleware automático para todas as rotas protegidas
async function auditMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Captura resposta
  const originalSend = res.json;
  res.json = function(data: any) {
    res.locals.responseData = data;
    return originalSend.call(this, data);
  };
  
  res.on('finish', async () => {
    try {
      const action = determineAction(req.method, req.path);
      if (!isAuditable(action)) return;
      
      await db.auditLogs.create({
        userId: req.user?.id || null,
        userEmail: req.user?.email || 'anonymous',
        userRole: req.user?.role || 'GUEST',
        delegatedBy: req.delegation?.grantorId || null,
        delegationId: req.delegation?.id || null,
        action,
        entityType: extractEntityType(req.path),
        entityId: req.params.id || null,
        stateBefore: req.locals.stateBefore || null,
        stateAfter: res.locals.responseData || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        sessionId: req.session?.id || null,
        severity: determineSeverity(action, res.statusCode),
        category: categorizeAction(action),
        metadata: {
          duration: Date.now() - startTime,
          statusCode: res.statusCode,
          method: req.method,
          path: req.path
        }
      });
    } catch (error) {
      console.error('[AUDIT ERROR]', error);
      // NUNCA deixe falha de auditoria quebrar o sistema
      // Mas registre em log externo
    }
  });
  
  next();
}
```

### Exportação de Logs

```typescript
// Exportar logs para auditoria externa (PDF/CSV)
async function exportAuditLogs(filters: AuditFilters): Promise<Buffer> {
  const logs = await db.auditLogs.findAll({
    where: buildWhereClause(filters),
    order: [['timestamp', 'DESC']],
    limit: filters.limit || 10000
  });
  
  // Gerar PDF assinado digitalmente
  const pdf = await generateSignedPDF(logs, {
    title: 'Relatório de Auditoria Lab-LIMS',
    period: `${filters.startDate} a ${filters.endDate}`,
    generatedBy: filters.requestedBy,
    checksum: SHA256(JSON.stringify(logs))
  });
  
  // Registrar exportação
  await audit.log({
    action: 'AUDIT_EXPORT',
    userId: filters.requestedBy,
    metadata: { recordCount: logs.length, filters }
  });
  
  return pdf;
}
```

---

## 🧨 Proteção contra Exclusão de Dados

### Modelo de 3 Camadas

#### 1️⃣ Soft Delete (Padrão)
```sql
ALTER TABLE amostras ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE amostras ADD COLUMN deleted_by INT NULL REFERENCES users(id);
ALTER TABLE amostras ADD COLUMN deletion_reason TEXT NULL;

-- View que esconde deletados por padrão
CREATE VIEW amostras_active AS
SELECT * FROM amostras WHERE deleted_at IS NULL;

-- Aplicação usa a VIEW, não a tabela direta
```

```typescript
async function softDeleteSample(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  
  if (!reason || reason.length < 10) {
    throw new ValidationError("Justificativa obrigatória para exclusão");
  }
  
  const sample = await db.amostras.findByPk(id);
  if (!sample) throw new NotFoundError();
  
  // Snapshot do estado atual
  const snapshot = sample.toJSON();
  
  await sample.update({
    deletedAt: new Date(),
    deletedBy: req.user.id,
    deletionReason: reason
  });
  
  await audit.log({
    action: 'SAMPLE_DELETE_SOFT',
    userId: req.user.id,
    entityType: 'amostras',
    entityId: id,
    stateBefore: snapshot,
    stateAfter: { deletedAt: new Date(), reason },
    severity: 'WARNING'
  });
  
  res.json({ message: 'Amostra marcada como excluída', recoverable: true });
}
```

#### 2️⃣ Hard Delete Request (Dupla Autorização)
```typescript
async function requestHardDelete(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { justification, legalBasis } = req.body;
  
  // Apenas PROFESSOR pode solicitar
  if (req.user.role !== 'PROFESSOR') {
    throw new ForbiddenError("Apenas coordenadores podem solicitar exclusão definitiva");
  }
  
  const request = await db.deletionRequests.create({
    requestedBy: req.user.id,
    entityType: 'amostras',
    entityId: id,
    justification,
    legalBasis, // LGPD, ordem judicial, etc
    status: 'PENDING',
    requiredApprovals: 2,
    currentApprovals: 0
  });
  
  await audit.log({
    action: 'SAMPLE_DELETE_REQUESTED',
    userId: req.user.id,
    entityId: id,
    severity: 'CRITICAL',
    metadata: { requestId: request.id, justification }
  });
  
  // Notifica admins
  await notifyAdmins('CRITICAL_DELETION_REQUEST', request);
  
  res.json({ 
    message: 'Solicitação registrada. Aguardando aprovação de 2 administradores.',
    requestId: request.id 
  });
}

async function approveHardDelete(req: AuthRequest, res: Response) {
  const { requestId } = req.params;
  
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError("Apenas ADMIN pode aprovar exclusões");
  }
  
  const request = await db.deletionRequests.findByPk(requestId);
  
  // Não pode aprovar a própria solicitação
  if (request.requestedBy === req.user.id) {
    throw new ForbiddenError("Não pode aprovar própria solicitação");
  }
  
  await db.approvals.create({
    requestId,
    approvedBy: req.user.id,
    approvedAt: new Date()
  });
  
  const approvalCount = await db.approvals.count({ where: { requestId } });
  
  if (approvalCount >= request.requiredApprovals) {
    // Executa HARD DELETE
    await executeHardDelete(request, req.user);
  }
  
  res.json({ approved: true, pending: request.requiredApprovals - approvalCount });
}
```

#### 3️⃣ Hard Delete (Backend Only)
```typescript
// NUNCA exposto via API web
// Apenas via console administrativo local
async function executeHardDelete(request: DeletionRequest, executor: User) {
  const entity = await db[request.entityType].findByPk(request.entityId);
  
  // Snapshot final
  const finalSnapshot = entity.toJSON();
  
  // BACKUP antes de deletar
  await db.deletedEntitiesArchive.create({
    originalId: entity.id,
    entityType: request.entityType,
    data: finalSnapshot,
    deletedAt: new Date(),
    deletedBy: executor.id,
    deletionRequestId: request.id,
    checksum: SHA256(JSON.stringify(finalSnapshot))
  });
  
  // Deletar
  await entity.destroy({ force: true });
  
  // Auditoria CRÍTICA
  await audit.log({
    action: 'SAMPLE_DELETE_HARD',
    userId: executor.id,
    entityType: request.entityType,
    entityId: request.entityId,
    stateBefore: finalSnapshot,
    stateAfter: null,
    severity: 'CRITICAL',
    metadata: {
      requestId: request.id,
      archivedChecksum: SHA256(JSON.stringify(finalSnapshot))
    }
  });
  
  console.error(`[CRITICAL] Hard delete executed: ${request.entityType}#${request.entityId} by ${executor.email}`);
}
```

---

## 🧱 Separação de Camadas (Defesa Estrutural)

### Arquitetura de 3 Camadas

```
┌──────────────────────────────────────┐
│         Frontend (React)             │
│  - Apenas chamadas HTTP              │
│  - Nunca SQL direto                  │
└─────────────┬────────────────────────┘
              │ HTTP/HTTPS
              │
┌─────────────▼────────────────────────┐
│      Backend API (Node.js)           │
│  - Autenticação/Autorização          │
│  - Validação de regras de negócio    │
│  - Auditoria automática              │
│  - NUNCA expõe SQL direto            │
└─────────────┬────────────────────────┘
              │ TCP (LAN only)
              │
┌─────────────▼────────────────────────┐
│     Banco de Dados (SQLite/MySQL)    │
│  - Escuta APENAS localhost           │
│  - Sem acesso externo                │
│  - Backups automáticos               │
└──────────────────────────────────────┘
```

### Endpoints Segregados

```typescript
// API read-only (pode ser exposta publicamente futuramente)
router.get('/api/read/amostras', rateLimiter, readOnlyAuth, async (req, res) => {
  // Apenas SELECT
  const samples = await db.amostras.findAll({ where: { deletedAt: null } });
  res.json(samples);
});

// API de escrita (requer autenticação forte)
router.post('/api/write/amostras', requireAuth, auditMiddleware, async (req, res) => {
  // Validação + autorização + auditoria
  const sample = await createSample(req.body, req.user);
  res.json(sample);
});

// API admin (apenas LAN, nunca internet)
router.delete('/api/admin/users/:id', requireRole('ADMIN'), requireLocalhost, async (req, res) => {
  // Operações administrativas críticas
});
```

### Configuração de Firewall de Banco

```bash
# MySQL: apenas localhost
bind-address = 127.0.0.1

# SQLite: arquivo local, sem rede
# Acesso apenas via Unix socket ou file path
```

---

## 🔐 Autenticação (Realista para Academia)

### Sistema Híbrido

#### Fase 1: Local (Atual)
```typescript
// Hash com bcrypt (12 rounds)
import bcrypt from 'bcrypt';

async function registerUser(email: string, password: string, role: UserRole) {
  if (password.length < 12) {
    throw new ValidationError("Senha deve ter no mínimo 12 caracteres");
  }
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const user = await db.users.create({
    email,
    passwordHash: hashedPassword,
    role,
    createdAt: new Date(),
    mustChangePassword: true // Primeira senha é temporária
  });
  
  await audit.log({
    action: 'USER_CREATED',
    userId: null,
    metadata: { newUserId: user.id, role }
  });
  
  return user;
}

async function login(email: string, password: string, ipAddress: string) {
  const user = await db.users.findOne({ where: { email, active: true } });
  
  if (!user) {
    await audit.log({
      action: 'AUTH_LOGIN_FAILED',
      userEmail: email,
      ipAddress,
      severity: 'WARNING',
      metadata: { reason: 'USER_NOT_FOUND' }
    });
    throw new UnauthorizedError("Credenciais inválidas");
  }
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  
  if (!valid) {
    await db.users.increment('failedLoginAttempts', { where: { id: user.id } });
    
    if (user.failedLoginAttempts >= 5) {
      await db.users.update({ locked: true }, { where: { id: user.id } });
      await audit.log({
        action: 'USER_LOCKED',
        userId: user.id,
        severity: 'CRITICAL'
      });
    }
    
    throw new UnauthorizedError("Credenciais inválidas");
  }
  
  // Reset tentativas
  await db.users.update({ failedLoginAttempts: 0 }, { where: { id: user.id } });
  
  // Gera sessão
  const session = await createSession(user, ipAddress);
  
  await audit.log({
    action: 'AUTH_LOGIN_SUCCESS',
    userId: user.id,
    ipAddress,
    sessionId: session.id
  });
  
  return { user, token: session.token };
}
```

#### Fase 2: JWT Stateless
```typescript
import jwt from 'jsonwebtoken';

function generateJWT(user: User, delegation?: Delegation): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      delegatedBy: delegation?.grantorId || null,
      delegationId: delegation?.id || null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8), // 8 horas
    },
    process.env.JWT_SECRET!,
    { issuer: 'lab-lims', audience: 'lab-lims-api' }
  );
}

function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'lab-lims',
      audience: 'lab-lims-api'
    });
  } catch (error) {
    throw new UnauthorizedError("Token inválido ou expirado");
  }
}
```

#### Sessões com Revogação
```sql
CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  token_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  revoked_by INT NULL REFERENCES users(id),
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_active (user_id, revoked_at, expires_at)
);
```

```typescript
async function validateSession(token: string): Promise<User | null> {
  const tokenHash = SHA256(token);
  
  const session = await db.sessions.findOne({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    },
    include: [{ model: User }]
  });
  
  if (!session) return null;
  
  // Atualiza last_activity automaticamente (ON UPDATE)
  await session.touch();
  
  return session.user;
}

async function revokeAllUserSessions(userId: number, reason: string) {
  await db.sessions.update(
    { revokedAt: new Date(), revokedReason: reason },
    { where: { userId, revokedAt: null } }
  );
  
  await audit.log({
    action: 'SESSIONS_REVOKED',
    userId,
    severity: 'WARNING',
    metadata: { reason }
  });
}
```

---

## 🧠 Proteção contra Erro Humano

### Confirmações Fortes

```typescript
// Middleware para ações destrutivas
function requireStrongConfirmation(message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { confirmation } = req.body;
    
    const expectedConfirmation = `CONFIRMO: ${message}`;
    
    if (confirmation !== expectedConfirmation) {
      return res.status(400).json({
        error: 'Confirmação inválida',
        required: expectedConfirmation,
        hint: 'Digite exatamente a frase mostrada acima'
      });
    }
    
    next();
  };
}

// Uso
router.delete(
  '/amostras/:id',
  requireAuth,
  requireStrongConfirmation('Quero excluir esta amostra'),
  softDeleteSample
);
```

### UI Guideline

```tsx
// Componente React para exclusão
function DeleteSampleButton({ sample }) {
  const [showModal, setShowModal] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  
  const expectedText = `CONFIRMO: Quero excluir a amostra ${sample.codigo}`;
  
  const handleDelete = async () => {
    if (confirmation !== expectedText) {
      alert('Confirmação incorreta');
      return;
    }
    
    if (reason.length < 20) {
      alert('Justificativa muito curta (mínimo 20 caracteres)');
      return;
    }
    
    try {
      await api.delete(`/amostras/${sample.id}`, { confirmation, reason });
      toast.success('Amostra excluída (recuperável)');
    } catch (error) {
      toast.error('Erro ao excluir amostra');
    }
  };
  
  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn-danger">
        🗑️ Excluir
      </button>
      
      {showModal && (
        <Modal>
          <h2>⚠️ ATENÇÃO: Esta ação será registrada</h2>
          <p>Você está prestes a excluir a amostra <strong>{sample.codigo}</strong></p>
          
          <div className="warning-box">
            <p>✅ A amostra será marcada como excluída (soft delete)</p>
            <p>✅ Esta ação é REVERSÍVEL</p>
            <p>⚠️ Seu nome ficará registrado como responsável</p>
          </div>
          
          <label>
            Justificativa (obrigatória):
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Por que esta amostra está sendo excluída?"
              minLength={20}
            />
            <small>{reason.length}/20 caracteres</small>
          </label>
          
          <label>
            Digite exatamente: <code>{expectedText}</code>
            <input 
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={confirmation === expectedText ? 'valid' : 'invalid'}
            />
          </label>
          
          <button 
            onClick={handleDelete}
            disabled={confirmation !== expectedText || reason.length < 20}
            className="btn-danger"
          >
            Confirmar Exclusão
          </button>
          <button onClick={() => setShowModal(false)}>Cancelar</button>
        </Modal>
      )}
    </>
  );
}
```

### Mensagens de Responsabilidade

```typescript
// Interceptor de auditoria visível
app.use((req, res, next) => {
  if (isDestructiveAction(req)) {
    res.setHeader('X-Audit-Warning', 
      `Esta ação será registrada e vinculada a ${req.user.email}`
    );
  }
  next();
});
```

---

## 📊 Esquema Completo de Banco de Dados

```sql
-- Usuários
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash CHAR(60) NOT NULL,
  role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO') NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  cpf CHAR(11) UNIQUE NULL,
  active BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INT DEFAULT 0,
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NULL REFERENCES users(id)
);

-- Delegações
CREATE TABLE user_delegations (
  id VARCHAR(50) PRIMARY KEY,
  grantor_id INT NOT NULL REFERENCES users(id),
  grantee_email VARCHAR(255) NOT NULL,
  original_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'),
  granted_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'),
  permissions JSON,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  justification TEXT NOT NULL,
  revoked_at TIMESTAMP NULL,
  revoked_by INT NULL REFERENCES users(id),
  revoked_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessões
CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  token_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Logs de Auditoria (append-only)
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) UNIQUE NOT NULL,
  timestamp TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  user_id INT NULL REFERENCES users(id),
  user_email VARCHAR(255) NOT NULL,
  user_role ENUM('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO') NOT NULL,
  delegated_by INT NULL REFERENCES users(id),
  delegation_id VARCHAR(50) NULL REFERENCES user_delegations(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id VARCHAR(100) NULL,
  state_before JSON NULL,
  state_after JSON NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  session_id VARCHAR(255) NULL,
  severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
  category ENUM('AUTH', 'DATA', 'ADMIN', 'SECURITY') NOT NULL,
  metadata JSON NULL,
  checksum CHAR(64) GENERATED ALWAYS AS (
    SHA2(CONCAT(uuid, timestamp, user_email, action, IFNULL(entity_id, '')), 256)
  ) STORED
) ENGINE=INNODB ROW_FORMAT=COMPRESSED;

-- Solicitações de Hard Delete
CREATE TABLE deletion_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requested_by INT NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  justification TEXT NOT NULL,
  legal_basis TEXT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED') DEFAULT 'PENDING',
  required_approvals INT DEFAULT 2,
  current_approvals INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP NULL,
  executed_by INT NULL REFERENCES users(id)
);

CREATE TABLE deletion_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL REFERENCES deletion_requests(id),
  approved_by INT NOT NULL REFERENCES users(id),
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_approval (request_id, approved_by)
);

-- Arquivo de entidades deletadas (backup permanente)
CREATE TABLE deleted_entities_archive (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  original_id VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  data JSON NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  deleted_by INT NOT NULL REFERENCES users(id),
  deletion_request_id INT NULL REFERENCES deletion_requests(id),
  checksum CHAR(64) NOT NULL,
  INDEX idx_original (entity_type, original_id)
);

-- Amostras (com soft delete)
ALTER TABLE amostras ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE amostras ADD COLUMN deleted_by INT NULL REFERENCES users(id);
ALTER TABLE amostras ADD COLUMN deletion_reason TEXT NULL;
ALTER TABLE amostras ADD COLUMN created_by INT NOT NULL REFERENCES users(id);
ALTER TABLE amostras ADD COLUMN updated_by INT NULL REFERENCES users(id);

CREATE VIEW amostras_active AS
SELECT * FROM amostras WHERE deleted_at IS NULL;
```

---

## ⚖️ Considerações Legais e Éticas

### LGPD (Lei Geral de Proteção de Dados)

**Aplicável?** Parcialmente.  
- Dados de amostras **não são dados pessoais** (não identificam pessoas)
- Dados de **usuários** do sistema SÃO dados pessoais
- Logs de auditoria contêm dados pessoais (emails, IPs)

**Obrigações:**
1. **Consentimento:** Usuários devem concordar com coleta de logs ao fazer login
2. **Finalidade:** Logs são para auditoria científica/institucional
3. **Minimização:** Coletar apenas o necessário
4. **Segurança:** Criptografia, backups, controle de acesso
5. **Direito ao esquecimento:** Usuários podem solicitar remoção (exceto logs críticos)

### Integridade Científica

**Princípio:** Dados laboratoriais devem ser rastreáveis e imutáveis para garantir reprodutibilidade.

**Implementação:**
- Todo dado analítico tem autor e timestamp
- Edições preservam histórico completo
- Exclusões são justificadas e auditadas
- Possibilidade de embargo de dados (não publicar, mas preservar)

### Responsabilidade Institucional

**Em caso de auditoria externa, o sistema deve poder responder:**
1. Quem criou esta amostra?
2. Quem editou este resultado?
3. Por que esta amostra foi excluída?
4. Quem tinha acesso ao sistema neste período?
5. Houve tentativas de acesso não autorizado?
6. Os dados foram adulterados?

**Este sistema garante todas estas respostas via:**
- Logs imutáveis
- Checksums de integridade
- Rastreabilidade total
- Backups automáticos

---

## 🚀 Roadmap de Implementação

### Fase 1: Fundação (2-3 semanas)
- [ ] Migrar banco para incluir tabelas de segurança
- [ ] Implementar sistema de usuários + RBAC básico
- [ ] Sistema de autenticação com bcrypt + JWT
- [ ] Middleware de auditoria automática
- [ ] Soft delete em amostras

### Fase 2: Auditoria (1-2 semanas)
- [ ] Tabela de audit_logs completa
- [ ] Hooks automáticos em todas as operações
- [ ] Interface de visualização de logs
- [ ] Exportação de relatórios

### Fase 3: Delegação (1 semana)
- [ ] Sistema de privilégios temporários
- [ ] Tokens de delegação
- [ ] Interface para gestão de voluntários

### Fase 4: Proteção Avançada (1 semana)
- [ ] Processo de hard delete com dupla aprovação
- [ ] Arquivo permanente de deletados
- [ ] Rate limiting
- [ ] Detecção de anomalias

### Fase 5: UX de Segurança (1 semana)
- [ ] Confirmações fortes em ações críticas
- [ ] Mensagens de responsabilidade
- [ ] Dashboard de auditoria para professores
- [ ] Notificações de atividades suspeitas

---

## 📋 Checklist de Segurança (Pré-Produção)

- [ ] Todas as senhas são hasheadas com bcrypt (12+ rounds)
- [ ] JWT_SECRET é gerado aleatoriamente (min 256 bits)
- [ ] Banco de dados escuta APENAS localhost
- [ ] Backup automático configurado (diário mínimo)
- [ ] Logs são append-only (sem UPDATE/DELETE grants)
- [ ] Sessões expiram após inatividade
- [ ] Rate limiting em endpoints de autenticação
- [ ] HTTPS obrigatório (se exposto além da LAN)
- [ ] Arquivos de log rotacionados e arquivados
- [ ] Processo de resposta a incidentes documentado
- [ ] Política de retenção de dados definida
- [ ] LGPD: Termos de uso e política de privacidade
- [ ] Testes de penetração realizados
- [ ] Auditoria externa de código (se possível)

---

## 🎓 Conclusão

Este sistema foi projetado para ser **defensável em auditoria institucional**.

Cada decisão técnica tem justificativa em princípios de:
- **Rastreabilidade:** Tudo é logado
- **Responsabilidade:** Toda ação tem autor
- **Imutabilidade:** O passado não pode ser reescrito
- **Defesa em profundidade:** Múltiplas camadas de proteção
- **Usabilidade:** Segurança não pode ser "burrada"

**A regra de ouro:**
> "Se você não consegue explicar para um auditor POR QUE um dado foi alterado, deletado ou acessado, o sistema falhou."

Este Lab-LIMS garante que **sempre haverá uma resposta**.

---

**Documento técnico elaborado por:** Raphael David Alvarenga Lopes  
**Revisão:** v1.0  
**Última atualização:** 2026-01-17
