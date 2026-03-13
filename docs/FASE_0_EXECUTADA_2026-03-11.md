# Fase 0 Executada - 2026-03-11

## Objetivo da fase

Estabilizar a base do projeto para permitir build, lint, navegacao coerente e menor risco de evolucao para a Fase 1.

## O que foi feito

### 1. Build do Next.js estabilizado

- removido conflito entre `web/src/middleware.ts` e `web/src/proxy.ts`
- consolidada a logica de auth/callback dentro de `web/src/proxy.ts`
- ajustado `web/tsconfig.json` para evitar que tipos de desenvolvimento stale quebrassem o build
- ajustadas paginas cliente com `useSearchParams` para uso com `Suspense` em `login` e `signup`

### 2. Lint zerado

- removidos imports nao usados
- removidos warnings que viravam ruido estrutural
- corrigidos pontos de estado derivados que geravam erro de lint

### 3. Navegacao admin alinhada

Para eliminar rotas quebradas, foram criadas paginas placeholder:

- `web/src/app/admin/billing/page.tsx`
- `web/src/app/admin/portfolio/page.tsx`
- `web/src/app/admin/clients/new/page.tsx`

Essas rotas ainda nao implementam o produto final da Fase 3, mas deixam o painel coerente.

### 4. Inconsistencias entre UI e API reduzidas

- a rota `web/src/app/api/reports/generate/route.ts` agora aceita tanto JSON quanto `form POST`
- isso estabiliza o acionamento vindo da tela admin do cliente
- o mapeamento de plano em `web/src/app/api/leads/route.ts` foi normalizado para o nome real dos planos no banco

### 5. Tipagem Supabase ajustada

Foram corrigidos pontos em que relacionamentos eram tratados como objeto simples, enquanto o TypeScript inferia array:

- dashboard cliente
- perfil cliente
- detalhe do cliente admin
- detalhe do relatorio
- geracao de relatorio

### 6. Ajustes adicionais

- removido select invalido em `admin/reports`
- removido codigo nao utilizado em `auth/signout`, `dashboard/reports/[id]` e middleware Supabase
- ajustados `Select` handlers do onboarding para aceitar `null` com fallback seguro

## Validacao executada

### Comandos

```bash
cd web
npm run lint
npm run build
```

### Resultado

- `npm run lint`: OK
- `npm run build`: OK

## Estado final da Fase 0

Fase 0 concluida com sucesso.

Base atual apos a fase:

- buildavel
- lintavel
- sem rotas admin quebradas
- com menor atrito para iniciar a Fase 1

## Proximo passo recomendado

Entrar na Fase 1:

- worker Python HTTP
- disparo real da geracao via `/api/reports/generate`
- upload para Storage
- `report_files`
- dashboard consumindo arquivos reais
