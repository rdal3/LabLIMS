# Dashboard - Sugestões para Lab-LIMS

## 1. Dashboard Principal - Visão Operacional

### Layout Sugerido

```
┌─────────────────────────────────────────────────────────┐
│  LABÁGUA LIMS - Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 RESUMO GERAL                                         │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ Total    │ Em       │ Concluído│ Pendente │         │
│  │ Amostras │ Análise  │          │          │         │
│  │   145    │    32    │    98    │    15    │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│                                                          │
│  📈 PROGRESSO POR MATRIZ                                │
│  ┌─────────────────────────────────────────────┐        │
│  │ Rede de Distribuição (RD)       ████░ 80%  │        │
│  │ ETA Semanal (ETA-S)             ███░░ 60%  │        │
│  │ ETA Mensal (ETA-M)              ██░░░ 40%  │        │
│  │ Água Superficial (AS)           █████ 100% │        │
│  │ ETE (ETE)                       ████░ 75%  │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  🔬 ANÁLISES MAIS COMUNS                                │
│  ┌─────────────────────────────────────────────┐        │
│  │ pH                              120 análises│        │
│  │ Turbidez                        115 análises│        │
│  │ Coliformes Totais               98 análises │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  📅 AMOSTRAS RECENTES                                   │
│  (Tabela das últimas 10 amostras)                       │
└─────────────────────────────────────────────────────────┘
```

### Componentes do Dashboard

#### 1. **Cards de Estatísticas**
- Total de amostras
- Amostras em análise
- Amostras concluídas
- Amostras aguardando

#### 2. **Gráfico de Progresso por Matriz**
- Barras horizontais mostrando % de conclusão
- Cores correspondentes às matrizes
- Clicável para filtrar amostras dessa matriz

#### 3. **Timeline de Amostras**
- Gráfico de linha mostrando amostras criadas por dia/semana/mês
- Útil para identificar picos de trabalho

#### 4. **Análises Pendentes - Prioridade**
- Lista de amostras com prazo mais próximo
- Destaque para amostras atrasadas

#### 5. **Distribuição por Cliente**
- Gráfico de pizza ou barras
- Mostra quais clientes mais enviam amostras

## 2. Dashboard de Produtividade

### Métricas Importantes

```typescript
interface DashboardMetrics {
  today: {
    samplesCreated: number;
    samplesCompleted: number;
    analysesPerformed: number;
  };
  week: {
    avgCompletionTime: number; // em horas
    totalAnalyses: number;
    completionRate: number; // percentual
  };
  month: {
    totalSamples: number;
    byMatrix: {
      matrixName: string;
      count: number;
      avgProgress: number;
    }[];
  };
}
```

### Visualizações

1. **Heatmap de Atividade**
   - Mostra dias/horas com mais atividade
   - Identifica padrões de trabalho

2. **Funil de Análises**
   - Criadas → Em Análise → Concluídas
   - Mostra onde há gargalos

3. **Tempo Médio por Matriz**
   - Quanto tempo leva para completar cada tipo
   - Útil para planejamento

## 3. Dashboard de Qualidade

### Indicadores

1. **Taxa de Não-Conformidade**
   - Análises que precisaram ser refeitas
   - Por tipo de análise

2. **Conformidade com Prazos**
   - % de amostras concluídas no prazo
   - Histórico mensal

3. **Análises Mais Problemáticas**
   - Quais parâmetros demoram mais
   - Quais têm mais erros

## 4. Estrutura de Dados para Dashboard

### Endpoints Sugeridos

```javascript
// Backend - app.js

// 1. Estatísticas Gerais
app.get('/dashboard/stats', (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM amostras').get().count,
    aguardando: db.prepare('SELECT COUNT(*) as count FROM amostras WHERE status = "Aguardando"').get().count,
    emAnalise: db.prepare('SELECT COUNT(*) as count FROM amostras WHERE status = "Em Análise"').get().count,
    concluido: db.prepare('SELECT COUNT(*) as count FROM amostras WHERE status = "Concluído"').get().count
  };
  res.json(stats);
});

// 2. Progresso por Matriz
app.get('/dashboard/by-matrix', (req, res) => {
  const sql = `
    SELECT 
      matriz,
      COUNT(*) as total,
      AVG(
        CASE 
          WHEN status = 'Concluído' THEN 100
          WHEN status = 'Em Análise' THEN 50
          ELSE 0
        END
      ) as avgProgress
    FROM amostras
    WHERE matriz IS NOT NULL
    GROUP BY matriz
  `;
  const data = db.prepare(sql).all();
  res.json(data);
});

// 3. Timeline (amostras por dia)
app.get('/dashboard/timeline', (req, res) => {
  const sql = `
    SELECT 
      DATE(dataColeta) as date,
      COUNT(*) as count
    FROM amostras
    WHERE dataColeta >= DATE('now', '-30 days')
    GROUP BY DATE(dataColeta)
    ORDER BY date ASC
  `;
  const data = db.prepare(sql).all();
  res.json(data);
});

// 4. Top Análises
app.get('/dashboard/top-analyses', (req, res) => {
  const sql = `
    SELECT 
      json_each.value as analysis,
      COUNT(*) as count
    FROM amostras, json_each(amostras.analysesPlanned)
    WHERE analysesPlanned IS NOT NULL
    GROUP BY json_each.value
    ORDER BY count DESC
    LIMIT 10
  `;
  const data = db.prepare(sql).all();
  res.json(data);
});
```

### Componente Frontend

```typescript
// Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { BarChart, PieChart, Activity, TrendingUp } from 'lucide-react';

interface DashboardStats {
  total: number;
  aguardando: number;
  emAnalise: number;
  concluido: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div>Carregando...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Total" 
          value={stats.total} 
          icon={Activity}
          color="blue"
        />
        <StatCard 
          title="Aguardando" 
          value={stats.aguardando} 
          icon={Activity}
          color="slate"
        />
        <StatCard 
          title="Em Análise" 
          value={stats.emAnalise} 
          icon={TrendingUp}
          color="amber"
        />
        <StatCard 
          title="Concluído" 
          value={stats.concluido} 
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        <ProgressByMatrix />
        <TimelineChart />
      </div>
    </div>
  );
};
```

## 5. Priorização de Implementação

### Fase 1 (Essencial) - 1-2 dias
1. ✅ Cards de estatísticas básicas
2. ✅ Progresso por matriz (barras)
3. ✅ Lista de amostras recentes

### Fase 2 (Importante) - 2-3 dias
4. Timeline de criação de amostras
5. Top análises mais comuns
6. Filtros por data/matriz/status

### Fase 3 (Avançado) - 3-5 dias
7. Gráficos interativos (Chart.js ou Recharts)
8. Exportação de relatórios
9. Heatmap de atividade
10. Métricas de produtividade

## 6. Bibliotecas Recomendadas

### Gráficos
- **Recharts** (recomendado)
  - React-native
  - Componentes prontos
  - Bom para dashboards

- **Chart.js**
  - Mais leve
  - Configurável
  - Boa documentação

### Ícones
- **Lucide React** (já em uso)
  - Consistente com o projeto atual

## Resumo

A sugestão é criar um **Dashboard Principal** com:
- 4 cards de métricas (total, aguardando, em análise, concluído)
- Progresso por matriz (barras horizontais)
- Timeline de amostras (últimos 30 dias)
- Top 10 análises mais comuns
- Tabela de amostras recentes

Isso dará uma visão clara e acionável do estado do laboratório, facilitando a gestão e o planejamento.

---

Quer que eu implemente alguma parte específica do dashboard?
