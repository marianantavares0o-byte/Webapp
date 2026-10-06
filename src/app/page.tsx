'use client';

import { useState } from "react";

type Tab = "visao" | "gastos" | "receitas" | "investimentos" | "analise";

type Expense = {
  id: number;
  name: string;
  category: string;
  amount: number;
  due: string;
  urgency: "Alta" | "Média" | "Baixa";
  status: "Pendente" | "Pago";
};

type Income = {
  id: number;
  name: string;
  amount: number;
  range: string;
  confidence: "Alta" | "Média" | "Baixa";
};

const initialExpenses: Expense[] = [
  { id: 1, name: "Aluguel", category: "Moradia", amount: 1200, due: "10/10", urgency: "Alta", status: "Pendente" },
  { id: 2, name: "Conta de energia", category: "Casa", amount: 184, due: "12/10", urgency: "Alta", status: "Pendente" },
  { id: 3, name: "Internet", category: "Casa", amount: 109, due: "15/10", urgency: "Média", status: "Pendente" },
  { id: 4, name: "Curso", category: "Educação", amount: 240, due: "18/10", urgency: "Média", status: "Pendente" },
  { id: 5, name: "Jantar", category: "Lazer", amount: 120, due: "19/10", urgency: "Baixa", status: "Pendente" }
];

const initialIncome: Income[] = [
  { id: 1, name: "Salário", amount: 3200, range: "13–15/10", confidence: "Alta" },
  { id: 2, name: "Freelance", amount: 600, range: "20–25/10", confidence: "Média" },
  { id: 3, name: "Reembolso", amount: 180, range: "28–31/10", confidence: "Baixa" }
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    wallet: "M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5zM3 9h18M16 14h2",
    calendar: "M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z",
    trend: "M4 16l5-5 4 3 7-8",
    bell: "M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus: "M12 5v14M5 12h14",
    chevron: "M9 18l6-6-6-6",
    target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z",
    chart: "M5 19V9M12 19V5M19 19v-7",
    shield: "M12 3l7 3v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6z"
  };
  return <svg viewBox="0 0 24 24" className="icon" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("visao");
  const [expenses, setExpenses] = useState(initialExpenses);
  const [income] = useState(initialIncome);
  const [balance, setBalance] = useState(2450);
  const [showAdd, setShowAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", due: "", urgency: "Média" as Expense["urgency"] });


  const pending = expenses.filter((e) => e.status === "Pendente");
  const totalPending = pending.reduce((sum, e) => sum + e.amount, 0);
  const expectedIncome = income.reduce((sum, e) => sum + e.amount, 0);
  const projectedBalance = balance + expectedIncome - totalPending;
  const savingsRate = Math.max(0, Math.min(100, Math.round(((projectedBalance - 800) / Math.max(1, expectedIncome)) * 100)));

  const nextPayment = [...pending].sort((a, b) => a.due.localeCompare(b.due))[0];

  const highPriorityTotal = pending.filter((e) => e.urgency === "Alta").reduce((sum, e) => sum + e.amount, 0);
  const nextIncome = [...income].sort((a, b) => a.range.localeCompare(b.range))[0];
  const balanceAfterHighPriority = balance - highPriorityTotal;
  const projectedCoverage = totalPending > 0 ? Math.round(((balance + expectedIncome) / totalPending) * 100) : 100;
  const financialStatus = projectedBalance >= 2500 ? "Confortável" : projectedBalance >= 1200 ? "Controlada" : "Atenção";

  function addExpense() {
    const amount = Number(newExpense.amount.replace(",", "."));
    if (!newExpense.name || !amount || !newExpense.due) return;
    setExpenses((current) => [
      ...current,
      { id: Date.now(), name: newExpense.name, category: "Outros", amount, due: newExpense.due, urgency: newExpense.urgency, status: "Pendente" }
    ]);
    setNewExpense({ name: "", amount: "", due: "", urgency: "Média" });
    setShowAdd(false);
    setTab("gastos");
  }

  function togglePaid(id: number) {
    setExpenses((current) => current.map((e) => e.id === id ? { ...e, status: e.status === "Pago" ? "Pendente" : "Pago" } : e));
    const item = expenses.find((e) => e.id === id);
    if (item) setBalance((v) => item.status === "Pago" ? v - item.amount : v + item.amount);
  }

  const nav = [
    ["visao", "Visão geral", "grid"],
    ["gastos", "Gastos", "wallet"],
    ["receitas", "Receitas", "arrow"],
    ["investimentos", "Investimentos", "trend"],
    ["analise", "Análise mensal", "chart"]
  ] as const;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">F</span><span>fluxo</span></div>
        <div className="profile"><div className="avatar">FL</div><div><strong>Fluxo</strong><span>Controle financeiro</span></div></div>
        <nav>{nav.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => setTab(id)}><Icon name={icon}/><span>{label}</span></button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="mini-card"><Icon name="shield"/><div><strong>Controle ativo</strong><span>Dados organizados</span></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">SEGUNDA-FEIRA, 5 DE OUTUBRO</p><h1>{tab === "visao" ? "Seu dinheiro, em perspectiva." : nav.find((n) => n[0] === tab)?.[1]}</h1></div>
          <div className="top-actions"><button className="icon-button"><Icon name="bell"/><span className="notification-dot"/></button><button className="primary" onClick={() => setShowAdd(true)}><Icon name="plus"/> Novo gasto</button></div>
        </header>

        {tab === "visao" && (
          <>
            <section className="overview-top">
              <div className="balance-card balance-card-modern">
                <div className="card-top"><span>Saldo total disponível</span><span className="pill positive">Hoje</span></div>
                <strong className="balance">{money(balance)}</strong>
                <p className="balance-caption">Valor livre para decisões financeiras antes dos próximos compromissos.</p>
                <div className="balance-meta"><span>Saldo projetado após entradas e pagamentos</span><strong>{money(projectedBalance)}</strong></div>
                <div className="progress"><span style={{ width: Math.min(100, Math.max(8, (balance / 5000) * 100)) + "%" }}/></div>
              </div>

              <div className="panel allocation-panel">
                <div className="panel-heading"><div><h2>Destino do dinheiro</h2><p>Distribuição sugerida para manter equilíbrio entre obrigações, segurança e crescimento.</p></div><Icon name="target"/></div>
                <div className="allocation-layout">
                  <div className="donut-chart"><div className="donut-center"><strong>100%</strong><span>planejado</span></div></div>
                  <div className="allocation-legend">
                    <div><i className="allocation-dot essential"/> <span>Pagamentos essenciais</span><strong>55%</strong></div>
                    <div><i className="allocation-dot reserve"/> <span>Reserva e liquidez</span><strong>20%</strong></div>
                    <div><i className="allocation-dot investment"/> <span>Investimentos</span><strong>15%</strong></div>
                    <div><i className="allocation-dot flexible"/> <span>Pequenos gastos</span><strong>10%</strong></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="overview-main-grid">
              <div className="panel commitments-panel">
                <div className="panel-heading">
                  <div><h2>Próximos compromissos</h2><p>Pagamentos organizados do prazo mais próximo ao mais distante.</p></div>
                  <button className="text-button" onClick={() => setTab("gastos")}>Ver gastos <Icon name="chevron"/></button>
                </div>
                <div className="commitments-list">
                  {[...pending].sort((a,b) => Number(a.due.split("/")[0]) - Number(b.due.split("/")[0])).map((e) => (
                    <div className="commitment-card" key={e.id}>
                      <div className={"date-box " + (e.urgency === "Alta" ? "danger" : e.urgency === "Média" ? "medium" : "")}>
                        <strong>{e.due.split("/")[0]}</strong><span>OUT</span>
                      </div>
                      <div className="commitment-main">
                        <div className="commitment-title"><strong>{e.name}</strong><span className={"urgency " + e.urgency.toLowerCase()}>{e.urgency}</span></div>
                        <span>{e.category} · {money(e.amount)}</span>
                      </div>
                      <div className="commitment-alert">
                        <span className={e.urgency === "Alta" ? "alert-mark red" : "alert-mark blue"}>{e.urgency === "Alta" ? "!" : "i"}</span>
                        <p>{e.urgency === "Alta" ? "Prioridade: separe este valor antes do vencimento." : "Planeje este pagamento para não comprometer o saldo."}</p>
                      </div>
                      <strong className="commitment-value">{money(e.amount)}</strong>
                    </div>
                  ))}
                  <div className="commitments-total"><span>Total de gastos pendentes</span><strong>{money(totalPending)}</strong></div>
                </div>
              </div>

              <div className="panel calendar-panel">
                <div className="panel-heading"><div><h2>Calendário financeiro</h2><p>Pagamentos e recebimentos previstos em outubro.</p></div><span className="period">OUT 2026</span></div>
                <FinancialCalendar expenses={expenses} income={income}/>
              </div>
            </section>

            <section className="panel financial-feedback">
              <div className="panel-heading">
                <div><p className="eyebrow">ANÁLISE E ACONSELHAMENTO</p><h2>Feedback financeiro</h2><p>Uma leitura estruturada do seu momento financeiro, combinando saldo atual, compromissos, entradas estimadas, prazos e margem projetada.</p></div>
                <span className={"feedback-status " + (financialStatus === "Atenção" ? "attention" : financialStatus === "Controlada" ? "controlled" : "comfortable")}>{financialStatus}</span>
              </div>
              <div className="feedback-text">
                <div className="feedback-section">
                  <strong>{nextPayment ? nextPayment.name + " é o próximo compromisso relevante e exige prioridade no planejamento." : "Não há pagamentos pendentes registrados no momento."}</strong>
                  <p>{highPriorityTotal > 0 ? "As despesas de alta urgência somam " + money(highPriorityTotal) + ". Separe esse valor antes de assumir novos gastos, pois preservar a liquidez reduz o risco de comprometer pagamentos essenciais." : "Mantenha os pagamentos previstos dentro do planejamento e evite comprometer o saldo com despesas flexíveis antes de confirmar as entradas estimadas."} {nextIncome ? "A próxima entrada é " + nextIncome.name + ", prevista para " + nextIncome.range + ". Até o recebimento, trate essa receita como expectativa, não como dinheiro disponível." : "Não há novas entradas estimadas registradas."} {savingsRate >= 20 ? " Como a margem projetada permanece positiva, preserve parte desse excedente antes de aumentar o consumo." : " Como a margem projetada é limitada, priorize liquidez e adie gastos discricionários."}</p>
                </div>
              </div>
              <div className="feedback-metrics">
                <div><span>Margem projetada</span><strong>{savingsRate}%</strong><small>após uma reserva-base de R$ 800</small></div>
                <div><span>Cobertura dos compromissos</span><strong>{projectedCoverage}%</strong><small>saldo + entradas ÷ gastos pendentes</small></div>
                <div><span>Saldo após urgentes</span><strong>{money(balanceAfterHighPriority)}</strong><small>antes das demais despesas</small></div>
              </div>

          </>
        )}

        {tab === "gastos" && <ExpenseView expenses={expenses} onToggle={togglePaid} onAdd={() => setShowAdd(true)} />}
        {tab === "receitas" && <IncomeView income={income} />}
        {tab === "investimentos" && <InvestmentView balance={balance} />}
        {tab === "analise" && <AnalysisView expenses={expenses} expectedIncome={expectedIncome} />}

        <footer>Fluxo organiza estimativas e decisões. Não substitui aconselhamento financeiro profissional.</footer>
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowAdd(false)}><div className="modal"><div className="modal-head"><div><p className="eyebrow">NOVA DESPESA</p><h2>Adicionar gasto</h2></div><button className="close" onClick={() => setShowAdd(false)}>×</button></div><label>Descrição<input value={newExpense.name} onChange={(e) => setNewExpense({...newExpense, name:e.target.value})} placeholder="Ex.: passagem aérea"/></label><div className="form-grid"><label>Valor<input inputMode="decimal" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount:e.target.value})} placeholder="0,00"/></label><label>Vencimento<input value={newExpense.due} onChange={(e) => setNewExpense({...newExpense, due:e.target.value})} placeholder="DD/MM"/></label></div><label>Urgência<select value={newExpense.urgency} onChange={(e) => setNewExpense({...newExpense, urgency:e.target.value as Expense["urgency"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label><button className="primary full" onClick={addExpense}>Adicionar ao planejamento</button></div></div>}
    </main>
  );
}

function ExpenseView({ expenses, onToggle, onAdd }: { expenses: Expense[]; onToggle: (id:number)=>void; onAdd:()=>void }) {
  const total = expenses.reduce((s,e)=>s+e.amount,0);
  return <section className="page-section"><div className="summary-strip"><div><span>Total planejado</span><strong>{money(total)}</strong></div><div><span>Alta urgência</span><strong>{expenses.filter(e=>e.urgency==="Alta").length}</strong></div><div><span>Pagos</span><strong>{expenses.filter(e=>e.status==="Pago").length}</strong></div></div><div className="panel"><div className="panel-heading"><div><h2>Todos os gastos</h2><p>Ordene suas decisões pela urgência e pelo impacto no saldo.</p></div><button className="primary small" onClick={onAdd}><Icon name="plus"/> Novo gasto</button></div><div className="table"><div className="table-head"><span>Despesa</span><span>Prazo</span><span>Urgência</span><span>Valor</span><span>Status</span></div>{expenses.map(e=><div className="table-row" key={e.id}><div><strong>{e.name}</strong><span>{e.category}</span></div><span>{e.due}</span><span className={"urgency " + e.urgency.toLowerCase()}>{e.urgency}</span><strong>{money(e.amount)}</strong><button className={e.status==="Pago"?"status paid":"status"} onClick={()=>onToggle(e.id)}>{e.status}</button></div>)}</div></div></section>;
}

function IncomeView({ income }: { income: Income[] }) {
  return <section className="page-section"><div className="summary-strip"><div><span>Entradas estimadas</span><strong>{money(income.reduce((s,e)=>s+e.amount,0))}</strong></div><div><span>Maior entrada</span><strong>{money(Math.max(...income.map(e=>e.amount)))}</strong></div><div><span>Janela principal</span><strong>13–15/10</strong></div></div><div className="panel"><div className="panel-heading"><div><h2>Receitas futuras</h2><p>Registre intervalos quando a data exata ainda não for conhecida.</p></div><button className="text-button">+ Nova receita</button></div><div className="income-cards">{income.map(i=><div className="income-card" key={i.id}><div className="income-icon"><Icon name="arrow"/></div><div><strong>{i.name}</strong><span>Estimativa: {i.range}</span></div><strong>{money(i.amount)}</strong><span className={"confidence " + i.confidence.toLowerCase()}>{i.confidence} confiança</span></div>)}</div></div></section>;
}

function InvestmentView({ balance }: { balance: number }) {
  const principal = 500;
  const annual = 0.1198;
  const days = 185;
  const gross = principal * Math.pow(1 + annual, days/365);
  const gain = gross - principal;
  return <section className="page-section"><div className="summary-strip"><div><span>Capital disponível hoje</span><strong>{money(balance)}</strong></div><div><span>Exemplo investido</span><strong>{money(principal)}</strong></div><div><span>Prazo estimado</span><strong>185 dias</strong></div></div><div className="grid-2"><div className="panel"><div className="panel-heading"><div><h2>Simulador de investimento</h2><p>Exemplo educacional de juros compostos.</p></div><Icon name="trend"/></div><div className="investment-result"><span>Valor projetado</span><strong>{money(gross)}</strong><small>Ganho bruto estimado: {money(gain)}</small></div><div className="formula"><span>Capital</span><b>{money(principal)}</b><span>Taxa anual</span><b>11,98% a.a.</b><span>Resgate</span><b>Após 185 dias</b></div></div><div className="panel recommendation-panel"><div className="panel-heading"><div><h2>Regra de segurança</h2><p>Investir não deve comprometer contas essenciais.</p></div></div><ul><li>Primeiro preserve despesas de alta urgência e uma reserva de liquidez.</li><li>Compare prazo, liquidez, risco, tributação e proteção do produto antes de investir.</li><li>O retorno mostrado é uma simulação; taxas reais e condições podem variar.</li></ul></div></div></section>;
}

function AnalysisView({ expenses, expectedIncome }: { expenses: Expense[]; expectedIncome:number }) {
  const total = expenses.reduce((s,e)=>s+e.amount,0);
  const essential = expenses.filter(e=>["Alta","Média"].includes(e.urgency)).reduce((s,e)=>s+e.amount,0);
  const discretionary = total-essential;
  const savings = Math.max(0, expectedIncome-total);
  return <section className="page-section"><div className="panel monthly"><div className="panel-heading"><div><p className="eyebrow">OUTUBRO 2026</p><h2>Seu mês em números</h2><p>Uma leitura simples do quanto entrou, saiu e pode ser poupado.</p></div><span className="period">Projeção</span></div><div className="analysis-grid"><div className="big-number"><span>Entradas</span><strong>{money(expectedIncome)}</strong><small>estimadas</small></div><div className="big-number"><span>Saídas</span><strong>{money(total)}</strong><small>planejadas</small></div><div className="big-number"><span>Potencial de poupança</span><strong>{money(savings)}</strong><small>{expectedIncome ? Math.round(savings/expectedIncome*100) : 0}% das entradas</small></div></div><div className="category-list"><div><span>Essenciais e compromissos</span><div className="line"><i style={{width: Math.min(100, essential/total*100)+"%"}}/></div><strong>{money(essential)}</strong></div><div><span>Discricionários</span><div className="line"><i style={{width: Math.min(100, discretionary/total*100)+"%"}}/></div><strong>{money(discretionary)}</strong></div></div><div className="monthly-advice"><strong>Leitura do mês</strong><p>{savings > total*0.2 ? "Sua projeção indica uma margem relevante para poupança. Antes de elevar o padrão de consumo, direcione parte desse excedente para uma meta definida." : "Sua projeção deixa pouca margem para poupança. Priorize compromissos, reduza gastos discricionários e revise receitas estimadas antes de assumir novas parcelas."}</p></div></div></section>;
}

function FinancialCalendar({ expenses, income }: { expenses: Expense[]; income: Income[] }) {
  const cells = Array.from({ length: 35 }, (_, i) => i - 4);
  const events: Record<number, { type: "payment" | "income"; label: string }[]> = {};
  expenses.forEach((e) => {
    const day = Number(e.due.split("/")[0]);
    if (!events[day]) events[day] = [];
    events[day].push({ type: "payment", label: e.name });
  });
  income.forEach((i) => {
    const day = Number(i.range.split(/[–-]/)[0]);
    if (!events[day]) events[day] = [];
    events[day].push({ type: "income", label: i.name });
  });
  return <div className="financial-calendar">
    <div className="calendar-weekdays">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <span key={d}>{d}</span>)}</div>
    <div className="calendar-grid">
      {cells.map((day) => {
        const inMonth = day > 0 && day <= 31;
        const dayEvents = inMonth ? (events[day] || []) : [];
        return <div className={"calendar-day " + (!inMonth ? "muted" : "") + (day === 5 ? " today" : "")} key={day}>
          <strong>{inMonth ? day : day <= 0 ? 27 + day : day - 31}</strong>
          {dayEvents.slice(0,2).map((event, index) => <span key={event.type + event.label + index} className={"calendar-event " + event.type}>{event.type === "income" ? "↑ " : "↓ "}{event.label}</span>)}
        </div>;
      })}
    </div>
    <div className="calendar-legend"><span><i className="dot income-dot"/> Recebimento</span><span><i className="dot expense-dot"/> Pagamento</span></div>
  </div>;
}
