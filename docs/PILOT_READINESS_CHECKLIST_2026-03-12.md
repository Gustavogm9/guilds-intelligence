# Checklist de Liberacao para Piloto - 2026-03-12

## Bloqueadores de piloto

| Item | Evidencia esperada | Responsavel | Status |
| --- | --- | --- | --- |
| Aplicar schema base e todas as migrations | Banco limpo com tabelas e colunas esperadas pelo codigo | `dev` | `pendente` |
| Validar colunas retrospectivas e externas em `reports` | Query no banco confirmando campos novos sem erro | `dev` | `pendente` |
| Validar bucket `reports` e policies | Upload e signed URL funcionando para admin e cliente | `ops` | `pendente` |
| Subir worker Python online | Endpoint `/health` respondendo e `/generate` acessivel com segredo | `ops` | `pendente` |
| Configurar secrets obrigatorios da web e do worker | Variaveis aplicadas em ambiente real sem fallback local | `ops` | `pendente` |
| Configurar cron de `schedule` e `recover` | Chamadas autenticadas funcionando em ambiente real | `ops` | `pendente` |
| Validar vinculo `auth.users -> profiles -> clients.user_id` | Login, onboarding e dashboard carregando o cliente correto | `dev` | `pendente` |
| Rodar 1 fluxo end-to-end real | `queued -> processing -> done` com arquivos no bucket | `dev` | `pendente` |
| Validar geracao de PDF, audio, WhatsApp e social pack | Download e abertura reais pelo dashboard do cliente | `dev` | `pendente` |

## Recomendados antes do primeiro cliente

| Item | Evidencia esperada | Responsavel | Status |
| --- | --- | --- | --- |
| Validar email transacional real | Email de relatorio pronto chegando com link funcional | `ops` | `pendente` |
| Validar webhook operacional | Alertas de erro e sucesso chegando no canal de operacao | `ops` | `pendente` |
| Testar WhatsApp em `dry_run` e depois com provedor | Mensagens inbound e outbound com status correto | `dev` | `pendente` |
| Validar credenciais reais de social publishing | Publicacao e sync de metricas funcionando em ao menos uma rede | `ops` | `pendente` |
| Fazer QA editorial em ingles | Relatorio, social pack e emails coerentes em `en-US` | `produto` | `pendente` |
| Revisar score e status de retrospectiva com negocio | Leitura aceita como suficientemente segura para mostrar ao cliente | `produto` | `pendente` |
| Definir criterio minimo de relatorio entregavel | Documento ou regra interna para aprovar qualidade antes do piloto | `produto` | `pendente` |

## Pode ficar para depois

| Item | Evidencia esperada | Responsavel | Status |
| --- | --- | --- | --- |
| Aprovacao social pelo cliente final | Fluxo adicional de revisao fora do admin interno | `produto` | `pendente` |
| Fontes externas alem de RSS | Novas fontes documentadas e integradas | `dev` | `pendente` |
| Automacao mais rica do WhatsApp | Comandos mais sofisticados e moderacao refinada | `dev` | `pendente` |
| Escala de observabilidade e dead-letter | Jobs esgotados e logs estruturados em camada dedicada | `ops` | `pendente` |
| Revenue intelligence mais avancada | Cohorts e expansion/risk com mais sofisticacao | `produto` | `pendente` |

## Regra de uso

- Nada abaixo de `Bloqueadores de piloto` pode ficar aberto se houver cliente real usando o sistema
- `Recomendados antes do primeiro cliente` pode admitir excecao consciente, mas so com dono e mitigacao definidos
- `Pode ficar para depois` nao deve travar o piloto assistido
