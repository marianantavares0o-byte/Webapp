'use client';

import { useEffect, useState } from "react";

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
  source: string;
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
  { id: 1, name: "Salário", source: "Empregador", amount: 3200, range: "13–15/10", confidence: "Alta" },
  { id: 2, name: "Freelance", source: "Cliente de projeto", amount: 600, range: "20–25/10", confidence: "Média" },
  { id: 3, name: "Reembolso", source: "Empresa responsável", amount: 180, range: "28–31/10", confidence: "Baixa" }
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


function NexoLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "nexo-logo compact" : "nexo-logo"} aria-label="Nexo">
      <svg viewBox="0 0 48 48" className="nexo-logo-mark" aria-hidden="true">
        <defs>
          <linearGradient id="nexoMinimal" x1="7" y1="40" x2="41" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4fd1b5" />
            <stop offset="1" stopColor="#67c7ff" />
          </linearGradient>
        </defs>
        <path d="M9 36V12c0-2.2 2.8-3.2 4.2-1.4l17.6 22V12c0-2.8 2.2-5 5-5h3v29c0 2.2-2.8 3.2-4.2 1.4L17 15.4V36c0 2.8-2.2 5-5 5H9V36Z" fill="url(#nexoMinimal)" />
      </svg>
      <span>Nexo</span>
    </div>
  );
}
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
  const [income, setIncome] = useState(initialIncome);
  const [balance, setBalance] = useState(2450);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  useEffect(() => {
    try {
      const savedExpenses = localStorage.getItem("fluxo-expenses");
      const savedIncome = localStorage.getItem("fluxo-income");
      const savedBalance = localStorage.getItem("fluxo-balance");
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedIncome) setIncome(JSON.parse(savedIncome));
      if (savedBalance) setBalance(Number(savedBalance));
    } catch {
      // Mantém os dados iniciais caso o armazenamento local esteja indisponível.
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    localStorage.setItem("fluxo-expenses", JSON.stringify(expenses));
    localStorage.setItem("fluxo-income", JSON.stringify(income));
    localStorage.setItem("fluxo-balance", String(balance));
  }, [expenses, balance, storageLoaded]);

  const [newExpense, setNewExpense] = useState({ name: "", category: "", amount: "", due: "", urgency: "Média" as Expense["urgency"], status: "Pendente" as Expense["status"] });
  const [newIncome, setNewIncome] = useState({ name: "", source: "", amount: "", day: "", confidence: "Média" as Income["confidence"] });


  const pending = expenses.filter((e) => e.status === "Pendente");
  const totalPending = pending.reduce((sum, e) => sum + e.amount, 0);
  const expectedIncome = income.reduce((sum, e) => sum + e.amount, 0);
  const projectedBalance = balance + expectedIncome - totalPending;
  const savingsRate = Math.max(0, Math.min(100, Math.round(((projectedBalance - 800) / Math.max(1, expectedIncome)) * 100)));

  const nextPayment = [...pending].filter((e) => e.due.trim()).sort((a, b) => a.due.localeCompare(b.due))[0];

  const highPriorityTotal = pending.filter((e) => e.urgency === "Alta").reduce((sum, e) => sum + e.amount, 0);
  const nextIncome = [...income].sort((a, b) => a.range.localeCompare(b.range))[0];
  const balanceAfterHighPriority = balance - highPriorityTotal;
  const projectedCoverage = totalPending > 0 ? Math.round(((balance + expectedIncome) / totalPending) * 100) : 100;
  const financialStatus = projectedBalance >= 2500 ? "Confortável" : projectedBalance >= 1200 ? "Controlada" : "Atenção";

  function addIncome() {
    const amount = Number(newIncome.amount.replace(",", "."));
    if (!newIncome.name.trim() || !newIncome.source.trim() || !amount || !newIncome.day.trim()) return;
    setIncome((current) => [
      ...current,
      {
        id: Date.now(),
        name: newIncome.name.trim(),
        source: newIncome.source.trim(),
        amount,
        range: newIncome.day.trim(),
        confidence: newIncome.confidence
      }
    ]);
    setNewIncome({ name: "", source: "", amount: "", day: "", confidence: "Média" });
    setShowAddIncome(false);
    setTab("receitas");
  }

  function addExpense() {
    const amount = Number(newExpense.amount.replace(",", "."));
    if (!newExpense.name || !amount) return;
    setExpenses((current) => [
      ...current,
      { id: Date.now(), name: newExpense.name, category: newExpense.category.trim(), amount, due: newExpense.due.trim(), urgency: newExpense.urgency, status: "Pendente" }
    ]);
    setNewExpense({ name: "", category: "Outros", amount: "", due: "", urgency: "Média", status: "Pendente" });
    setShowAdd(false);
    setTab("gastos");
  }

  function startEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setNewExpense({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount).replace(".", ","),
      due: expense.due,
      urgency: expense.urgency,
      status: expense.status
    });
  }

  function saveEditedExpense() {
    if (!editingExpense) return;
    const amount = Number(newExpense.amount.replace(",", "."));
    if (!newExpense.name.trim() || !amount) return;
    setExpenses((current) => current.map((expense) =>
      expense.id === editingExpense.id
        ? { ...expense, name: newExpense.name.trim(), category: newExpense.category.trim(), amount, due: newExpense.due.trim(), urgency: newExpense.urgency, status: newExpense.status }
        : expense
    ));
    setEditingExpense(null);
    setNewExpense({ name: "", category: "Outros", amount: "", due: "", urgency: "Média", status: "Pendente" });
  }

  function deleteExpense(id: number) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;
    if (!window.confirm("Excluir a despesa \"" + expense.name + "\"? Esta ação não pode ser desfeita.")) return;
    setExpenses((current) => current.filter((item) => item.id !== id));
  }

  function togglePaid(id: number) {
    setExpenses((current) => current.map((e) => e.id === id ? { ...e, status: e.status === "Pago" ? "Pendente" : "Pago" } : e));
    const item = expenses.find((e) => e.id === id);
    if (item) setBalance((v) => item.status === "Pago" ? v - item.amount : v + item.amount);
  }

  const nav = [
    ["visao", "Visão geral", "grid"],
    ["gastos", "Despesas", "wallet"],
    ["receitas", "Receitas", "arrow"],
    ["investimentos", "Investimentos", "trend"],
    ["analise", "Análise geral", "chart"]
  ] as const;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <NexoLogo />
        <div className="profile"><div className="avatar">NX</div><div><strong>Nexo</strong><span>Gestão financeira</span></div></div>
        <nav>{nav.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => setTab(id)}><Icon name={icon}/><span>{label}</span></button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="mini-card"><Icon name="shield"/><div><strong>Controle ativo</strong><span>Dados organizados</span></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p><h1>{tab === "visao" ? "Seu dinheiro, em perspectiva." : nav.find((n) => n[0] === tab)?.[1]}</h1></div>
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
                  {[...pending].sort((a,b) => { const au = a.urgency === "Alta" ? 0 : a.urgency === "Média" ? 1 : 2; const bu = b.urgency === "Alta" ? 0 : b.urgency === "Média" ? 1 : 2; const ad = a.due.trim() ? 0 : 1; const bd = b.due.trim() ? 0 : 1; const aday = a.due.trim() ? Number(a.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; const bday = b.due.trim() ? Number(b.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; return au - bu || ad - bd || aday - bday; }).map((e) => (
                    <div className="commitment-card" key={e.id}>
                      <div className={"date-box " + (e.urgency === "Alta" ? "danger" : e.urgency === "Média" ? "medium" : "")}>
                        <strong>{e.due ? e.due.split("/")[0] : "—"}</strong><span>{e.due ? "OUT" : "SEM DATA"}</span>
                      </div>
                      <div className="commitment-main">
                        <div className="commitment-title"><strong>{e.name}</strong><span className={"urgency " + e.urgency.toLowerCase()}>{e.urgency}</span></div>
                        <span>{e.category || "Sem categoria"} · {money(e.amount)}</span>
                      </div>
                      <div className="commitment-alert">
                        <span className={e.urgency === "Alta" ? "alert-mark red" : "alert-mark blue"}>{e.urgency === "Alta" ? "!" : "i"}</span>
                        <p>{e.urgency === "Alta" ? "Prioridade: separe este valor antes do vencimento." : "Planeje este pagamento para não comprometer o saldo."}</p>
                      </div>
                      <strong className="commitment-value">{money(e.amount)}</strong>
                    </div>
                  ))}
                  <div className="commitments-total"><span>Total de gastos pendentes</span><strong>{money(totalPending)}</strong></div>                </div>
              </div>

              <div className="panel calendar-panel">
                <div className="panel-heading"><div><h2>Calendário financeiro</h2><p>Escolha o mês para visualizar pagamentos e recebimentos previstos.</p></div></div>
                <FinancialCalendar expenses={expenses} income={income} onAddExpense={(due) => { setNewExpense((current) => ({ ...current, due })); setShowAdd(true); }} onAddIncome={(day) => { setNewIncome((current) => ({ ...current, day })); setShowAddIncome(true); }} />
              </div>
            </section>

            <section className="panel financial-feedback">
              <div className="panel-heading">
                <div><p className="eyebrow">FEEDBACK</p></div>
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
            </section>
          </>
        )}

        {tab === "gastos" && <ExpenseView expenses={expenses} onToggle={togglePaid} onAdd={() => setShowAdd(true)} onEdit={startEditExpense} onDelete={deleteExpense} />}
        {tab === "receitas" && <IncomeView income={income} onAdd={() => setShowAddIncome(true)} />}
        {tab === "investimentos" && <InvestmentView balance={balance} />}
        {tab === "analise" && <AnalysisView expenses={expenses} income={income} expectedIncome={expectedIncome} />}

        <footer>Nexo organiza estimativas e decisões. Não substitui aconselhamento financeiro profissional.</footer>
      </section>

      {(showAdd || editingExpense || showAddIncome) && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target !== e.currentTarget) return; setShowAdd(false); setShowAddIncome(false); setEditingExpense(null); }}><div className="modal">
          {showAddIncome ? (
            <>
              <div className="modal-head"><div><p className="eyebrow">NOVA RECEITA</p><h2>Adicionar receita</h2></div><button className="close" onClick={() => setShowAddIncome(false)}>×</button></div>
              <label>Descrição da receita<input value={newIncome.name} onChange={(e) => setNewIncome({...newIncome, name:e.target.value})} placeholder="Ex.: salário, freelance, aluguel recebido"/></label>
              <label>Origem da receita<input value={newIncome.source} onChange={(e) => setNewIncome({...newIncome, source:e.target.value})} placeholder="Ex.: empresa, cliente ou pessoa"/></label>
              <div className="form-grid"><label>Valor<input inputMode="decimal" value={newIncome.amount} onChange={(e) => setNewIncome({...newIncome, amount:e.target.value})} placeholder="0,00"/></label><label>Dia ou período<input value={newIncome.day} onChange={(e) => setNewIncome({...newIncome, day:e.target.value})} placeholder="Ex.: 13/10 ou 13–15/10"/></label></div>
              <label>Confiabilidade<select value={newIncome.confidence} onChange={(e) => setNewIncome({...newIncome, confidence:e.target.value as Income["confidence"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
              <button className="primary full" onClick={addIncome}>Adicionar receita</button>
            </>
          ) : (
            <>
              <div className="modal-head"><div><p className="eyebrow">{editingExpense ? "EDITAR DESPESA" : "NOVA DESPESA"}</p><h2>{editingExpense ? "Alterar gasto" : "Adicionar gasto"}</h2></div><button className="close" onClick={() => { setShowAdd(false); setEditingExpense(null); }}>×</button></div><label>Descrição<input value={newExpense.name} onChange={(e) => setNewExpense({...newExpense, name:e.target.value})} placeholder="Ex.: passagem aérea"/></label><div className="form-grid"><label>Categoria<input value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category:e.target.value})} placeholder="Opcional"/></label><label>Valor<input inputMode="decimal" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount:e.target.value})} placeholder="0,00"/></label></div><div className="form-grid"><label>Vencimento<input value={newExpense.due} onChange={(e) => setNewExpense({...newExpense, due:e.target.value})} placeholder="Opcional — ex.: 15/10"/></label><label>Urgência<select value={newExpense.urgency} onChange={(e) => setNewExpense({...newExpense, urgency:e.target.value as Expense["urgency"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label></div>{editingExpense && <label>Status<select value={newExpense.status} onChange={(e) => setNewExpense({...newExpense, status:e.target.value as Expense["status"]})}><option>Pendente</option><option>Pago</option></select></label>}<button className="primary full" onClick={editingExpense ? saveEditedExpense : addExpense}>{editingExpense ? "Salvar alterações" : "Adicionar ao planejamento"}</button>
            </>
          )}
        </div></div>}
    </main>
  );
}

function ExpenseView({ expenses, onToggle, onAdd, onEdit, onDelete }: { expenses: Expense[]; onToggle: (id:number)=>void; onAdd:()=>void; onEdit:(expense: Expense)=>void; onDelete:(id:number)=>void }) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const total = expenses.reduce((s,e)=>s+e.amount,0);
  return <section className="page-section"><div className="summary-strip"><div><span>Total planejado</span><strong>{money(total)}</strong></div><div><span>Pagos</span><strong>{expenses.filter(e=>e.status==="Pago").length}</strong></div></div><div className="panel"><div className="panel-heading"><div><h2>Todos os gastos</h2><p>Ordene suas decisões pela urgência e pelo impacto no saldo.</p></div><button className="primary small" onClick={onAdd}><Icon name="plus"/> Novo gasto</button></div><div className="table"><div className="table-head"><span>Despesa</span><span>Prazo</span><span>Urgência</span><span>Valor</span><span>Status</span><span>Ações</span></div>{[...expenses].sort((a,b) => { const au = a.urgency === "Alta" ? 0 : a.urgency === "Média" ? 1 : 2; const bu = b.urgency === "Alta" ? 0 : b.urgency === "Média" ? 1 : 2; const ad = a.due.trim() ? 0 : 1; const bd = b.due.trim() ? 0 : 1; const aday = a.due.trim() ? Number(a.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; const bday = b.due.trim() ? Number(b.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; return au - bu || ad - bd || aday - bday; }).map(e=><div className="table-row expense-table-row" key={e.id}><div><strong>{e.name}</strong><span>{e.category || "Sem categoria"}</span></div><span>{e.due || "Sem data"}</span><span className={"urgency " + e.urgency.toLowerCase()}>{e.urgency}</span><strong>{money(e.amount)}</strong><button className={e.status==="Pago"?"status paid":"status"} onClick={()=>onToggle(e.id)}>{e.status}</button><div className="expense-actions"><button type="button" className="action-menu-button" aria-label={"Ações para " + e.name} onClick={()=>setOpenMenu(openMenu === e.id ? null : e.id)}>⋮</button>{openMenu === e.id && <div className="action-menu"><button type="button" onClick={()=>{setOpenMenu(null);onEdit(e)}}>Alterar</button><button type="button" className="delete-action" onClick={()=>{setOpenMenu(null);onDelete(e.id)}}>Excluir</button></div>}</div></div>)}</div></div></section>
}

function IncomeView({ income, onAdd }: { income: Income[]; onAdd: () => void }) {
  return <section className="page-section"><div className="summary-strip"><div><span>Entradas estimadas</span><strong>{money(income.reduce((s,e)=>s+e.amount,0))}</strong></div><div><span>Maior entrada</span><strong>{money(Math.max(...income.map(e=>e.amount)))}</strong></div><div><span>Receitas cadastradas</span><strong>{income.length}</strong></div></div><div className="panel"><div className="panel-heading"><div><h2>Receitas futuras</h2><p>Registre o dia ou período, o valor, a confiabilidade e a origem de cada receita.</p></div><button type="button" className="primary small" onClick={onAdd}><Icon name="plus"/> Nova receita</button></div><div className="income-cards">{income.map(i=><div className="income-card" key={i.id}><div className="income-icon"><Icon name="arrow"/></div><div><strong>{i.name}</strong><span>Origem: {i.source}</span><span>Recebimento: {i.range}</span></div><strong>{money(i.amount)}</strong><span className={"confidence " + i.confidence.toLowerCase()}>{i.confidence} confiança</span></div>)}</div></div></section>;
}

function InvestmentView({ balance }: { balance: number }) {
  const principal = 500;
  const annual = 0.1198;
  const days = 185;
  const gross = principal * Math.pow(1 + annual, days/365);
  const gain = gross - principal;
  return <section className="page-section"><div className="summary-strip"><div><span>Capital disponível hoje</span><strong>{money(balance)}</strong></div><div><span>Exemplo investido</span><strong>{money(principal)}</strong></div><div><span>Prazo estimado</span><strong>185 dias</strong></div></div><div className="grid-2"><div className="panel"><div className="panel-heading"><div><h2>Simulador de investimento</h2><p>Exemplo educacional de juros compostos.</p></div><Icon name="trend"/></div><div className="investment-result"><span>Valor projetado</span><strong>{money(gross)}</strong><small>Ganho bruto estimado: {money(gain)}</small></div><div className="formula"><span>Capital</span><b>{money(principal)}</b><span>Taxa anual</span><b>11,98% a.a.</b><span>Resgate</span><b>Após 185 dias</b></div></div><div className="panel recommendation-panel"><div className="panel-heading"><div><h2>Regra de segurança</h2><p>Investir não deve comprometer contas essenciais.</p></div></div><ul><li>Primeiro preserve despesas de alta urgência e uma reserva de liquidez.</li><li>Compare prazo, liquidez, risco, tributação e proteção do produto antes de investir.</li><li>O retorno mostrado é uma simulação; taxas reais e condições podem variar.</li></ul></div></div></section>;
}

function AnalysisView({ expenses, income, expectedIncome }: { expenses: Expense[]; income: Income[]; expectedIncome:number }) {
  const [period, setPeriod] = useState<"mensal" | "semanal">("mensal");
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const parseDayMonth = (value: string) => {
    const match = value.match(/^(\\d{1,2})[\\/](\\d{1,2})/);
    if (!match) return null;
    const date = new Date(today.getFullYear(), Number(match[2]) - 1, Number(match[1]));
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const incomeStartDate = (value: string) => {
    const match = value.match(/^(\\d{1,2})[–-](\\d{1,2})[\\/](\\d{1,2})/);
    if (!match) return null;
    const date = new Date(today.getFullYear(), Number(match[3]) - 1, Number(match[1]));
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const incomeInWeek = income.filter((item) => {
    const startDate = incomeStartDate(item.range);
    if (!startDate) return false;
    return startDate >= weekStart && startDate <= weekEnd;
  });

  const expensesInWeek = expenses.filter((item) => {
    const dueDate = parseDayMonth(item.due);
    if (!dueDate) return false;
    return dueDate >= weekStart && dueDate <= weekEnd;
  });

  const totalExpenses = expenses.reduce((s,e)=>s+e.amount,0);
  const essential = expenses.filter(e=>e.urgency !== "Baixa").reduce((s,e)=>s+e.amount,0);
  const discretionary = expenses.filter(e=>e.urgency === "Baixa").reduce((s,e)=>s+e.amount,0);
  const highUrgency = expenses.filter(e=>e.urgency === "Alta").reduce((s,e)=>s+e.amount,0);
  const weeklyExpenseTotal = expensesInWeek.reduce((s,e)=>s+e.amount,0);
  const weeklyIncomeTotal = incomeInWeek.reduce((s,e)=>s+e.amount,0);

  const projectedSavings = Math.max(0, expectedIncome - totalExpenses);
  const savingsRate = expectedIncome ? Math.round(projectedSavings / expectedIncome * 100) : 0;
  const weeklyProjectedBalance = weeklyIncomeTotal - weeklyExpenseTotal;
  const weeklyHighUrgency = expensesInWeek.filter(e=>e.urgency === "Alta").reduce((s,e)=>s+e.amount,0);

  const investmentPrincipal = 500;
  const annualRate = 0.1198;
  const investmentDays = 185;
  const investmentProjected = investmentPrincipal * Math.pow(1 + annualRate, investmentDays / 365);
  const investmentGain = investmentProjected - investmentPrincipal;
  const incomeCoverage = totalExpenses ? Math.round(expectedIncome / totalExpenses * 100) : 100;
  const weeklyIncomeCoverage = weeklyExpenseTotal ? Math.round(weeklyIncomeTotal / weeklyExpenseTotal * 100) : 100;
  const periodExpenses = period === "semanal" ? expensesInWeek : expenses;
  const periodIncome = period === "semanal" ? incomeInWeek : income;
  const periodIncomeTotal = period === "semanal" ? weeklyIncomeTotal : expectedIncome;
  const periodExpenseTotal = period === "semanal" ? weeklyExpenseTotal : totalExpenses;
  const periodBalance = period === "semanal" ? weeklyProjectedBalance : expectedIncome - totalExpenses;
  const periodHighUrgency = period === "semanal" ? weeklyHighUrgency : highUrgency;
  const periodIncomeCoverage = period === "semanal" ? weeklyIncomeCoverage : incomeCoverage;
  const periodLabel = period === "semanal"
    ? `${weekStart.toLocaleDateString("pt-BR")} a ${weekEnd.toLocaleDateString("pt-BR")}`
    : "estimados no mês";

  return (
    <section className="page-section general-analysis">
      <div className="analysis-hero panel">
        <div>
          <p className="eyebrow">ANÁLISE GERAL</p>
          <h2>Visão aprofundada das suas finanças</h2>
          <p>Compare o comportamento mensal e semanal de entradas, despesas e investimentos em um único painel.</p>
        </div>
        <div className="analysis-period-toggle">
          <button className={period === "mensal" ? "active" : ""} onClick={() => setPeriod("mensal")}>Mensal</button>
          <button className={period === "semanal" ? "active" : ""} onClick={() => setPeriod("semanal")}>Semanal</button>
        </div>
      </div>

      <div className="analysis-kpis">
        <div><span>Recebimentos</span><strong>{money(periodIncomeTotal)}</strong><small>{period === "mensal" ? "estimados no mês" : "previstos na semana"}</small></div>
        <div><span>Despesas</span><strong>{money(periodExpenseTotal)}</strong><small>{period === "mensal" ? "planejadas no mês" : "com vencimento na semana"}</small></div>
        <div><span>Saldo operacional</span><strong>{money(periodBalance)}</strong><small>{period === "mensal" ? "entradas menos despesas" : "recebimentos menos despesas da semana"}</small></div>
        <div><span>Investimentos</span><strong>{period === "mensal" ? money(investmentGain) : money(0)}</strong><small>{period === "mensal" ? "ganho bruto projetado" : "movimentação prevista na semana"}</small></div>
      </div>

      {period === "semanal" && (
        <div className="panel analysis-detail">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SEMANA EM FOCO</p>
              <h2>{periodLabel}</h2>
              <p>Os valores abaixo consideram somente recebimentos e despesas com ocorrência prevista dentro desta semana.</p>
            </div>
          </div>
          <div className="analysis-detail-grid">
            <div><span>Recebimentos na semana</span><strong>{incomeInWeek.length}</strong><small>{incomeInWeek.length ? incomeInWeek.map(i => i.name).join(", ") : "Nenhum recebimento previsto"}</small></div>
            <div><span>Despesas na semana</span><strong>{expensesInWeek.length}</strong><small>{expensesInWeek.length ? expensesInWeek.map(e => e.name).join(", ") : "Nenhuma despesa com vencimento"}</small></div>
          </div>
        </div>
      )}

      <div className="analysis-sections">
        <div className="panel analysis-detail">
          <div className="panel-heading"><div><h2>Recebimentos</h2><p>{period === "semanal" ? "Somente as entradas previstas para a semana selecionada." : "Leitura das entradas previstas e da capacidade de cobertura."}</p></div><Icon name="arrow"/></div>
          <div className="analysis-detail-grid">
            <div><span>Total previsto</span><strong>{money(periodIncomeTotal)}</strong><small>{period === "semanal" ? (incomeInWeek.length ? periodLabel : "Nenhuma entrada prevista na semana") : "3 entradas registradas"}</small></div>
            <div><span>Cobertura das despesas</span><strong>{periodIncomeCoverage}%</strong><small>recebimentos ÷ despesas do período</small></div>
          </div>
          <div className="analysis-bars">
            {periodIncome.length ? periodIncome.map((item) => (
              <div key={item.id}><span>{item.name}</span><div><i style={{width: Math.min(100, item.amount / Math.max(1, periodIncomeTotal) * 100) + "%"}}/></div><strong>{money(item.amount)}</strong></div>
            )) : <div className="analysis-empty"><span>Nenhum recebimento previsto para esta semana.</span></div>}
          </div>
        </div>

        <div className="panel analysis-detail">
          <div className="panel-heading"><div><h2>Despesas</h2><p>{period === "semanal" ? "Somente despesas com vencimento dentro da semana em análise." : "Composição, urgência e impacto sobre o dinheiro disponível."}</p></div><Icon name="wallet"/></div>
          <div className="analysis-detail-grid">
            <div><span>Total planejado</span><strong>{money(periodExpenseTotal)}</strong><small>{period === "semanal" ? `${expensesInWeek.length} compromisso(s) na semana` : "5 compromissos"}</small></div>
            <div><span>Alta urgência</span><strong>{money(periodHighUrgency)}</strong><small>valor que deve ser protegido primeiro</small></div>
          </div>
          {period === "semanal" ? (
            <div className="expense-split">
              {expensesInWeek.length ? expensesInWeek.map((expense) => (
                <div key={expense.id}><span>{expense.name} · {expense.due}</span><strong>{money(expense.amount)}</strong><div className="split-track"><i style={{width: Math.min(100, weeklyExpenseTotal ? expense.amount / weeklyExpenseTotal * 100 : 0) + "%"}}/></div></div>
              )) : <div><span>Nenhuma despesa com vencimento nesta semana.</span><strong>R$ 0,00</strong><div className="split-track"><i style={{width: "0%"}}/></div></div>}
            </div>
          ) : (
            <div className="expense-split">
              <div><span>Essenciais e compromissos</span><strong>{money(essential)}</strong><div className="split-track"><i style={{width: Math.min(100, totalExpenses ? essential / totalExpenses * 100 : 0) + "%"}}/></div></div>
              <div><span>Discricionários</span><strong>{money(discretionary)}</strong><div className="split-track"><i style={{width: Math.min(100, totalExpenses ? discretionary / totalExpenses * 100 : 0) + "%"}}/></div></div>
            </div>
          )}
        </div>

        <div className="panel analysis-detail">
          <div className="panel-heading"><div><h2>Investimentos</h2><p>{period === "semanal" ? "Movimentações de investimentos que tenham ocorrência na semana." : "Acompanhe capital aplicado, prazo e retorno projetado."}</p></div><Icon name="trend"/></div>
          {period === "semanal" ? (
            <div className="investment-analysis-highlight">
              <span>Movimentação na semana</span>
              <strong>R$ 0,00</strong>
              <small>Nenhum aporte, resgate ou vencimento de investimento está registrado para esta semana.</small>
            </div>
          ) : (
            <>
              <div className="investment-analysis-highlight"><span>Capital considerado</span><strong>{money(investmentPrincipal)}</strong><small>simulação a 11,98% a.a. por 185 dias</small></div>
              <div className="investment-analysis-row"><span>Valor projetado no vencimento</span><strong>{money(investmentProjected)}</strong></div>
              <div className="investment-analysis-row"><span>Ganho bruto estimado</span><strong>{money(investmentGain)}</strong></div>
              <div className="investment-analysis-row"><span>Participação do ganho sobre o capital</span><strong>{((investmentGain / investmentPrincipal) * 100).toFixed(2).replace(".", ",")}%</strong></div>
            </>
          )}
        </div>
      </div>

      <div className="panel analysis-conclusion">
        <div className="panel-heading"><div><p className="eyebrow">LEITURA FINANCEIRA</p><h2>{period === "semanal" ? "O que acontece nesta semana" : "O que os números indicam"}</h2></div></div>
        <div className="analysis-conclusion-grid">
          <div><span>Resultado projetado</span><strong>{money(period === "semanal" ? weeklyProjectedBalance : projectedSavings)}</strong><p>{period === "semanal" ? "recebimentos previstos menos despesas com vencimento na semana." : "potencial restante após os gastos planejados."}</p></div>
          <div><span>Cobertura</span><strong>{periodIncomeCoverage}%</strong><p>{period === "semanal" ? "capacidade dos recebimentos da semana de cobrir as despesas da própria semana." : "relação entre entradas previstas e despesas planejadas."}</p></div>
          <div><span>Diretriz</span><strong>{period === "semanal" ? (weeklyHighUrgency > 0 ? "Proteger pagamentos" : expensesInWeek.length ? "Acompanhar vencimentos" : "Sem pressão financeira") : (highUrgency > 0 ? "Proteger liquidez" : "Aumentar reserva")}</strong><p>{period === "semanal" ? (weeklyHighUrgency > 0 ? "Priorize as despesas de alta urgência que vencem nesta semana." : expensesInWeek.length ? "Monitore os vencimentos e preserve o saldo para os compromissos previstos." : "Não há despesas com vencimento registrado nesta semana; mantenha o planejamento das próximas datas.") : (highUrgency > 0 ? "Separe os compromissos de alta urgência antes de ampliar gastos ou investimentos." : "Com os compromissos controlados, priorize a formação de reserva e investimentos.")}</p></div>
        </div>
      </div>
    </section>
  );
}
function FinancialCalendar({
  expenses,
  income,
  onAddExpense,
  onAddIncome
}: {
  expenses: Expense[];
  income: Income[];
  onAddExpense: (due: string) => void;
  onAddIncome: (day: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return today.getMonth();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const today = new Date();
    return today.getFullYear();
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const previousMonthDays = new Date(selectedYear, selectedMonth, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const events: Record<number, { type: "payment" | "income"; label: string; amount: number; detail: string }[]> = {};

  expenses.forEach((expense) => {
    const match = expense.due.match(/^(\\d{1,2})[\\/](\\d{1,2})/);
    if (!match) return;
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month === selectedMonth && day >= 1 && day <= daysInMonth) {
      if (!events[day]) events[day] = [];
      events[day].push({
        type: "payment",
        label: expense.name,
        amount: expense.amount,
        detail: (expense.category || "Despesa") + " · " + expense.urgency + " urgência"
      });
    }
  });

  income.forEach((item) => {
    const match = item.range.match(/^(\\d{1,2})[–-](?:\\d{1,2})[\\/](\\d{1,2})|^(\\d{1,2})[\\/](\\d{1,2})/);
    if (!match) return;
    const day = Number(match[1] || match[3]);
    const month = Number(match[2] || match[4]) - 1;
    if (month === selectedMonth && day >= 1 && day <= daysInMonth) {
      if (!events[day]) events[day] = [];
      events[day].push({
        type: "income",
        label: item.name,
        amount: item.amount,
        detail: (item.source || "Receita") + " · confiança " + item.confidence
      });
    }
  });

  function changeMonth(delta: number) {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
    setSelectedDay(null);
  }

  function selectMonth(month: number) {
    setSelectedMonth(month);
    setSelectedDay(null);
  }

  const isViewingCurrentMonth =
    selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();

  const selectedEvents = selectedDay ? (events[selectedDay] || []) : [];
  const selectedDateLabel = selectedDay
    ? new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
    : "";

  const selectedDateValue = selectedDay
    ? String(selectedDay).padStart(2, "0") + "/" + String(selectedMonth + 1).padStart(2, "0")
    : "";

  return (
    <div className="financial-calendar">
      <div className="calendar-controls">
        <button type="button" className="calendar-nav" onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button>
        <select
          className="calendar-month-select"
          value={selectedMonth}
          onChange={(event) => selectMonth(Number(event.target.value))}
          aria-label="Escolher mês"
        >
          {months.map((month, index) => <option value={index} key={month}>{month} {selectedYear}</option>)}
        </select>
        <button type="button" className="calendar-nav" onClick={() => changeMonth(1)} aria-label="Próximo mês">›</button>
      </div>

      <div className="calendar-weekdays">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid">
        {Array.from({ length: totalCells }, (_, index) => {
          const dayNumber = index - firstDay + 1;
          const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
          const displayDay = dayNumber < 1
            ? previousMonthDays + dayNumber
            : dayNumber > daysInMonth
              ? dayNumber - daysInMonth
              : dayNumber;
          const dayEvents = inMonth ? (events[dayNumber] || []) : [];
          const isToday = isViewingCurrentMonth && dayNumber === currentDate.getDate();
          const isSelected = inMonth && selectedDay === dayNumber;

          return (
            <button
              type="button"
              className={"calendar-day " + (!inMonth ? "muted " : "") + (isToday ? "today " : "") + (isSelected ? "selected" : "")}
              key={index}
              disabled={!inMonth}
              onClick={() => inMonth && setSelectedDay(dayNumber)}
              aria-label={inMonth ? "Abrir detalhes do dia " + displayDay : undefined}
            >
              <strong>{displayDay}</strong>
              {dayEvents.slice(0, 2).map((event, eventIndex) => (
                <span key={event.type + event.label + eventIndex} className={"calendar-event " + event.type}>
                  {event.type === "income" ? "↑ " : "↓ "}{event.label}
                </span>
              ))}
              {dayEvents.length > 2 && <small className="calendar-more-events">+{dayEvents.length - 2} eventos</small>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="calendar-day-details">
          <div className="calendar-day-details-head">
            <div>
              <p className="eyebrow">DIA SELECIONADO</p>
              <h3>{selectedDateLabel}</h3>
            </div>
            <button type="button" className="calendar-close-day" onClick={() => setSelectedDay(null)} aria-label="Fechar detalhes">×</button>
          </div>

          {selectedEvents.length ? (
            <div className="calendar-events-list">
              {selectedEvents.map((event, index) => (
                <div className={"calendar-detail-item " + event.type} key={event.type + event.label + index}>
                  <div className="calendar-detail-icon">{event.type === "income" ? "↑" : "↓"}</div>
                  <div className="calendar-detail-main">
                    <strong>{event.label}</strong>
                    <span>{event.detail}</span>
                  </div>
                  <strong className="calendar-detail-amount">{money(event.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="calendar-empty-day">Nenhum pagamento ou recebimento registrado para este dia.</p>
          )}

          <div className="calendar-day-actions">
            <button type="button" className="calendar-add-button expense" onClick={() => onAddExpense(selectedDateValue)}>+ Adicionar despesa</button>
            <button type="button" className="calendar-add-button income" onClick={() => onAddIncome(selectedDateValue)}>+ Adicionar recebimento</button>
          </div>
        </div>
      )}

      <div className="calendar-legend">
        <span><i className="dot income-dot" /> Recebimento</span>
        <span><i className="dot expense-dot" /> Pagamento</span>
        <span>Selecione um dia para ver os detalhes</span>
      </div>
    </div>
  );
}
