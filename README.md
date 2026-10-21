# Nexo — Controle financeiro

Aplicação de controle financeiro pessoal construída com Next.js, React e TypeScript.

## Funcionalidades
- Saldo disponível, receitas previstas e despesas por urgência.
- Alertas de vencimento, simulação de investimentos e análise semanal/mensal.
- Cadastro e login por e-mail e senha, com sessão persistente.
- Dados financeiros salvos na nuvem e isolados por usuário.

## Stack
- Next.js + React + TypeScript
- Neon PostgreSQL + Neon Managed Auth (Better Auth)
- Neon Data API via SDK compatível com as chamadas de autenticação e consulta usadas na versão anterior
- Vercel para hospedagem

## Configuração
1. Configure `NEXT_PUBLIC_NEON_DATABASE_URL` na Vercel e no arquivo `.env.local` para desenvolvimento. Use apenas a URL HTTPS pública do endpoint, sem credenciais SQL.
2. No Neon, mantenha o Managed Auth ativo e a confirmação de e-mail desativada para permitir acesso imediato após o cadastro.
3. A tabela `public.user_financial_data` deve ter Row Level Security habilitada e políticas que restrinjam SELECT/INSERT/UPDATE/DELETE ao usuário autenticado correspondente.
4. Instale dependências com `npm install` e execute `npm run dev`. Valide cadastro, login, recarga da página, salvamento e isolamento com duas contas de teste antes de promover a migração à produção.

## Migração de contas
Senhas e sessões do antigo provedor não são transferidas. Usuários existentes devem criar novas contas no Neon. Dados financeiros antigos não devem ser associados automaticamente por e-mail sem um processo explícito e verificado de recuperação da conta.
