# 🏆 Guilds Client Intelligence System

Sistema de Market Intelligence personalizado por cliente, desenvolvido pela Guilds Intelligence Engine.

---

## 📁 Estrutura de Pastas

```
ClientIntelligence/
├── guilds_portfolio.json          ← EDITE AQUI para adicionar/remover produtos
├── README.md                      ← Este arquivo
├── engine/
│   └── gerar_relatorio_cliente.py ← Motor principal do sistema
└── clients/
    └── {id-do-cliente}/
        ├── profile.json           ← Perfil completo do cliente
        └── reports/
            └── {data}/
                ├── Guilds_Intelligence_{Cliente}_{data}.pdf
                ├── Guilds_Briefing_{Cliente}_{data}.pdf
                ├── Guilds_WhatsApp_{Cliente}_{data}.txt
                └── Guilds_Audio_{Cliente}_{data}.mp3
```

---

## 🚀 Como Usar

### 1. Adicionar um novo cliente

**Opção A — Diga ao agente em linguagem natural:**
> "Cria um perfil para meu cliente Empresa XYZ, eles fazem software de RH para empresas médias em São Paulo, têm 3 anos de mercado, o produto principal é um sistema de recrutamento com IA..."

O agente irá extrair e montar o `profile.json` automaticamente.

**Opção B — Criar manualmente:**
Copie a pasta `exemplo-cliente`, renomeie para o ID do cliente (sem espaços, use hífens) e preencha o `profile.json`.

---

### 2. Configurar os nichos do cliente

No `profile.json`, o campo `nichos_mapeados_pelo_agente` define quais áreas serão pesquisadas.

Exemplos de nichos possíveis:
- `"Tecnologia na Saúde"`, `"EdTech"`, `"IA"`, `"Startups"`
- `"Brasil"`, `"Geopolítica"`, `"Tendências Mundo"`
- `"Desenvolvimento de Software"`, `"Varejo Digital"`
- `"Recursos Humanos e RH Tech"`, `"Agronegócio Tech"`, etc.

O agente pode sugerir nichos automaticamente com base no perfil da empresa.

---

### 3. Gerar um relatório para o cliente

Diga ao agente:
> "Gera o relatório de inteligência para o cliente [ID do cliente]"

Ou execute diretamente:
```bash
cd ClientIntelligence/engine
python gerar_relatorio_cliente.py --cliente id-do-cliente
```

O sistema irá:
1. ✅ Carregar o perfil do cliente
2. ✅ Pesquisar na web os nichos relevantes
3. ✅ Personalizar os insights com o contexto do cliente
4. ✅ Recomendar produtos Guilds específicos para aquele negócio
5. ✅ Gerar 4 artefatos: PDF Completo, PDF One Page, TXT WhatsApp, MP3 Áudio

---

### 4. Atualizar produtos e serviços da Guilds

Abra `guilds_portfolio.json` e edite diretamente:
- Para **adicionar** um produto: copie o bloco `_como_adicionar_produto.template` e preencha
- Para **desativar** um produto: mude `"ativo": true` para `"ativo": false`
- Para **remover**: delete o bloco do produto

O sistema lerá o arquivo atualizado automaticamente na próxima execução.

---

### 5. Cliente pede um deep dive

Diga ao agente:
> "O cliente [ID] quer um relatório mais profundo sobre [tema específico]"

O agente irá:
1. Carregar o histórico do cliente
2. Identificar o relatório de referência
3. Pesquisar mais fundo no tema solicitado
4. Gerar um relatório de deep dive com os mesmos 4 formatos de entrega

---

## 💡 Dicas de Uso

- **Personalização cresce com o tempo**: quanto mais relatórios forem gerados para um cliente, mais o sistema aprende as preferências e refina as recomendações
- **Histórico fica salvo**: cada relatório é salvo com data na pasta `reports/`, facilitando comparações ao longo do tempo
- **Portfolio sempre atualizado**: antes de cada geração, o sistema lê `guilds_portfolio.json` — mantê-lo atualizado garante recomendações precisas
- **Nichos flexíveis**: os nichos podem ser atualizados no `profile.json` a qualquer momento conforme o negócio do cliente evolui

---

## 🔄 Modelo de Negócio Sugerido

| Produto | Entrega | Frequência Sugerida |
|---------|---------|-------------------|
| Relatório Completo | PDF + One Page + WhatsApp + MP3 | Semanal ou Mensal |
| Deep Dive | PDF focado em 1 tema | Por demanda |
| Onboarding | Setup do perfil + primeiro relatório | Único |
| Revisão de Perfil | Atualização de nichos e contexto | Trimestral |

---

*Guilds Intelligence Engine — guilds.com.br*
