# Fase 23 Executada - 2026-03-11

## Camada

Camada 10 - Internacionalizacao

## Objetivo desta entrega

Propagar idioma para o worker Python, emails transacionais e artefatos operacionais mais importantes.

## O que foi implementado

- suporte de locale no worker em `engine/supabase_worker.py`
- assunto e HTML do email de relatorio prontos para `pt-BR` e `en-US`
- titulo do relatorio persistido conforme idioma do cliente
- geracao de WhatsApp TXT sensivel ao idioma do cliente
- geracao de audio MP3 sensivel ao idioma do cliente
- camada heuristica principal do motor com sintese base em ingles para clientes `en-US`

## Arquivos principais

- `engine/supabase_worker.py`
- `engine/gerar_relatorio_cliente.py`

## O que ainda fica para os proximos passos da camada

- social pack em ingles
- limpeza adicional de trechos residuais em portugues no PDF completo e one-page
- glossario oficial de termos do negocio

## Validacao executada

- `python -m py_compile worker_server.py engine/supabase_worker.py engine/gerar_relatorio_cliente.py engine/gerar_social_media.py`: OK
- `npm run lint`: OK
- `npm run build`: OK
