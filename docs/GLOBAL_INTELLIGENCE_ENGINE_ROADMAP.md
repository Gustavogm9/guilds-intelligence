# Motor Global de Inteligência Preditiva — Roadmap

**Data:** 13/03/2026  
**Autor:** Gustavo Macedo / Guilds Engineering  
**Status:** Aprovado para Execução

---

## 1. Contexto e Motivação

O GuildsIntelligence nasceu de uma "skill" do Claude que fazia busca ativa na internet, cruzava com o contexto do cliente e gerava relatórios de inteligência de mercado. Ao escalar isso para um SaaS, a busca foi simplificada para **Feeds RSS pré-definidos** (módulo `external_intelligence.py`), o que limita:

- **Cobertura geográfica:** Só busca no que os feeds fixos publicam.
- **Personalização por nicho:** Não diferencia busca entre nichos diferentes do mesmo cliente.
- **Persistência:** Notícias são consumidas e descartadas após gerar o relatório — o cliente não tem histórico.
- **Reuso:** Se dois clientes têm o mesmo nicho, a pesquisa é duplicada.

### O que muda
Passamos de um sistema **passivo** (RSS) para um sistema **ativo e preditivo** (Web Search Global), com banco de conhecimento proprietário que aprende e otimiza ao longo do tempo.

---

## 2. Arquitetura-Alvo

### 2.1 Banco de Dados: O "Brain" Global

```
┌──────────────────┐     ┌───────────────────────────┐
│ global_niche_     │     │ niche_intelligence_nodes  │
│ topics            │────>│ (Hub Global de Insights)  │
│                   │     │                           │
│ id (uuid, PK)     │     │ id (uuid, PK)             │
│ name (text)       │     │ topic_id (FK)             │
│ normalized_key    │     │ title (text)              │
│ parent_topic_id   │     │ url (text)                │
│ created_at        │     │ summary (text)            │
└──────────────────┘     │ source_name (text)        │
                          │ region (US/EU/CN/BR)      │
                          │ predictive_score (0-100)  │
                          │ is_trend (boolean)        │
                          │ published_at (timestamptz)│
                          │ created_at (timestamptz)  │
                          └───────────────────────────┘

┌──────────────────┐     ┌───────────────────────────┐
│ client_niches    │     │ client_niche_signals      │
│ (já existe)      │────>│ (Ligação Cliente ↔ Nó)    │
│                  │     │                           │
│ id, client_id,   │     │ id (uuid, PK)             │
│ niche_name,      │     │ client_niche_id (FK)      │
│ relevance,       │     │ node_id (FK)              │
│ is_active        │     │ report_id (FK, nullable)  │
│                  │     │ delivered_at (timestamptz) │
└──────────────────┘     └───────────────────────────┘
```

**Princípios:**
- `global_niche_topics` é a **árvore normalizada** de tópicos (ex: "IA Aplicada", "EdTech B2B"). Quando um cliente cria um nicho, a IA mapeia para um ou mais tópicos globais.
- `niche_intelligence_nodes` armazena **cada insight/notícia** encontrada para aquele tópico globalmente. Se o Cliente A e o Cliente B compartilham "SaaS B2B", ambos leem do mesmo hub.
- `client_niche_signals` registra **quais nós foram entregues** ao cliente em qual relatório, criando o histórico exato e evitando repetição.

---

### 2.2 Motor de Busca Ativa (Worker Python)

O `external_intelligence.py` será refatorado em 3 fases internas:

#### Fase A: Search Strategy (Geração de Queries)
O Claude recebe o nicho e gera de 4 a 8 queries de busca direcionadas:

| Região | Exemplo de Query Gerada |
|--------|------------------------|
| **BR** | `"tendências [Nicho] Brasil 2026 mercado"` |
| **US** | `"[Niche] innovation trends USA 2026"` |
| **EU** | `"[Niche] regulation policy Europe latest"` |
| **CN** | `"[Niche] China market supply chain 2026"` |

#### Fase B: Execução Multi-Engine
- **Tavily AI** (ou Perplexity): Busca ativa na web em tempo real, retornando URLs + snippets relevantes.
- **Jina Reader**: Leitura profunda (full-text) das fontes mais promissoras encontradas pela busca.
- **RSS (legado)**: Mantido como fallback complementar.

#### Fase C: Síntese e Persistência (Intelligence Nodes)
O Claude:
1. Recebe os resultados brutos da busca.
2. **Não gera o relatório do cliente aqui.** Ele gera "Nós de Inteligência":
   - Título + Resumo do insight.
   - Score preditivo (0-100): "Isso pode ser tendência?"
   - Classificação por região.
   - Flag `is_trend` se o sinal aponta pro futuro.
3. Os nós são salvos na `niche_intelligence_nodes` vinculados ao `global_niche_topic`.

#### Cache Inteligente
Antes de disparar buscas, o worker consulta:
```
SELECT * FROM niche_intelligence_nodes
WHERE topic_id = :topic_id
  AND created_at > NOW() - INTERVAL '3 days'
ORDER BY predictive_score DESC;
```
Se já houver nós recentes de alta qualidade (de outro cliente com o mesmo nicho, por exemplo), ele **reutiliza** sem gastar API.

---

### 2.3 Geração do Relatório (Claude Report)

O `run_intelligence_engine` passa a consumir:
1. **Nós recém-pesquisados** para os nichos desse cliente.
2. **Nós premium de tópicos similares** pesquisados nos últimos 7 dias (cross-client intelligence).
3. **Contexto do site** (Jina Reader, já implementado).
4. **Histórico de relatórios anteriores** (já implementado).

---

### 2.4 Dashboard: Hub de Inteligência do Nicho

A rota `/dashboard/niches` evolui:

- **Listagem de Nichos** (já funciona): CRUD visível com badges e switches.
- **Clique no Nicho** → abre `/dashboard/niches/[id]`:
  - **Timeline Global**: Feed cronológico de todos os insights (`niche_intelligence_nodes`) que a IA encontrou.
  - **Trend Radar**: Cards destacando sinais com `is_trend = true` e `predictive_score > 70`.
  - **Relatórios Vinculados**: Quais relatórios do cliente utilizaram aquele nicho e quais insights específicos foram incluídos (`client_niche_signals`).

---

## 3. Roadmap de Execução

### Fase 1: O "Brain" Global (Banco de Dados)
- [ ] Criar tabela `global_niche_topics`
- [ ] Criar tabela `niche_intelligence_nodes`
- [ ] Criar tabela `client_niche_signals`
- [ ] RLS policies para todas as novas tabelas
- [ ] Função de normalização de nicho → tópico global

### Fase 2: Agente de Busca Ativa (Worker Python)
- [ ] Integração com Tavily AI (ou alternativa)
- [ ] Implementar `SearchStrategy` (gerador de queries multi-região)
- [ ] Implementar `GlobalIntelligenceGatherer` (pipeline completo)
- [ ] Implementar cache inteligente (consulta antes de buscar)
- [ ] Conectar ao `run_intelligence_engine` do relatório

### Fase 3: Dashboard Hub
- [ ] Rota `/dashboard/niches/[id]`
- [ ] Componente `NicheIntelligenceTimeline`
- [ ] Componente `TrendRadar`
- [ ] Traduções i18n

---

## 4. Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **Banco global vs por-cliente** | Global (`global_niche_topics`) | Reaproveitamento entre clientes e construção de base proprietária |
| **Engine de busca** | Tavily AI (primário) + Jina Reader (leitura profunda) | Tavily é focado em AI search, Jina já está integrado |
| **Cache TTL** | 3 dias para reuso, 7 dias para cross-client | Equilíbrio entre frescor e economia de API |
| **Score preditivo** | Claude classifica de 0-100 | Permite filtrar tendências futuras no dashboard |

---

## 5. Custos Estimados (por relatório)

| Componente | Custo Médio | Observação |
|------------|-------------|------------|
| Tavily AI | ~$0.01/query × 6 queries/nicho | Plano API com créditos |
| Jina Reader | Gratuito | Leitura de URLs |
| Claude (síntese) | ~$0.03-0.08 | Já é usado no relatório atual |
| **Total adicional** | **~$0.10-0.15/relatório** | Custo marginal baixo |

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Tavily fora do ar | Fallback para RSS + Jina Search |
| Excesso de chamadas API | Cache inteligente de 3 dias + rate limiting |
| Qualidade baixa dos resultados | Claude filtra e atribui score antes de salvar |
| Dados duplicados entre clientes | Dedup por URL + `global_niche_topics` normalizados |
