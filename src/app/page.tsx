'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const initialExpenses: Expense[] = [];

const initialIncome: Income[] = [];

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ExpenseAlert = {
  expense: Expense;
  daysUntil: number;
  dueDate: Date;
};

function getNextExpenseAlert(expenses: Expense[], referenceDate = new Date()): ExpenseAlert | null {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12);
  const alerts = expenses.flatMap((expense) => {
    if (expense.status !== "Pendente" || !expense.due?.trim()) return [];
    const match = expense.due.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) return [];
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month < 0 || month > 11 || day < 1 || day > 31) return [];
    let dueDate = new Date(today.getFullYear(), month, day, 12);
    if (dueDate.getMonth() !== month || dueDate.getDate() !== day) return [];

    // Datas de meses anteriores representam o próximo ciclo anual; datas já vencidas
    // neste mês permanecem como pendências atrasadas, em vez de desaparecerem do alerta.
    if (month < today.getMonth()) {
      dueDate = new Date(today.getFullYear() + 1, month, day, 12);
    }
    const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    return [{ expense, daysUntil, dueDate }];
  });
  // Primeiro prioriza pagamentos vencidos; entre eles, o vencimento mais antigo.
  alerts.sort((a, b) => {
    const aOverdue = a.daysUntil < 0;
    const bOverdue = b.daysUntil < 0;
    if (aOverdue && bOverdue) return a.dueDate.getTime() - b.dueDate.getTime();
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
  return alerts.length ? alerts[0] : null;
}

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
    shield: "M12 3l7 3v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6z",
    x: "M6 6l12 12M18 6L6 18"
  };
  return <svg viewBox="0 0 24 24" className="icon" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}

function FinanceApp({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("visao");
  const [showNotifications, setShowNotifications] = useState(false);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [income, setIncome] = useState(initialIncome);
  const [balance, setBalance] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function loadFinancialData() {
      try {
        const { data: cloudRow, error } = await supabase
          .from("user_financial_data")
          .select("data")
          .eq("user_id", userId)
          .eq("section", "main")
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (cloudRow?.data) {
          const saved = cloudRow.data as { expenses?: Expense[]; income?: Income[]; balance?: number };
          if (Array.isArray(saved.expenses)) setExpenses(saved.expenses);
          if (Array.isArray(saved.income)) setIncome(saved.income);
          if (typeof saved.balance === "number") setBalance(saved.balance);
        } else {
          // Novas contas começam vazias; não importa dados locais que podem pertencer a outro usuário.
          const emptyData = { expenses: initialExpenses, income: initialIncome, balance: 0 };
          const { error: saveError } = await supabase.from("user_financial_data").upsert({
            user_id: userId, section: "main", data: emptyData, updated_at: new Date().toISOString()
          }, { onConflict: "user_id,section" });
          if (saveError) throw saveError;
        }
      } catch (error) {
        console.error("Não foi possível carregar os dados financeiros da nuvem:", error);
        // Não carrega dados locais compartilhados entre contas; os dados financeiros ficam vinculados ao usuário na nuvem.
      } finally {
        if (!cancelled) setStorageLoaded(true);
      }
    }
    loadFinancialData();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!storageLoaded) return;
    const timer = setTimeout(async () => {
      const { error } = await supabase.from("user_financial_data").upsert({
        user_id: userId,
        section: "main",
        data: { expenses, income, balance },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,section" });
      if (error) console.error("Não foi possível salvar os dados financeiros na nuvem:", error);
    }, 350);
    return () => clearTimeout(timer);
  }, [expenses, income, balance, storageLoaded, userId]);

  const [newExpense, setNewExpense] = useState({ name: "", category: "", amount: "", due: "", urgency: "Média" as Expense["urgency"], status: "Pendente" as Expense["status"] });
  const [newIncome, setNewIncome] = useState({ name: "", source: "", amount: "", day: "", confidence: "Média" as Income["confidence"] });


  const pending = expenses.filter((e) => e.status === "Pendente");
  const totalPending = pending.reduce((sum, e) => sum + e.amount, 0);
  const expectedIncome = income.reduce((sum, e) => sum + e.amount, 0);
  const projectedBalance = balance + expectedIncome - totalPending;
  const savingsRate = expectedIncome > 0 ? Math.max(0, Math.min(100, Math.round((projectedBalance / expectedIncome) * 100))) : 0;

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

  function startEditIncome(item: Income) {
    setEditingIncome(item);
    setNewIncome({
      name: item.name,
      source: item.source,
      amount: String(item.amount).replace(".", ","),
      day: item.range,
      confidence: item.confidence
    });
    setShowAddIncome(false);
  }

  function saveEditedIncome() {
    if (!editingIncome) return;
    const amount = Number(newIncome.amount.replace(",", "."));
    if (!newIncome.name.trim() || !newIncome.source.trim() || !amount || !newIncome.day.trim()) return;
    setIncome((current) => current.map((item) =>
      item.id === editingIncome.id
        ? { ...item, name: newIncome.name.trim(), source: newIncome.source.trim(), amount, range: newIncome.day.trim(), confidence: newIncome.confidence }
        : item
    ));
    setEditingIncome(null);
    setNewIncome({ name: "", source: "", amount: "", day: "", confidence: "Média" });
  }

  function deleteIncome(id: number) {
    const item = income.find((entry) => entry.id === id);
    if (!item) return;
    if (!window.confirm("Excluir a receita \"" + item.name + "\"? Esta ação não pode ser desfeita.")) return;
    setIncome((current) => current.filter((entry) => entry.id !== id));
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
          <button className="auth-signout" type="button" onClick={() => { void supabase.auth.signOut(); }}>Sair da conta</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p><h1>{tab === "visao" ? "Seu dinheiro, em perspectiva." : nav.find((n) => n[0] === tab)?.[1]}</h1></div>
          <div className="top-actions">
            <div className="notification-wrap">
              <button
                type="button"
                className="icon-button notification-button"
                aria-label="Ver alerta da próxima despesa"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications((open) => !open)}
              >
                <Icon name="bell"/>
                {getNextExpenseAlert(expenses) && <span className="notification-dot"/>}
              </button>
              {showNotifications && (
                <section className="notification-popover" aria-label="Alerta da próxima despesa">
                  <div className="notification-popover-head">
                    <div><span className="notification-kicker">PRÓXIMA DESPESA</span><h2>Próximo pagamento</h2></div>
                    <button type="button" className="notification-close" aria-label="Fechar alerta" onClick={() => setShowNotifications(false)}>×</button>
                  </div>
                  {(() => {
                    const alert = getNextExpenseAlert(expenses);
                    if (!alert) {
                      return <div className="notification-empty"><p>Não há despesas pendentes com vencimento futuro cadastrado.</p><button type="button" onClick={() => { setShowNotifications(false); setTab("gastos"); }}>Ver despesas</button></div>;
                    }
                    return (
                      <div className="notification-income">
                        <div className="notification-countdown">
                          <strong>{alert.daysUntil < 0 ? Math.abs(alert.daysUntil) : alert.daysUntil}</strong>
                          <span>{alert.daysUntil < 0 ? (Math.abs(alert.daysUntil) === 1 ? "dia de atraso" : "dias de atraso") : alert.daysUntil === 1 ? "dia restante" : "dias restantes"}</span>
                        </div>
                        <div className="notification-income-copy">
                          <strong>{alert.expense.name}</strong>
                          <span>Vencimento: {alert.dueDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                          <b className="notification-receive-amount">A pagar: {money(alert.expense.amount)}</b>
                        </div>
                        <p className="notification-message">
                          {alert.daysUntil < 0
                            ? `Esta despesa está vencida há ${Math.abs(alert.daysUntil)} ${Math.abs(alert.daysUntil) === 1 ? "dia" : "dias"}.`
                            : alert.daysUntil === 0
                              ? "Esta despesa vence hoje."
                              : `Faltam ${alert.daysUntil} ${alert.daysUntil === 1 ? "dia" : "dias"} para o vencimento desta despesa.`}
                        </p>
                      </div>
                    );
                  })()}
                  <button type="button" className="notification-footer" onClick={() => { setShowNotifications(false); setTab("gastos"); }}>Ver despesas cadastradas</button>
                </section>
              )}
            </div>
            <button className="primary" onClick={() => setShowAdd(true)}><Icon name="plus"/> Novo gasto</button>
          </div>
        </header>

        {tab === "visao" && (
          <>
            <section className="overview-top">
              <div className="balance-card balance-card-modern">
                <div className="card-top"><span>Saldo total disponível</span><span className="pill positive">Hoje</span></div>
                <strong className="balance">{money(balance)}</strong>
                <p className="balance-caption">Valor livre para decisões financeiras antes dos próximos compromissos.</p>
                <div className="balance-meta"><span>Saldo projetado após entradas e pagamentos</span><strong>{money(projectedBalance)}</strong></div>
                <div className="progress"><span style={{ width: Math.min(100, Math.max(0, (balance / Math.max(1, balance + totalPending)) * 100)) + "%" }}/></div>
              </div>

              <div className="panel allocation-panel">
                <div className="panel-heading"><div><h2>Resumo financeiro</h2><p>Valores calculados com base nas informações que você cadastrar.</p></div><Icon name="target"/></div>
                <div className="allocation-legend">
                  <div><span>Saldo disponível</span><strong>{money(balance)}</strong></div>
                  <div><span>Despesas pendentes</span><strong>{money(totalPending)}</strong></div>
                  <div><span>Receitas previstas</span><strong>{money(expectedIncome)}</strong></div>
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
                        <strong>{e.due ? e.due.split("/")[0] : "—"}</strong><span>{e.due ? new Date(2000, Number(e.due.split("/")[1]) - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase() : "SEM DATA"}</span>
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
                  <div className="commitments-total"><span>Somatório dos valores pendentes</span><strong>{money(totalPending)}</strong></div>                </div>
              </div>

              <div className="panel calendar-panel">
                <div className="panel-heading"><div><h2>Calendário financeiro</h2><p>Escolha o mês para visualizar pagamentos e recebimentos previstos.</p></div></div>
                <FinancialCalendar expenses={expenses} income={income}/>
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
                <div><span>Margem projetada</span><strong>{savingsRate}%</strong><small>margem projetada sobre as entradas previstas</small></div>
                <div><span>Cobertura dos compromissos</span><strong>{projectedCoverage}%</strong><small>saldo + entradas ÷ gastos pendentes</small></div>
                <div><span>Saldo após urgentes</span><strong>{money(balanceAfterHighPriority)}</strong><small>antes das demais despesas</small></div>
              </div>
            </section>
          </>
        )}

        {tab === "gastos" && <ExpenseView expenses={expenses} onToggle={togglePaid} onAdd={() => setShowAdd(true)} onEdit={startEditExpense} onDelete={deleteExpense} />}
        {tab === "receitas" && <IncomeView income={income} onAdd={() => { setNewIncome({ name: "", source: "", amount: "", day: "", confidence: "Média" }); setEditingIncome(null); setShowAddIncome(true); }} onEdit={startEditIncome} onDelete={deleteIncome} />}
        {tab === "investimentos" && <InvestmentView balance={balance} userId={userId} />}
        {tab === "analise" && <AnalysisView expenses={expenses} income={income} userId={userId} />}

        <footer>Nexo organiza estimativas e decisões. Não substitui aconselhamento financeiro profissional.</footer>
      </section>

      {(showAdd || editingExpense || showAddIncome || editingIncome) && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target !== e.currentTarget) return; setShowAdd(false); setShowAddIncome(false); setEditingExpense(null); setEditingIncome(null); }}><div className="modal">
          {(showAddIncome || editingIncome) ? (
            <>
              <div className="modal-head"><div><p className="eyebrow">{editingIncome ? "EDITAR RECEITA" : "NOVA RECEITA"}</p><h2>{editingIncome ? "Alterar receita" : "Adicionar receita"}</h2></div><button className="close" onClick={() => { setShowAddIncome(false); setEditingIncome(null); setNewIncome({ name: "", source: "", amount: "", day: "", confidence: "Média" }); }}>×</button></div>
              <label>Descrição da receita<input value={newIncome.name} onChange={(e) => setNewIncome({...newIncome, name:e.target.value})} placeholder="Descrição da receita"/></label>
              <label>Origem da receita<input value={newIncome.source} onChange={(e) => setNewIncome({...newIncome, source:e.target.value})} placeholder="Origem da receita"/></label>
              <div className="form-grid"><label>Valor<input inputMode="decimal" value={newIncome.amount} onChange={(e) => setNewIncome({...newIncome, amount:e.target.value})} placeholder="0,00"/></label><label>Dia ou período<input value={newIncome.day} onChange={(e) => setNewIncome({...newIncome, day:e.target.value})} placeholder="DD/MM ou período previsto"/></label></div>
              <label>Confiabilidade<select value={newIncome.confidence} onChange={(e) => setNewIncome({...newIncome, confidence:e.target.value as Income["confidence"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
              <button className="primary full" onClick={editingIncome ? saveEditedIncome : addIncome}>{editingIncome ? "Salvar alterações" : "Adicionar receita"}</button>
            </>
          ) : (
            <>
              <div className="modal-head"><div><p className="eyebrow">{editingExpense ? "EDITAR DESPESA" : "NOVA DESPESA"}</p><h2>{editingExpense ? "Alterar gasto" : "Adicionar gasto"}</h2></div><button className="close" onClick={() => { setShowAdd(false); setEditingExpense(null); }}>×</button></div><label>Descrição<input value={newExpense.name} onChange={(e) => setNewExpense({...newExpense, name:e.target.value})} placeholder="Descrição da despesa"/></label><div className="form-grid"><label>Categoria<input value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category:e.target.value})} placeholder="Opcional"/></label><label>Valor<input inputMode="decimal" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount:e.target.value})} placeholder="0,00"/></label></div><div className="form-grid"><label>Vencimento<input value={newExpense.due} onChange={(e) => setNewExpense({...newExpense, due:e.target.value})} placeholder="DD/MM (opcional)"/></label><label>Urgência<select value={newExpense.urgency} onChange={(e) => setNewExpense({...newExpense, urgency:e.target.value as Expense["urgency"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label></div>{editingExpense && <label>Status<select value={newExpense.status} onChange={(e) => setNewExpense({...newExpense, status:e.target.value as Expense["status"]})}><option>Pendente</option><option>Pago</option></select></label>}<button className="primary full" onClick={editingExpense ? saveEditedExpense : addExpense}>{editingExpense ? "Salvar alterações" : "Adicionar ao planejamento"}</button>
            </>
          )}
        </div></div>}
    </main>
  );
}

function ExpenseView({ expenses, onToggle, onAdd, onEdit, onDelete }: { expenses: Expense[]; onToggle: (id:number)=>void; onAdd:()=>void; onEdit:(expense: Expense)=>void; onDelete:(id:number)=>void }) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const total = expenses.reduce((s,e)=>s+e.amount,0);
  return <section className="page-section"><div className="summary-strip"><div><span>Total planejado</span><strong>{money(total)}</strong></div><div><span>Pagos</span><strong>{expenses.filter(e=>e.status==="Pago").length}</strong></div></div><div className="panel"><div className="panel-heading"><div><h2>Todos os gastos <span className="expense-count">{expenses.length}</span></h2><p>Ordene suas decisões pela urgência e pelo impacto no saldo.</p></div><button className="primary small" onClick={onAdd}><Icon name="plus"/> Novo gasto</button></div><div className="table"><div className="table-head"><span>Despesa</span><span>Prazo</span><span>Urgência</span><span>Valor</span><span>Status</span><span>Ações</span></div>{[...expenses].sort((a,b) => { const au = a.urgency === "Alta" ? 0 : a.urgency === "Média" ? 1 : 2; const bu = b.urgency === "Alta" ? 0 : b.urgency === "Média" ? 1 : 2; const ad = a.due.trim() ? 0 : 1; const bd = b.due.trim() ? 0 : 1; const aday = a.due.trim() ? Number(a.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; const bday = b.due.trim() ? Number(b.due.split("/")[0]) : Number.MAX_SAFE_INTEGER; return au - bu || ad - bd || aday - bday; }).map(e=><div className="table-row expense-table-row" key={e.id}><div><strong>{e.name}</strong><span>{e.category || "Sem categoria"}</span></div><span>{e.due || "Sem data"}</span><span className={"urgency " + e.urgency.toLowerCase()}>{e.urgency}</span><strong>{money(e.amount)}</strong><button className={e.status==="Pago"?"status paid":"status"} onClick={()=>onToggle(e.id)}>{e.status}</button><div className="expense-actions"><button type="button" className="action-menu-button" aria-label={"Ações para " + e.name} onClick={()=>setOpenMenu(openMenu === e.id ? null : e.id)}>⋮</button>{openMenu === e.id && <div className="action-menu"><button type="button" onClick={()=>{setOpenMenu(null);onEdit(e)}}>Alterar</button><button type="button" className="delete-action" onClick={()=>{setOpenMenu(null);onDelete(e.id)}}>Excluir</button></div>}</div></div>)}</div></div></section>
}

function IncomeView({ income, onAdd, onEdit, onDelete }: { income: Income[]; onAdd: () => void; onEdit: (item: Income) => void; onDelete: (id: number) => void }) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const total = income.reduce((sum, item) => sum + item.amount, 0);
  const largest = income.length ? Math.max(...income.map((item) => item.amount)) : 0;
  return <section className="page-section">
    <div className="summary-strip"><div><span>Entradas estimadas</span><strong>{money(total)}</strong></div><div><span>Maior entrada</span><strong>{money(largest)}</strong></div></div>
    <div className="panel">
      <div className="panel-heading"><div><h2>Todas as receitas <span className="expense-count">{income.length}</span></h2><p>Gerencie a descrição, origem, período, valor e confiabilidade de cada entrada.</p></div><button type="button" className="primary small" onClick={onAdd}><Icon name="plus"/> Nova receita</button></div>
      <div className="table income-table">
        <div className="table-head"><span>Receita</span><span>Origem</span><span>Recebimento</span><span>Confiabilidade</span><span>Valor</span><span>Ações</span></div>
        {income.length === 0 ? <div className="income-empty">Nenhuma receita cadastrada. Selecione “Nova receita” para adicionar uma entrada prevista.</div> : [...income].map((item) => (
          <div className="table-row income-table-row" key={item.id}>
            <div><strong>{item.name}</strong><span>Entrada prevista</span></div>
            <span>{item.source || "Não informada"}</span>
            <span>{item.range || "Sem data"}</span>
            <span className={"confidence " + item.confidence.toLowerCase()}>{item.confidence}</span>
            <strong>{money(item.amount)}</strong>
            <div className="expense-actions"><button type="button" className="action-menu-button" aria-label={"Ações para " + item.name} onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}>⋮</button>{openMenu === item.id && <div className="action-menu"><button type="button" onClick={() => { setOpenMenu(null); onEdit(item); }}>Alterar</button><button type="button" className="delete-action" onClick={() => { setOpenMenu(null); onDelete(item.id); }}>Excluir</button></div>}</div>
          </div>
        ))}
      </div>
    </div>
  </section>;
}

type YieldMethod = "anual" | "mensal" | "diario" | "cdi" | "periodo" | "valorFinal";

type InvestmentSimulation = {
  id: number;
  name: string;
  capital: number;
  annualRate?: number;
  yieldMethod?: YieldMethod;
  rate: number;
  cdiRate?: number;
  liquidity: "imediata" | "vencimento";
  targetDate: string;
  days: number;
  projectedValue: number;
  estimatedGain: number;
  methodLabel?: string;
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function parseInvestmentNumber(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return normalized === "" ? NaN : Number(normalized);
}

function InvestmentView({ balance, userId }: { balance: number; userId: string }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [capital, setCapital] = useState("");
  const [yieldMethod, setYieldMethod] = useState<YieldMethod>("anual");
  const [rate, setRate] = useState("");
  const [cdiRate, setCdiRate] = useState("");
  const [fixedFinalValue, setFixedFinalValue] = useState("");
  const [liquidity, setLiquidity] = useState<"imediata" | "vencimento">("imediata");
  const [targetDate, setTargetDate] = useState("");
  const [savedSimulations, setSavedSimulations] = useState<InvestmentSimulation[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const today = localDateString(new Date());
  const capitalValue = parseInvestmentNumber(capital);
  const rateValue = parseInvestmentNumber(rate);
  const cdiRateValue = parseInvestmentNumber(cdiRate);
  const fixedValue = parseInvestmentNumber(fixedFinalValue);
  const target = targetDate ? new Date(targetDate + "T12:00:00") : null;
  const startDate = new Date(today + "T12:00:00");
  const days = target && !Number.isNaN(target.getTime()) ? Math.max(0, Math.ceil((target.getTime() - startDate.getTime()) / 86400000)) : 0;
  const rateValid = yieldMethod === "cdi"
    ? Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 200 && Number.isFinite(cdiRateValue) && cdiRateValue > 0 && cdiRateValue <= 200
    : yieldMethod === "valorFinal"
      ? Number.isFinite(fixedValue) && fixedValue >= 0
      : Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 200;
  const validInputs = name.trim().length > 0 && Number.isFinite(capitalValue) && capitalValue > 0 && rateValid && !!targetDate && targetDate >= today;
  const effectiveAnnualRate = yieldMethod === "cdi" ? (Math.pow(1 + cdiRateValue / 100, rateValue / 100) - 1) * 100 : rateValue;
  const projectedValue = !validInputs ? 0 : yieldMethod === "valorFinal"
    ? fixedValue
    : yieldMethod === "mensal"
      ? capitalValue * Math.pow(1 + rateValue / 100, days / 30)
      : yieldMethod === "diario"
        ? capitalValue * Math.pow(1 + rateValue / 100, days)
        : yieldMethod === "periodo"
          ? capitalValue * (1 + rateValue / 100)
          : capitalValue * Math.pow(1 + effectiveAnnualRate / 100, days / 365);
  const estimatedGain = projectedValue - capitalValue;
  const methodLabels: Record<YieldMethod, string> = {
    anual: "Taxa anual", mensal: "Taxa mensal", diario: "Taxa diária",
    cdi: "Percentual do CDI", periodo: "Taxa acumulada no período", valorFinal: "Valor final informado"
  };
  const rateDescription = yieldMethod === "anual" ? "% ao ano"
    : yieldMethod === "mensal" ? "% ao mês"
      : yieldMethod === "diario" ? "% ao dia"
        : yieldMethod === "cdi" ? "% do CDI"
          : yieldMethod === "periodo" ? "% no período inteiro" : "R$ de montante final";

  useEffect(() => {
    let cancelled = false;
    async function loadInvestmentData() {
      try {
        const { data: cloudRow, error } = await supabase
          .from("user_financial_data")
          .select("data")
          .eq("user_id", userId)
          .eq("section", "investments")
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        let savedSimulationsValue: InvestmentSimulation[] = [];
        let draftValue: Record<string, unknown> | null = null;
        if (cloudRow?.data) {
          const saved = cloudRow.data as { savedSimulations?: InvestmentSimulation[]; draft?: Record<string, unknown> };
          if (Array.isArray(saved.savedSimulations)) savedSimulationsValue = saved.savedSimulations;
          if (saved.draft && typeof saved.draft === "object") draftValue = saved.draft;
        } else {
          draftValue = { name: "", capital: "", yieldMethod: "anual", rate: "", cdiRate: "", fixedFinalValue: "", liquidity: "imediata", targetDate: "" };
          const { error: saveError } = await supabase.from("user_financial_data").upsert({
            user_id: userId,
            section: "investments",
            data: { savedSimulations: savedSimulationsValue, draft: draftValue },
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,section" });
          if (saveError) throw saveError;
        }
        if (cancelled) return;
        setSavedSimulations(savedSimulationsValue);
        if (draftValue) {
          if (typeof draftValue.name === "string") setName(draftValue.name);
          if (typeof draftValue.capital === "string") setCapital(draftValue.capital);
          if (["anual", "mensal", "diario", "cdi", "periodo", "valorFinal"].includes(String(draftValue.yieldMethod))) setYieldMethod(draftValue.yieldMethod as YieldMethod);
          if (typeof draftValue.rate === "string") setRate(draftValue.rate);
          if (typeof draftValue.cdiRate === "string") setCdiRate(draftValue.cdiRate);
          if (typeof draftValue.fixedFinalValue === "string") setFixedFinalValue(draftValue.fixedFinalValue);
          if (draftValue.liquidity === "imediata" || draftValue.liquidity === "vencimento") setLiquidity(draftValue.liquidity);
          if (typeof draftValue.targetDate === "string" && draftValue.targetDate >= today) setTargetDate(draftValue.targetDate);
        }
      } catch (error) {
        console.error("Não foi possível carregar as simulações da nuvem:", error);
        // Não reutiliza simulações locais compartilhadas entre contas.
      } finally {
        if (!cancelled) setStorageLoaded(true);
      }
    }
    loadInvestmentData();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!storageLoaded) return;
    const draft = { name, capital, yieldMethod, rate, cdiRate, fixedFinalValue, liquidity, targetDate };
    const timer = setTimeout(async () => {
      const { error } = await supabase.from("user_financial_data").upsert({
        user_id: userId,
        section: "investments",
        data: { savedSimulations, draft },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,section" });
      if (error) console.error("Não foi possível salvar as simulações na nuvem:", error);
    }, 350);
    return () => clearTimeout(timer);
  }, [savedSimulations, name, capital, yieldMethod, rate, cdiRate, fixedFinalValue, liquidity, targetDate, storageLoaded, userId]);

  function saveSimulation() {
    if (!validInputs) return;
    const methodLabel = yieldMethod === "valorFinal" ? "Valor final informado"
      : yieldMethod === "cdi" ? rateValue.toLocaleString("pt-BR") + "% do CDI"
        : rateValue.toLocaleString("pt-BR") + " " + rateDescription;
    setSavedSimulations((current) => [{
      id: Date.now(), name: name.trim(), capital: capitalValue, yieldMethod,
      rate: yieldMethod === "valorFinal" ? fixedValue : rateValue,
      cdiRate: yieldMethod === "cdi" ? cdiRateValue : undefined,
      liquidity, targetDate, days, projectedValue, estimatedGain, methodLabel
    }, ...current]);
  }

  function removeSimulation(id: number) {
    setSavedSimulations((current) => current.filter((item) => item.id !== id));
  }

  return <section className="page-section investment-page">
    <div className="summary-strip">
      <div><span>Capital disponível hoje</span><strong>{money(balance)}</strong></div>
      <div><span>Simulações salvas</span><strong>{savedSimulations.length}</strong></div>
      <div><span>Prazo desta simulação</span><strong>{days} {days === 1 ? "dia" : "dias"}</strong></div>
    </div>
    <div className="grid-2 investment-layout">
      <div className="panel investment-simulator-panel">
        <div className="panel-heading"><div><h2>Simulador de investimento</h2><p>Os campos são guardados automaticamente neste navegador. Escolha como o investimento rende para calcular uma estimativa bruta.</p></div><Icon name="trend"/></div>
        <div className="investment-form">
          <label>Nome do investimento
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do investimento" maxLength={80}/>
          </label>
          <div className="form-grid">
            <label>Capital aplicado (R$)
              <input inputMode="decimal" value={capital} onChange={(event) => setCapital(event.target.value)} placeholder="Capital aplicado"/>
            </label>
            <label>Forma de rendimento
              <select value={yieldMethod} onChange={(event) => setYieldMethod(event.target.value as YieldMethod)}>
                <option value="anual">Taxa anual (% a.a.)</option>
                <option value="mensal">Taxa mensal (% a.m.)</option>
                <option value="diario">Taxa diária (% ao dia)</option>
                <option value="cdi">Percentual do CDI (% do CDI)</option>
                <option value="periodo">Taxa acumulada no período (%)</option>
                <option value="valorFinal">Informar valor final fixo (R$)</option>
              </select>
            </label>
          </div>
          {yieldMethod === "valorFinal" ? <label>Montante final estimado (R$)
            <input inputMode="decimal" value={fixedFinalValue} onChange={(event) => setFixedFinalValue(event.target.value)} placeholder="Montante final"/>
          </label> : <div className="form-grid">
            <label>{yieldMethod === "cdi" ? "Percentual do CDI (%)" : yieldMethod === "periodo" ? "Rendimento total no período (%)" : "Taxa " + rateDescription}
              <input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder={yieldMethod === "cdi" ? "Percentual do CDI" : "Taxa de rendimento"}/>
            </label>
            {yieldMethod === "cdi" && <label>CDI anual de referência (% a.a.)
              <input inputMode="decimal" value={cdiRate} onChange={(event) => setCdiRate(event.target.value)} placeholder="Taxa CDI anual atual"/>
            </label>}
          </div>}
          <label>Tipo de resgate
            <select value={liquidity} onChange={(event) => setLiquidity(event.target.value as "imediata" | "vencimento")}>
              <option value="imediata">Liquidez imediata (posso resgatar antes)</option>
              <option value="vencimento">Resgate no vencimento (data definida)</option>
            </select>
          </label>
          <label>{liquidity === "imediata" ? "Simular mantendo aplicado até" : "Data prevista para o resgate"}
            <input type="date" min={today} value={targetDate} onChange={(event) => setTargetDate(event.target.value)}/>
          </label>
          {liquidity === "imediata" && <p className="investment-helper">Mesmo com liquidez imediata, o cálculo estima quanto poderia acumular se você optar por não resgatar até a data escolhida.</p>}
          {!validInputs && <p className="investment-validation">Informe o nome, capital maior que zero, taxa válida para o método escolhido e uma data de hoje em diante.</p>}
        </div>
        <div className="investment-result">
          <span>Montante bruto estimado em {targetDate ? new Date(targetDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span>
          <strong>{validInputs ? money(projectedValue) : "—"}</strong>
          <small>Rendimento estimado: {validInputs ? money(estimatedGain) : "—"} · {days} {days === 1 ? "dia" : "dias"} de aplicação</small>
        </div>
        <div className="formula">
          <span>Capital inicial</span><b>{validInputs ? money(capitalValue) : "—"}</b>
          <span>Forma de rendimento</span><b>{methodLabels[yieldMethod]}</b>
          <span>Taxa informada</span><b>{yieldMethod === "valorFinal" ? (Number.isFinite(fixedValue) && fixedValue >= 0 ? money(fixedValue) : "—") : (Number.isFinite(rateValue) && rateValue >= 0 ? rateValue.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + " " + rateDescription : "—")}</b>
          {yieldMethod === "cdi" && <><span>CDI de referência</span><b>{Number.isFinite(cdiRateValue) && cdiRateValue > 0 ? cdiRateValue.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + "% a.a." : "—"}</b></>}
          <span>Resgate</span><b>{liquidity === "imediata" ? "Flexível" : "No vencimento"}</b>
          <span>Data de projeção</span><b>{targetDate ? new Date(targetDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</b>
        </div>
        <button type="button" className="primary full investment-save-button" onClick={saveSimulation} disabled={!validInputs}>Salvar simulação</button>
        <p className="investment-disclaimer">Estimativa matemática simplificada e bruta. Taxas mensal, diária e anual são compostas conforme o período indicado; a taxa acumulada é aplicada uma única vez; o valor final fixo é informado manualmente. A projeção de CDI é aproximada e usa o CDI anual de referência informado, sem reproduzir calendário de dias úteis nem regras específicas do produto. Não desconta IR, IOF, tarifas ou inflação e não garante rentabilidade.</p>
      </div>
      <div className="panel recommendation-panel">
        <div className="panel-heading"><div><h2>Como interpretar</h2><p>Use as condições do produto financeiro real.</p></div></div>
        <ul>
          <li>O capital digitado fica salvo automaticamente neste navegador, mesmo antes de salvar uma simulação.</li>
          <li>Escolha a periodicidade que corresponde à taxa divulgada pelo investimento.</li>
          <li>Para percentual do CDI, informe a porcentagem contratada (por exemplo, 100%) e a taxa anual de CDI usada como referência; a estimativa é aproximada.</li>
          <li>Em taxa acumulada no período, informe o rendimento total esperado para todo o intervalo selecionado.</li>
          <li>Compare liquidez, risco, tributação, carência e condições de resgate antes de decidir.</li>
        </ul>
      </div>
    </div>
    <div className="panel saved-investments-panel">
      <div className="panel-heading"><div><h2>Simulações salvas</h2><p>Ficam guardadas neste navegador para consulta e comparação.</p></div></div>
      {savedSimulations.length === 0 ? <div className="investment-empty">Nenhuma simulação salva. Preencha os dados acima e selecione “Salvar simulação”.</div> :
        <div className="saved-investment-list">{savedSimulations.map((item) => <div className="saved-investment-row" key={item.id}>
          <div className="saved-investment-name"><strong>{item.name}</strong><span>{item.liquidity === "imediata" ? "Liquidez imediata" : "Resgate no vencimento"} · até {new Date(item.targetDate + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>
          <div><span>Capital</span><strong>{money(item.capital)}</strong></div>
          <div><span>Rendimento</span><strong>{item.methodLabel || (item.annualRate ?? item.rate ?? 0).toLocaleString("pt-BR") + "% a.a."}</strong></div>
          <div><span>Rendimento bruto</span><strong className="saved-investment-gain">{money(item.estimatedGain)}</strong></div>
          <div><span>Montante projetado</span><strong>{money(item.projectedValue)}</strong></div>
          <button type="button" className="icon-button danger" onClick={() => removeSimulation(item.id)} aria-label={"Excluir simulação " + item.name}><Icon name="x"/></button>
        </div>)}</div>}
    </div>
  </section>;
}

function AnalysisView({ expenses, income, userId }: { expenses: Expense[]; income: Income[]; userId: string }) {
  const supabase = createClient();
  const [period, setPeriod] = useState<"mensal" | "semanal">("mensal");
  const [savedInvestments, setSavedInvestments] = useState<InvestmentSimulation[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadInvestments() {
      try {
        const { data, error } = await supabase.from("user_financial_data").select("data").eq("user_id", userId).eq("section", "investments").maybeSingle();
        if (error) throw error;
        const saved = data?.data as { savedSimulations?: InvestmentSimulation[] } | null;
        if (!cancelled) setSavedInvestments(Array.isArray(saved?.savedSimulations) ? saved.savedSimulations : []);
      } catch (error) {
        console.error("Não foi possível carregar os investimentos da análise:", error);
        if (!cancelled) setSavedInvestments([]);
      }
    }
    loadInvestments();
    return () => { cancelled = true; };
  }, [userId]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const inferredYear = (month: number) => {
    if (today.getMonth() === 0 && month === 12) return today.getFullYear() - 1;
    if (today.getMonth() === 11 && month === 1) return today.getFullYear() + 1;
    return today.getFullYear();
  };

  const parseDayMonth = (value: string) => {
    const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[3] ? Number(match[3]) : inferredYear(month);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const parseIncomeRange = (value: string) => {
    const text = value.trim();
    const rangeMatch = text.match(/^(\d{1,2})[–-](\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (rangeMatch) {
      const startDay = Number(rangeMatch[1]);
      const endDay = Number(rangeMatch[2]);
      const month = Number(rangeMatch[3]);
      const year = rangeMatch[4] ? Number(rangeMatch[4]) : inferredYear(month);
      const start = new Date(year, month - 1, startDay);
      const end = new Date(year, month - 1, endDay);
      if (start.getMonth() !== month - 1 || end.getMonth() !== month - 1 || end < start) return null;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const singleDate = parseDayMonth(text);
    if (!singleDate) return null;
    const end = new Date(singleDate);
    end.setHours(23, 59, 59, 999);
    return { start: singleDate, end };
  };

  const expensesInMonth = expenses.filter((item) => {
    const date = parseDayMonth(item.due);
    return !date || (date >= monthStart && date <= monthEnd);
  });
  const incomeInMonth = income.filter((item) => {
    const dates = parseIncomeRange(item.range);
    return !dates || (dates.start <= monthEnd && dates.end >= monthStart);
  });
  const incomeInWeek = income.filter((item) => {
    const dates = parseIncomeRange(item.range);
    return dates !== null && dates.start <= weekEnd && dates.end >= weekStart;
  });
  const expensesInWeek = expenses.filter((item) => {
    const date = parseDayMonth(item.due);
    return date !== null && date >= weekStart && date <= weekEnd;
  });

  const totalExpenses = expensesInMonth.reduce((s,e)=>s+e.amount,0);
  const essential = expensesInMonth.filter(e=>e.urgency !== "Baixa").reduce((s,e)=>s+e.amount,0);
  const discretionary = expensesInMonth.filter(e=>e.urgency === "Baixa").reduce((s,e)=>s+e.amount,0);
  const highUrgency = expensesInMonth.filter(e=>e.urgency === "Alta").reduce((s,e)=>s+e.amount,0);
  const weeklyExpenseTotal = expensesInWeek.reduce((s,e)=>s+e.amount,0);
  const weeklyIncomeTotal = incomeInWeek.reduce((s,e)=>s+e.amount,0);

  const monthlyIncomeTotal = incomeInMonth.reduce((s,e)=>s+e.amount,0);
  const projectedSavings = monthlyIncomeTotal - totalExpenses;
  const savingsRate = monthlyIncomeTotal ? Math.round(projectedSavings / monthlyIncomeTotal * 100) : 0;
  const weeklyProjectedBalance = weeklyIncomeTotal - weeklyExpenseTotal;
  const weeklyHighUrgency = expensesInWeek.filter(e=>e.urgency === "Alta").reduce((s,e)=>s+e.amount,0);

  const investmentsInMonth = savedInvestments.filter((item) => {
    if (!item.targetDate) return false;
    const date = new Date(item.targetDate + "T00:00:00");
    return !Number.isNaN(date.getTime()) && date >= monthStart && date <= monthEnd;
  });
  const investmentsInWeek = savedInvestments.filter((item) => {
    if (!item.targetDate) return false;
    const date = new Date(item.targetDate + "T00:00:00");
    return !Number.isNaN(date.getTime()) && date >= weekStart && date <= weekEnd;
  });
  const periodInvestments = period === "semanal" ? investmentsInWeek : investmentsInMonth;
  const investmentPrincipal = periodInvestments.reduce((sum, item) => sum + item.capital, 0);
  const investmentProjected = periodInvestments.reduce((sum, item) => sum + item.projectedValue, 0);
  const investmentGain = periodInvestments.reduce((sum, item) => sum + item.estimatedGain, 0);
  const incomeCoverage = totalExpenses ? Math.round(monthlyIncomeTotal / totalExpenses * 100) : (monthlyIncomeTotal > 0 ? 100 : 0);
  const weeklyIncomeCoverage = weeklyExpenseTotal ? Math.round(weeklyIncomeTotal / weeklyExpenseTotal * 100) : (weeklyIncomeTotal > 0 ? 100 : 0);
  const periodExpenses = period === "semanal" ? expensesInWeek : expensesInMonth;
  const periodIncome = period === "semanal" ? incomeInWeek : incomeInMonth;
  const periodIncomeTotal = period === "semanal" ? weeklyIncomeTotal : monthlyIncomeTotal;
  const periodExpenseTotal = period === "semanal" ? weeklyExpenseTotal : totalExpenses;
  const periodBalance = period === "semanal" ? weeklyProjectedBalance : monthlyIncomeTotal - totalExpenses;
  const periodHighUrgency = period === "semanal" ? weeklyHighUrgency : highUrgency;
  const periodIncomeCoverage = period === "semanal" ? weeklyIncomeCoverage : incomeCoverage;
  const periodLabel = period === "semanal"
    ? `${weekStart.toLocaleDateString("pt-BR")} a ${weekEnd.toLocaleDateString("pt-BR")}`
    : today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

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
            <div><span>Total previsto</span><strong>{money(periodIncomeTotal)}</strong><small>{period === "semanal" ? (incomeInWeek.length ? periodLabel : "Nenhuma entrada prevista na semana") : `${income.length} entradas registradas`}</small></div>
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
            <div><span>Total planejado</span><strong>{money(periodExpenseTotal)}</strong><small>{period === "semanal" ? `${expensesInWeek.length} compromisso(s) na semana` : `${expenses.length} compromissos`}</small></div>
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
          {periodInvestments.length ? (
            <>
              <div className="investment-analysis-highlight"><span>Capital das simulações com vencimento no período</span><strong>{money(investmentPrincipal)}</strong><small>{periodInvestments.length} simulação(ões) considerada(s)</small></div>
              <div className="investment-analysis-row"><span>Valor projetado no vencimento</span><strong>{money(investmentProjected)}</strong></div>
              <div className="investment-analysis-row"><span>Ganho estimado</span><strong>{money(investmentGain)}</strong></div>
              <div className="investment-analysis-row"><span>Retorno estimado sobre o capital</span><strong>{investmentPrincipal ? ((investmentGain / investmentPrincipal) * 100).toFixed(2).replace(".", ",") : "0,00"}%</strong></div>
            </>
          ) : (
            <div className="investment-analysis-highlight"><span>Sem vencimentos registrados</span><strong>{money(0)}</strong><small>Não há simulações salvas com vencimento neste período. Isso não significa que o saldo investido seja zero.</small></div>
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
function FinancialCalendar({ expenses, income }: { expenses: Expense[]; income: Income[] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const previousMonthDays = new Date(selectedYear, selectedMonth, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const events: Record<number, { type: "payment" | "income"; label: string; amount: number; status?: string }[]> = {};

  const addEvent = (day: number, event: { type: "payment" | "income"; label: string; amount: number; status?: string }) => {
    if (day < 1 || day > daysInMonth) return;
    if (!events[day]) events[day] = [];
    events[day].push(event);
  };

  expenses.forEach((expense) => {
    const match = expense.due.match(/^(\d{1,2})[\/](\d{1,2})/);
    if (!match) return;
    if (Number(match[2]) - 1 === selectedMonth) {
      addEvent(Number(match[1]), { type: "payment", label: expense.name, amount: expense.amount, status: expense.status });
    }
  });

  income.forEach((item) => {
    const rangeMatch = item.range.match(/^(\d{1,2})[–-](\d{1,2})[\/](\d{1,2})/);
    const singleMatch = item.range.match(/^(\d{1,2})[\/](\d{1,2})/);
    if (rangeMatch && Number(rangeMatch[3]) - 1 === selectedMonth) {
      const startDay = Number(rangeMatch[1]);
      const endDay = Math.min(Number(rangeMatch[2]), daysInMonth);
      for (let day = startDay; day <= endDay; day++) {
        addEvent(day, { type: "income", label: item.name + " · período previsto", amount: item.amount });
      }
    } else if (singleMatch && Number(singleMatch[2]) - 1 === selectedMonth) {
      addEvent(Number(singleMatch[1]), { type: "income", label: item.name, amount: item.amount });
    }
  });

  function changeMonth(delta: number) {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
    setSelectedDay(null);
  }

  const isViewingCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
  const selectedEvents = selectedDay ? (events[selectedDay] || []) : [];

  return (
    <div className="financial-calendar">
      <div className="calendar-controls">
        <button type="button" className="calendar-nav" onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button>
        <div className="calendar-selects">
          <span className="calendar-year-label">{selectedYear}</span>
          <select className="calendar-month-select" value={selectedMonth} onChange={(event) => { setSelectedMonth(Number(event.target.value)); setSelectedDay(null); }} aria-label="Escolher mês">
            {months.map((month, index) => <option value={index} key={month}>{month}</option>)}
          </select>
        </div>
        <button type="button" className="calendar-nav" onClick={() => changeMonth(1)} aria-label="Próximo mês">›</button>
      </div>

      <div className="calendar-weekdays">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid">
        {Array.from({ length: totalCells }, (_, index) => {
          const dayNumber = index - firstDay + 1;
          const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
          const displayDay = dayNumber < 1 ? previousMonthDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
          const dayEvents = inMonth ? (events[dayNumber] || []) : [];
          const isToday = isViewingCurrentMonth && dayNumber === currentDate.getDate();
          const isSelected = inMonth && selectedDay === dayNumber;

          return (
            <button type="button" className={"calendar-day " + (!inMonth ? "muted " : "") + (isToday ? "today " : "") + (isSelected ? "selected " : "") + (dayEvents.length ? "has-events" : "")}
              key={index} disabled={!inMonth} onClick={() => setSelectedDay(dayNumber)}
              aria-label={inMonth ? (displayDay + " de " + months[selectedMonth] + ": " + dayEvents.length + " movimentações") : undefined}>
              <strong>{displayDay}</strong>
              {dayEvents.slice(0, 2).map((event, eventIndex) => (
                <span key={event.type + event.label + eventIndex} className={"calendar-event " + event.type + (event.status === "Pago" ? " paid-event" : "")}
                  title={event.label + " — " + money(event.amount) + (event.status ? " — " + event.status : "")}>
                  {event.type === "income" ? "↑ " : "↓ "}{event.label}
                </span>
              ))}
              {dayEvents.length > 2 && <span className="calendar-more">+{dayEvents.length - 2} outros</span>}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="dot income-dot" /> Recebimento previsto</span>
        <span><i className="dot expense-dot" /> Pagamento pendente</span>
        <span><i className="dot paid-dot" /> Pago</span>
      </div>

      {selectedDay !== null && (
        <div className="calendar-day-details">
          <div className="calendar-detail-heading">
            <div><span className="calendar-detail-kicker">RESUMO DO DIA</span><strong>{selectedDay} de {months[selectedMonth]} de {selectedYear}</strong></div>
            <span className="calendar-detail-count">{selectedEvents.length} {selectedEvents.length === 1 ? "movimentação" : "movimentações"}</span>
          </div>
          {selectedEvents.length ? (
            <>
              <div className="calendar-day-totals">
                <div className="calendar-total-income"><span>Recebimentos previstos</span><strong>{money(selectedEvents.filter((event) => event.type === "income").reduce((sum, event) => sum + event.amount, 0))}</strong></div>
                <div className="calendar-total-payments"><span>Pagamentos</span><strong>{money(selectedEvents.filter((event) => event.type === "payment").reduce((sum, event) => sum + event.amount, 0))}</strong></div>
              </div>
              <div className="calendar-detail-list">
                {selectedEvents.map((event, index) => (
                  <div className={"calendar-detail-item " + (event.type === "income" ? "detail-income" : event.status === "Pago" ? "detail-paid" : "detail-payment")} key={event.type + event.label + index}>
                    <div className="calendar-detail-icon">{event.type === "income" ? "↑" : event.status === "Pago" ? "✓" : "↓"}</div>
                    <div className="calendar-detail-copy"><strong>{event.label}</strong><span>{event.type === "income" ? "Recebimento estimado" : event.status === "Pago" ? "Pagamento realizado" : "Pagamento pendente"}</span></div>
                    <strong className="calendar-detail-amount">{money(event.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="calendar-empty-day"><strong>Dia livre</strong><span>Nenhum pagamento ou recebimento registrado nesta data.</span></div>}
        </div>
      )}
    </div>
  );
}

type AuthMode = "login" | "signup" | "forgot";

function AuthScreen() {
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage(data.session
          ? "Conta criada. Você já pode usar o Nexo."
          : "Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.");
        if (!data.session) setMode("login");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setMessage("Se houver uma conta para esse e-mail, enviaremos as instruções de recuperação.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <NexoLogo />
      <p className="eyebrow">GESTÃO FINANCEIRA PESSOAL</p>
      <h1>{mode === "signup" ? "Crie sua conta" : mode === "forgot" ? "Recuperar acesso" : "Entre no Nexo"}</h1>
      <p className="auth-description">{mode === "signup" ? "Seus dados financeiros ficam vinculados à sua conta." : mode === "forgot" ? "Informe seu e-mail para receber as instruções de recuperação." : "Acesse suas despesas, receitas e simulações salvas na nuvem."}</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="nexo-email">E-mail</label>
        <input id="nexo-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
        {mode !== "forgot" && <>
          <label htmlFor="nexo-password">Senha</label>
          <input id="nexo-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
        </>}
        {message && <p className="auth-success" role="status">{message}</p>}
        {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
        <button className="primary auth-submit" type="submit" disabled={busy}>{busy ? "Aguarde..." : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar instruções" : "Entrar"}</button>
      </form>
      <div className="auth-links">
        {mode === "login" && <><button type="button" onClick={() => { setMode("signup"); setMessage(""); setErrorMessage(""); }}>Criar uma conta</button><button type="button" onClick={() => { window.location.href = "/esqueci-senha"; }}>Esqueci minha senha</button></>}
        {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMessage(""); setErrorMessage(""); }}>Voltar para entrar</button>}
      </div>
    </section>
  </main>;
}

export default function Home() {
  const supabase = createClient();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUserId(data.session?.user.id ?? null);
        setSessionChecked(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user.id ?? null);
        setSessionChecked(true);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  if (!sessionChecked) return <main className="auth-shell"><section className="auth-card"><NexoLogo /><p>Carregando sua conta...</p></section></main>;
  return userId ? <FinanceApp userId={userId} /> : <AuthScreen />;
}
