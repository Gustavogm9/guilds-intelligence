# Fase 22 Executada - 2026-03-11

## Camada

Camada 10 - Internacionalizacao

## Objetivo desta entrega

Internacionalizar a borda publica e o fluxo de entrada do produto, cobrindo captacao, autenticacao e onboarding.

## O que foi implementado

- helper publico de idioma em `web/src/lib/public-i18n.ts`
- override de idioma por `?lang=` para paginas publicas
- landing reescrita e internacionalizada em `web/src/app/page.tsx`
- login internacionalizado em `web/src/app/login/page.tsx`
- signup internacionalizado em `web/src/app/signup/page.tsx`
- onboarding internacionalizado em `web/src/app/onboarding/page.tsx`
- persistencia do idioma preferido desde signup e onboarding

## Arquivos principais

- `web/src/lib/public-i18n.ts`
- `web/src/app/page.tsx`
- `web/src/app/login/page.tsx`
- `web/src/app/signup/page.tsx`
- `web/src/app/onboarding/page.tsx`

## O que ainda fica para os proximos passos da camada

- emails transacionais
- worker Python e artefatos gerados
- social pack e mensagens de WhatsApp geradas
- glossario oficial de termos do negocio em ingles

## Validacao executada

- `npm run lint`: OK
- `npm run build`: OK
