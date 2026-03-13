# Fase 21 Executada - 2026-03-11

## Camada

Camada 10 - Internacionalizacao

## Objetivo desta entrega

Criar a base de internacionalizacao da experiencia do cliente, com suporte inicial a portugues e ingles, sem introduzir uma stack pesada nem duplicar regras de negocio.

## O que foi implementado

- camada leve de i18n em `web/src/lib/i18n.ts`
- dicionarios iniciais para `pt-BR` e `en-US`
- normalizacao de locale com fallback para portugues
- formatacao de data e data/hora orientada ao idioma do cliente
- navegacao do dashboard internacionalizada
- dashboard do cliente internacionalizado
- inbox do cliente internacionalizada
- lista de relatorios internacionalizada
- detalhe de relatorio internacionalizado
- perfil do cliente internacionalizado
- fluxo de deep dive internacionalizado
- componente client-side para copy de WhatsApp em `web/src/components/dashboard/whatsapp-copy-card.tsx`

## Arquivos principais

- `web/src/lib/i18n.ts`
- `web/src/app/dashboard/layout.tsx`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/dashboard/inbox/page.tsx`
- `web/src/app/dashboard/reports/page.tsx`
- `web/src/app/dashboard/reports/[id]/page.tsx`
- `web/src/app/dashboard/profile/page.tsx`
- `web/src/app/dashboard/deep-dive/page.tsx`
- `web/src/components/dashboard/whatsapp-copy-card.tsx`

## O que ainda fica para os proximos passos da camada

- landing, login, signup e onboarding
- emails transacionais
- worker Python e artefatos gerados
- social pack e mensagens de WhatsApp geradas
- traducao orientada a glossario de negocio

## Validacao executada

- `npm run lint`: OK
- `npm run build`: OK
