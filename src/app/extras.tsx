'use client';
import { useState } from "react";

/* ---------- Tipos compartilhados (estruturais, compatíveis com page.tsx) ---------- */
export type FlowItem = { date: string; kind: "income" | "expense"; title: string; amount: number; undated: boolean };
export type Draft = { kind: "expense" | "income"; name: string; amount: number; date: string; paid: boolean };
export type Reply =
  | { type: "create"; draft: Draft }
  | { type: "answer"; topic: "projected" | "alerts" | "pending" | "balance" }
  | { type: "ask"; message: string }
  | { type: "unknown" };
export type ReminderSettings = { lead: number; browser: boolean };
export type Alert = { key: string; kind: "income" | "expense"; title: string; amount: number; days: number; date: string };

const brl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function dayKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number); const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
}
export function brDate(key: string) { return key.slice(8, 10) + "/" + key.slice(5, 7); }
export function whenLabel(days: number) {
  if (days < 0) return `Atrasada há ${-days} ${-days === 1 ? "dia" : "dias"}`;
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
}

/* ---------- Lembretes ---------- */
export function buildAlerts(events: FlowItem[], todayKey: string, lead: number): Alert[] {
  const out: Alert[] = [];
  events.forEach((e, i) => {
    if (e.undated) return;
    const days = daysBetween(e.date, todayKey);
    const show = e.kind === "expense" ? days <= lead : days >= 0 && days <= lead;
    if (show) out.push({ key: `${e.kind}-${i}-${e.date}`, kind: e.kind, title: e.title, amount: e.amount, days, date: e.date });
  });
  return out.sort((a, b) => a.days - b.days || (a.kind === b.kind ? 0 : a.kind === "expense" ? -1 : 1));
}

/* ---------- Assistente (regras locais, sem IA externa) ---------- */
function toNumber(raw: string) {
  const s = raw.replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s.replace(",", "."));
}

export function parseCommand(input: string, today: Date): Reply {
  let t = " " + input.trim() + " ";
  if (!input.trim()) return { type: "unknown" };

  // 1) data
  let day = 0, month = today.getMonth() + 1, hasDate = false;
  const setDate = (d: number, m: number) => { if (d >= 1 && d <= 31 && m >= 1 && m <= 12) { day = d; month = m; hasDate = true; return true; } return false; };
  let m: RegExpMatchArray | null;
  if ((m = t.match(/\b(\d{1,2})\s+de\s+([a-zçã]+)\b/i)) && MONTHS.indexOf(m[2].toLowerCase()) >= 0 && setDate(Number(m[1]), MONTHS.indexOf(m[2].toLowerCase()) + 1)) t = t.replace(m[0], " ");
  else if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/)) && setDate(Number(m[1]), Number(m[2]))) t = t.replace(m[0], " ");
  else if ((m = t.match(/\b(?:no\s+|todo\s+)?dia\s+(\d{1,2})\b/i)) && setDate(Number(m[1]), today.getMonth() + 1)) t = t.replace(m[0], " ");
  else if ((m = t.match(/\bhoje\b/i))) { setDate(today.getDate(), today.getMonth() + 1); t = t.replace(m[0], " "); }
  else if ((m = t.match(/(?<![\wà-ú])amanh[ãa](?![\wà-ú])/i))) { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); setDate(d.getDate(), d.getMonth() + 1); t = t.replace(m[0], " "); }

  // 2) valor
  const numRe = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+[.,]\d{1,2}|\d+)(?:\s*(?:reais|real))?/i;
  const nm = t.match(numRe);
  const amount = nm ? toNumber(nm[1]) : NaN;
  const lower = input.toLowerCase();

  // 3) perguntas (sem valor informado)
  if (!Number.isFinite(amount) || amount <= 0) {
    if (/(projet|fim do m[eê]s|final do m[eê]s|vou ter|vai sobrar|sobra)/.test(lower)) return { type: "answer", topic: "projected" };
    if (/(vence|vencer|vencimento|lembr|atrasad|pr[óo]xim|semana|hoje|amanh)/.test(lower)) return { type: "answer", topic: "alerts" };
    if (/(pendente|devo|em aberto|falta pagar|quanto.*pagar)/.test(lower)) return { type: "answer", topic: "pending" };
    if (/saldo/.test(lower)) return { type: "answer", topic: "balance" };
    return { type: "unknown" };
  }

  // 4) tipo
  const incRe = /\b(receita|receber|receb[io]|recebimento|entrada|sal[áa]rio|ganhei|renda|freela)\b/i;
  const expRe = /\b(despesa|gasto|gastei|paguei|pagar|pago|conta|boleto|comprei|compra|mensalidade|assinatura|parcela)\b/i;
  const inc = lower.search(incRe), exp = lower.search(expRe);
  if (inc < 0 && exp < 0) return { type: "ask", message: "Entendi o valor " + brl(amount) + ", mas não sei se é uma despesa ou uma receita. Escreva, por exemplo: “despesa " + input.trim() + "” ou “receita " + input.trim() + "”." };
  const kind: "income" | "expense" = inc >= 0 && (exp < 0 || inc < exp) ? "income" : "expense";
  const paid = kind === "expense" && /\b(paguei|j[áa] paguei)\b/i.test(lower);

  // 5) descrição
  let name = (nm ? t.replace(nm[0], " ") : t);
  name = name.replace(/^\s*(?:(?:adicionar|adicione|registrar|registre|lan[çc]ar|lance|cadastrar|cadastre|criar|crie|anotar|anote)\s+)?(?:(?:uma|um|nova|novo)\s+)?/i, " ");
  name = name.replace(/^\s*(?:paguei|gastei|comprei|recebi|receber|receita|despesa|gasto|entrada)\s+(?:(?:de|com|do|da)\s+)?/i, " ");
  name = name.replace(/\b(?:no valor de|vence|vencimento|venceu|para o|para a|para)\b/gi, " ").replace(/\br\$/gi, " ").replace(/[:\-–,;]+/g, " ");
  name = name.replace(/\s+(?:de|em|no|na|com|do|da)\s*$/i, " ").replace(/\s+/g, " ").trim();
  if (!name) name = kind === "income" ? "Receita" : "Despesa";
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return { type: "create", draft: { kind, name, amount, date: hasDate ? `${pad(day)}/${pad(month)}` : "", paid } };
}

/* ---------- Painéis ---------- */
function Shell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal panel-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><div><small>{eyebrow}</small><h2>{title}</h2></div><button className="close-modal" onClick={onClose} aria-label="Fechar">✕</button></div>
        {children}
      </section>
    </div>
  );
}

export function HelpPanel({ onClose, onNewIncome, onNewExpense }: { onClose: () => void; onNewIncome: () => void; onNewExpense: () => void }) {
  return (
    <Shell title="Como usar o Nexo" eyebrow="AJUDA E PRIMEIROS PASSOS" onClose={onClose}>
      <div className="help">
        <ol className="help-steps">
          <li><b>Informe seu saldo.</b> Na Visão geral, toque em “Atualizar saldo” com o valor que você tem disponível hoje.</li>
          <li><b>Cadastre o que entra.</b> Use <button className="link-inline" onClick={onNewIncome}>Nova receita</button> (também em Receitas e no calendário, botão “+ Receita”).</li>
          <li><b>Cadastre o que sai.</b> Use <button className="link-inline" onClick={onNewExpense}>Nova despesa</button> e marque como paga quando pagar.</li>
        </ol>
        <h3>Onde fica cada coisa</h3>
        <ul className="help-list">
          <li><b>Visão geral</b> — saldo, projeção do mês, calendário e distribuição dos gastos.</li>
          <li><b>Despesas / Receitas</b> — listas completas para cadastrar, editar e excluir.</li>
          <li><b>Investimentos</b> — ativos que você já possui, com valor atual informado.</li>
          <li><b>Planos futuros</b> — metas e parcelas e como elas pesam no orçamento.</li>
          <li><b>Análise geral</b> — indicadores calculados só com o que você registrou.</li>
        </ul>
        <h3>Como preencher as datas</h3>
        <p className="help-note">Use <code>DD/MM</code> (ex.: 15/11) ou uma faixa como <code>5 a 10</code> para receitas. O calendário e a projeção usam essas datas.</p>
        <h3>Como o saldo projetado é calculado</h3>
        <p className="help-note">Começa no seu saldo informado e aplica, em ordem de data, as receitas (+) e as despesas pendentes (−) do mês. Despesas já pagas não entram de novo. O resultado é a estimativa para o último dia do mês, se tudo for cumprido.</p>
        <h3>Atalhos úteis</h3>
        <p className="help-note">O sino mostra vencimentos e recebimentos próximos. O Assistente entende frases como “despesa aluguel 800 dia 5” e sempre pede a sua confirmação antes de registrar.</p>
        <button className="primary" onClick={onClose}>Entendi, vamos começar</button>
      </div>
    </Shell>
  );
}

export function RemindersPanel({ alerts, settings, onChange, onClose, notifySupported, notifyPermission, onEnableBrowser }: {
  alerts: Alert[]; settings: ReminderSettings; onChange: (s: ReminderSettings) => void; onClose: () => void;
  notifySupported: boolean; notifyPermission: string; onEnableBrowser: () => void;
}) {
  return (
    <Shell title="Lembretes" eyebrow="VENCIMENTOS E RECEBIMENTOS" onClose={onClose}>
      <div className="help">
        <div className="reminder-config">
          <label>Avisar com antecedência de
            <select value={settings.lead} onChange={e => onChange({ ...settings, lead: Number(e.target.value) })}>
              <option value={0}>No próprio dia</option><option value={1}>1 dia</option><option value={3}>3 dias</option><option value={7}>7 dias</option>
            </select>
          </label>
          {notifySupported && (
            <label className="check">
              <input type="checkbox" checked={settings.browser && notifyPermission === "granted"} onChange={e => { if (e.target.checked) onEnableBrowser(); else onChange({ ...settings, browser: false }); }} />
              Também avisar pelo navegador (uma vez por dia)
            </label>
          )}
          {notifySupported && notifyPermission === "denied" && <small className="help-note">As notificações estão bloqueadas neste navegador. Libere nas configurações do site para ativar.</small>}
        </div>
        {alerts.length ? (
          <ul className="alert-list">
            {alerts.map(a => (
              <li key={a.key} className={a.days < 0 && a.kind === "expense" ? "late" : ""}>
                <i className={a.kind === "income" ? "income-dot" : "expense-dot"} />
                <span><b>{a.title}</b><small>{whenLabel(a.days)} · {brDate(a.date)}</small></span>
                <strong className={a.kind === "income" ? "income-amount" : "expense-amount"}>{a.kind === "income" ? "+" : "−"}{brl(a.amount)}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="help-note">Nenhum vencimento ou recebimento dentro do período escolhido. Cadastre datas nas despesas e receitas para receber lembretes.</p>}
        <p className="help-note">As preferências ficam salvas neste navegador.</p>
      </div>
    </Shell>
  );
}

export function AssistantPanel({ onClose, today, answer, onConfirm, onEdit }: {
  onClose: () => void; today: Date; answer: (topic: "projected" | "alerts" | "pending" | "balance") => string;
  onConfirm: (d: Draft) => void; onEdit: (d: Draft) => void;
}) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [said, setSaid] = useState("");
  const run = (value: string) => { setText(value); setSaid(value); setReply(parseCommand(value, today)); };
  const examples = ["despesa aluguel 800 dia 5", "receita salário 3500 dia 5", "paguei mercado 230,50 hoje", "quanto vou ter no fim do mês?", "o que vence esta semana?"];
  return (
    <Shell title="Assistente Nexo" eyebrow="COMANDOS EM TEXTO" onClose={onClose}>
      <div className="help">
        <form className="assistant-form" onSubmit={e => { e.preventDefault(); run(text); }}>
          <input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: despesa aluguel 800 dia 5" aria-label="Comando para o assistente" />
          <button className="primary" type="submit">Enviar</button>
        </form>
        <div className="chips">{examples.map(x => <button key={x} type="button" className="chip" onClick={() => run(x)}>{x}</button>)}</div>
        {reply?.type === "create" && (
          <div className="assistant-card">
            <small>VOU REGISTRAR — CONFIRME ANTES</small>
            <b>{reply.draft.kind === "income" ? "Receita" : "Despesa"}: {reply.draft.name}</b>
            <span>{brl(reply.draft.amount)} · {reply.draft.date ? (reply.draft.kind === "income" ? "previsto para " : "vence em ") + reply.draft.date : "sem data"}{reply.draft.paid ? " · já paga" : ""}</span>
            <div className="assistant-actions">
              <button className="primary" onClick={() => { onConfirm(reply.draft); setReply(null); setText(""); setSaid(""); }}>Confirmar e registrar</button>
              <button className="secondary" onClick={() => onEdit(reply.draft)}>Editar antes</button>
              <button className="secondary" onClick={() => setReply(null)}>Cancelar</button>
            </div>
          </div>
        )}
        {reply?.type === "answer" && <div className="assistant-card"><small>RESPOSTA</small><span>{answer(reply.topic)}</span></div>}
        {reply?.type === "ask" && <div className="assistant-card"><small>PRECISO DE MAIS UM DADO</small><span>{reply.message}</span></div>}
        {reply?.type === "unknown" && said && <div className="assistant-card"><small>NÃO ENTENDI</small><span>Tente algo como “despesa aluguel 800 dia 5”, “receita salário 3500 dia 5”, “saldo projetado” ou “o que vence esta semana?”.</span></div>}
        <p className="help-note">O assistente interpreta frases simples com regras locais (não é uma IA externa) e nunca registra nada sem a sua confirmação.</p>
      </div>
    </Shell>
  );
}
