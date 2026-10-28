# Nexo — Arquitetura técnica e plano de evolução

## 1. Objetivo do produto

Nexo é uma aplicação web responsiva de gestão financeira pessoal. A experiência deve permitir que uma pessoa entenda sua posição financeira rapidamente, registre movimentações sem atrito e avalie o impacto de decisões futuras sem recorrer a linguagem culpabilizante ou mecanismos de gamificação ansiosos.

A interface adotada nesta etapa é **Dark Glass / Ambient Blue**, com:
- **Deep Ocean**: fundo escuro principal (`#070C12`).
- **Ocean Glass**: superfícies seletivas translúcidas e contornos discretos.
- **Neon Emerald**: assinatura para ações positivas, confirmações e saldo projetado.
- **Cyber Cobalt**: navegação ativa, gráficos e elementos analíticos.
- **Ice Blue**: luz ambiente e detalhes de foco.

A estrutura privilegia um painel financeiro principal e áreas abertas com divisórias. Não se deve transformar cada informação em um cartão independente.

## 2. Arquitetura atual do repositório

- **Frontend:** Next.js App Router, React e TypeScript.
- **UI:** CSS próprio com variáveis de design, responsividade e suporte a movimento reduzido.
- **Identidade e sessão:** Supabase Auth.
- **Persistência atual:** tabela `user_financial_data`, com os dados organizados por `user_id` e `section`.
- **Hospedagem:** integração do repositório com Vercel.
- **Isolamento:** cada consulta de dados financeiros deve ser filtrada por usuário e reforçada por Row Level Security (RLS).

Esta atualização reorganiza a apresentação visual e os estilos responsivos. Não remove a autenticação Supabase nem substitui o modelo de persistência existente.

## 3. Domínio financeiro recomendado

A evolução funcional deve separar registros operacionais de hipóteses e simulações.

### Entidades

| Entidade | Responsabilidade | Campos principais |
| --- | --- | --- |
| `transactions` | Movimentações efetivas ou importadas | `id`, `user_id`, `type`, `amount`, `category_id`, `occurred_at`, `description`, `status`, `source`, `external_id` |
| `categories` | Classificação de entradas e saídas | `id`, `user_id`, `name`, `kind`, `color`, `is_system` |
| `accounts` | Contas e fontes de saldo | `id`, `user_id`, `provider`, `display_name`, `currency`, `last_synced_at`, `connection_status` |
| `planned_expenses` | Compras e compromissos ainda não realizados | `id`, `user_id`, `title`, `total_amount`, `planned_for`, `installments`, `category_id`, `priority`, `status` |
| `recurring_rules` | Regras de recorrência | `id`, `user_id`, `frequency`, `next_occurrence`, `end_at`, `amount`, `active` |
| `investment_positions` | Posições efetivas importadas ou inseridas | `id`, `user_id`, `account_id`, `institution`, `principal`, `current_value`, `as_of` |
| `investment_scenarios` | Projeções hipotéticas, sem confundi-las com carteira real | `id`, `user_id`, `principal`, `rate`, `rate_period`, `target_date`, `projected_value` |
| `bank_connections` | Estado da conexão com provedor de Open Finance | `id`, `user_id`, `provider`, `provider_connection_id`, `status`, `consented_at`, `expires_at`, `last_sync_at` |

Todos os valores monetários devem ser armazenados em centavos inteiros ou em um tipo decimal exato no banco de dados. Evitar ponto flutuante para valores persistidos. Todas as datas devem ser armazenadas em formato ISO e interpretadas no fuso horário definido para o usuário.

## 4. Camadas da aplicação

1. **Apresentação:** páginas e componentes React acessíveis; componentes de visualização não devem decidir regras financeiras.
2. **Domínio:** funções puras para saldo projetado, parcelas, recorrência, vencimentos, classificação e agregações de relatório.
3. **Serviços:** módulos tipados para transações, despesas planejadas, calendário, relatórios e conexão bancária.
4. **Persistência:** Supabase/PostgreSQL, migrações versionadas e RLS em todas as tabelas expostas.
5. **Integrações:** funções server-side para comunicação com provedores externos; segredos nunca devem ser incluídos no bundle do navegador.
6. **Observabilidade:** logs estruturados sem credenciais, tokens, extratos completos ou outros dados financeiros sensíveis.

## 5. Projeção financeira

A projeção deve calcular um saldo por data, sem tratar uma compra planejada como uma transação efetivada.

```text
saldo_projetado(data) =
  saldo_inicial
  + entradas_confirmadas_ate(data)
  + entradas_previstas_ate(data)
  - despesas_pendentes_ate(data)
  - parcelas_planejadas_ate(data)
```

Para compras parceladas, distribuir o valor conforme as datas e quantidades de parcelas, com regra explícita de arredondamento em centavos. O sistema deve sinalizar insuficiência projetada, não bloquear decisões nem afirmar que a projeção é garantia do saldo futuro. Alterações e cancelamentos devem recalcular os meses afetados.

## 6. Dashboard e visualizações

- **Resumo de até três segundos:** saldo atual, saldo projetado, compromissos mais próximos e entradas previstas.
- **Donut principal:** representar uma distribuição mutuamente exclusiva e com denominador claramente definido. A interface deve explicar o significado de liquidez, compromissos, investimentos e saldo livre. Não somar categorias sobrepostas nem classificar simulações como carteira real.
- **Calendário financeiro:** entradas, despesas, parcelas planejadas, pagamentos realizados e dias de maior concentração de saída. A seleção de um dia abre seus detalhes.
- **Relatórios:** agregações semanais e mensais de entradas, saídas, categorias e variação de saldo; os gráficos devem mostrar quando não há dados, sem inventar valores.
- **Detalhe de despesas:** evolução por período, categorias, recorrência e maiores compromissos.
- **Atalhos:** adicionar despesa, receita, investimento/simulação e plano futuro a partir da tela inicial.

## 7. Integração bancária / Open Finance

A integração deve usar um provedor autorizado e compatível com o ecossistema Open Finance brasileiro. O fluxo esperado:

1. O usuário inicia a conexão e vê o provedor, os dados solicitados e o objetivo do consentimento.
2. O backend cria uma sessão de consentimento no provedor.
3. O usuário autentica-se diretamente no ambiente autorizado da instituição/provedor; o Nexo não coleta credenciais bancárias.
4. O provedor retorna um identificador de conexão, armazenado no backend com acesso restrito.
5. Um job ou webhook autenticado solicita atualizações de contas e transações.
6. A importação usa identificadores externos idempotentes para evitar duplicatas.
7. O usuário pode consultar estado, última sincronização, revogar consentimento e desconectar a instituição.
8. Tokens de acesso e refresh ficam apenas em armazenamento server-side protegido; nunca em `localStorage`, logs ou respostas para o navegador.

A disponibilidade de saldo “em tempo real” depende da instituição, do provedor, do consentimento e dos limites de atualização. A interface deve exibir a data da última sincronização e nunca prometer tempo real quando o provedor não o garante.

## 8. Segurança e privacidade

- RLS habilitado para todas as tabelas com dados do usuário.
- Políticas com `auth.uid() = user_id` para SELECT, INSERT, UPDATE e DELETE, incluindo `WITH CHECK` em UPDATE.
- Não usar metadados editáveis do perfil para autorizar acesso.
- Não expor service-role keys ou segredos em variáveis `NEXT_PUBLIC_*`.
- Validar valores, datas, moeda e ownership no servidor, mesmo que haja validação na UI.
- Aplicar limites de taxa e idempotência nos endpoints de integração.
- Minimizar dados bancários persistidos e documentar retenção, exportação e exclusão.
- Não gravar tokens, senhas, extratos completos ou identificadores sensíveis em logs.
- Solicitar consentimento claro antes de importar dados financeiros e permitir desconexão.

## 9. Engajamento saudável

- Resumo diário opcional, sem linguagem de urgência ou culpa.
- Confirmação visual discreta após um registro.
- Indicadores de consistência baseados em uso e clareza, não em dinheiro acumulado.
- Alertas configuráveis e limitados a eventos úteis.
- Metas pessoais opcionais e progresso transparente.
- Não usar contagens regressivas artificiais, rankings sociais ou mensagens que incentivem gastos ou decisões financeiras precipitadas.

## 10. Plano de entrega

### Etapa 1 — Base visual e preservação
- Aplicar identidade Dark Glass / Ambient Blue.
- Melhorar hierarquia, espaçamento, estados vazios, foco visível e responsividade.
- Preservar sessão e persistência atuais.

### Etapa 2 — Modelo de domínio
- Migrar dados JSON por seção para tabelas tipadas quando houver plano de migração, backup e validação.
- Implementar transações, categorias, recorrência e despesas planejadas com testes unitários.
- Garantir isolamento por RLS e testar com dois usuários diferentes.

### Etapa 3 — Relatórios e projeções
- Implementar projeção por mês, parcelas e calendário a partir de funções de domínio compartilhadas.
- Testar datas no fim do mês, anos bissextos, cancelamentos e arredondamento de parcelas.
- Mostrar claramente dados efetivos versus estimativas.

### Etapa 4 — Open Finance
- Selecionar provedor conforme autorização, cobertura, custo, suporte e condições contratuais.
- Implementar fluxo de consentimento e sincronização server-side em ambiente de testes.
- Só habilitar produção depois de testes de segurança, reconciliação e revogação de consentimento.

### Etapa 5 — Qualidade e lançamento
- Testes de acessibilidade e responsividade em larguras mobile/tablet/desktop.
- Testes de fluxo de autenticação, isolamento de dados e persistência.
- Testes de build, lint, erros de runtime e revisão de logs.
- Liberar primeiro em preview; publicar em produção somente após validação.

## 11. Limites desta entrega

A atualização visual não cria por si só uma conexão bancária real, não adiciona credenciais de um provedor e não transforma simulações em investimentos reais. As etapas de banco de dados, Open Finance e migração do modelo de dados exigem implementação e validação próprias. Nenhuma chave ou segredo deve ser inserido no código-fonte.
