# Fluxo — Controle financeiro

Novo ponto de partida para o projeto de controle de gastos.

## Objetivo
O Fluxo organiza saldo atual, receitas futuras estimadas, despesas por urgência, alertas de prazo, simulação de investimentos, análise semanal e análise mensal.

## Stack
- Next.js + React + TypeScript
- CSS próprio, sem dependências de UI
- Estado local nesta primeira versão

## Próximas etapas
1. Persistência em banco de dados.
2. Autenticação segura.
3. Cadastro de receitas, gastos e metas.
4. Motor de prioridade considerando saldo, datas, urgência e entradas futuras.
5. Alertas de vencimento e prazo de compras.
6. Integração com investimentos e cálculo por produto.
7. Deploy e domínio na Vercel.

## Regra de produto
Estimativas devem ser apresentadas como estimativas. O sistema não deve tratar renda futura incerta como dinheiro já disponível e não deve recomendar investimento que comprometa despesas essenciais.