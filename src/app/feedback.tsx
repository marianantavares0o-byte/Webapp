'use client';
// Aba "Feedback": teste de usabilidade com 5 tarefas, cronômetro por tarefa e avaliação.
// Os dados ficam em uma seção própria ("ux_session_<id>") da tabela user_financial_data,
// sem tocar na seção "main" (dados operacionais). Há cópia local para sobreviver a recarregamentos.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const TASKS = [
  { title: "Informar seus dados iniciais", description: "Cadastre o seu saldo atual, uma despesa e uma receita.", expected: "Saldo informado, com ao menos uma despesa e uma receita registradas." },
  { title: "Adicionar uma receita pelo calendário", description: "Registre uma nova receita utilizando o calendário do aplicativo.", expected: "A receita aparece na data escolhida." },
  { title: "Adicionar uma despesa com a IA", description: "Use a inteligência artificial do aplicativo para registrar uma despesa.", expected: "A despesa criada aparece na lista de despesas." },
  { title: "Adicionar um lembrete para uma despesa", description: "Crie um lembrete para uma despesa que você tenha cadastrado.", expected: "O lembrete fica configurado e visível no aplicativo." },
  { title: "Fazer um planejamento em Planos futuros", description: "Monte um planejamento na área de Planos futuros.", expected: "O plano fica registrado em Planos futuros." }
] as const;

export type Outcome = "concluida" | "nao_concluida";
export type Answers = { difficulty: boolean; difficultyNote: string; help: boolean; helpNote: string; problem: boolean; problemNote: string; errorCount: number; comment: string };
export type TaskRec = { status: "idle" | "running" | "form" | "done"; startedAt: number | null; endedAt: number | null; seconds: number | null; outcome: Outcome | null; answers: Answers | null; submittedAt: number | null };
export type UxSession = { v: 1; id: string; participant: string; userId: string; createdAt: number; updatedAt: number; introSeen: boolean; finishedAt: number | null; viewport: string; tasks: TaskRec[] };
type SyncState = "idle" | "saving" | "saved" | "error" | "local";

const LS_KEY = "nexo-ux-active";
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const emptyTask = (): TaskRec => ({ status: "idle", startedAt: null, endedAt: null, seconds: null, outcome: null, answers: null, submittedAt: null });
const newSession = (userId: string, participant: string): UxSession => ({
  v: 1, id: newId(), participant: participant.trim(), userId, createdAt: Date.now(), updatedAt: Date.now(), introSeen: true, finishedAt: null,
  viewport: typeof window === "undefined" ? "" : `${window.innerWidth}x${window.innerHeight}`, tasks: TASKS.map(emptyTask)
});
const isSession = (v: unknown): v is UxSession => !!v && typeof v === "object" && (v as UxSession).v === 1 && Array.isArray((v as UxSession).tasks) && (v as UxSession).tasks.length === TASKS.length;

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const minSec = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;
const elapsedSeconds = (t: TaskRec, now: number) => t.startedAt == null ? 0 : Math.max(0, Math.floor(((t.endedAt ?? now) - t.startedAt) / 1000));

export function useUsability(userId: string) {
  const [session, setSession] = useState<UxSession | null>(null);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const ref = useRef<UxSession | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const uid = useRef(userId);
  useEffect(() => { uid.current = userId; }, [userId]);

  const pushCloud = useCallback(async () => {
    const s = ref.current;
    if (!s) return;
    if (uid.current.startsWith("local:")) { setSync("local"); return; }
    setSync("saving");
    try {
      const { error } = await createClient().from("user_financial_data").upsert(
        { user_id: uid.current, section: "ux_session_" + s.id, data: s, updated_at: new Date().toISOString() },
        { onConflict: "user_id,section" }
      );
      if (error) throw error;
      if (ref.current?.updatedAt === s.updatedAt) setSync("saved");
    } catch (e) {
      console.error("Feedback: não foi possível salvar na nuvem", e);
      setSync("error");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void pushCloud(); }, 8000);
    }
  }, []);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void pushCloud(); }, 350);
  }, [pushCloud]);

  const commit = useCallback((fn: (s: UxSession) => UxSession | null) => {
    const cur = ref.current;
    if (!cur) return false;
    const next = fn(cur);
    if (!next || next === cur) return false;
    const stamped: UxSession = { ...next, updatedAt: Date.now(), userId: uid.current };
    ref.current = stamped;
    setSession(stamped);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(stamped)); } catch { /* armazenamento indisponível */ }
    schedule();
    return true;
  }, [schedule]);

  useEffect(() => {
    let live = true;
    (async () => {
      let loaded: UxSession | null = null;
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) { const v = JSON.parse(raw); if (isSession(v)) loaded = v; }
      } catch { /* ignora */ }
      if (!loaded && !userId.startsWith("local:")) {
        try {
          const { data } = await createClient().from("user_financial_data").select("data").eq("user_id", userId).like("section", "ux_session_%").order("updated_at", { ascending: false }).limit(1);
          const v = data?.[0]?.data;
          if (isSession(v)) loaded = v;
        } catch { /* ignora */ }
      }
      if (!live) return;
      ref.current = loaded;
      setSession(loaded);
      setReady(true);
      if (loaded) schedule();
    })();
    return () => { live = false; window.clearTimeout(timer.current); };
  }, [userId, schedule]);

  const begin = useCallback((participant: string) => {
    const s = newSession(uid.current, participant);
    ref.current = s;
    setSession(s);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignora */ }
    schedule();
  }, [schedule]);

  const startTask = useCallback((i: number) => commit((s) => {
    const t = s.tasks[i];
    if (!t || t.status !== "idle") return null;                                   // evita início duplicado
    if (s.tasks.some((x, j) => j !== i && (x.status === "running" || x.status === "form"))) return null;
    if (s.tasks.slice(0, i).some((x) => x.status !== "done")) return null;       // sequência obrigatória
    return { ...s, tasks: s.tasks.map((x, j) => j === i ? { ...x, status: "running" as const, startedAt: Date.now() } : x) };
  }), [commit]);

  const endTask = useCallback((i: number, outcome: Outcome) => commit((s) => {
    const t = s.tasks[i];
    if (!t || t.status !== "running" || t.startedAt == null) return null;         // evita encerramento duplicado
    const endedAt = Date.now();
    return { ...s, tasks: s.tasks.map((x, j) => j === i ? { ...x, status: "form" as const, endedAt, seconds: Math.max(0, Math.round((endedAt - t.startedAt!) / 1000)), outcome } : x) };
  }), [commit]);

  const submitTask = useCallback((i: number, answers: Answers) => commit((s) => {
    const t = s.tasks[i];
    if (!t || t.status !== "form") return null;
    const tasks = s.tasks.map((x, j) => j === i ? { ...x, status: "done" as const, answers, submittedAt: Date.now() } : x);
    return { ...s, tasks, finishedAt: tasks.every((x) => x.status === "done") ? Date.now() : null };
  }), [commit]);

  const restart = useCallback(() => {
    ref.current = null;
    setSession(null);
    try { window.localStorage.removeItem(LS_KEY); } catch { /* ignora */ }
  }, []);

  return { session, ready, sync, begin, startTask, endTask, submitTask, restart };
}
export type Usability = ReturnType<typeof useUsability>;

function useTick(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return active ? Math.max(now, Date.now()) : now;
}

// Atalho discreto exibido nas outras abas enquanto há uma tentativa em andamento.
export function UxChip({ ux, onOpen }: { ux: Usability; onOpen: () => void }) {
  const i = ux.session?.tasks.findIndex((t) => t.status === "running" || t.status === "form") ?? -1;
  const t = ux.session && i >= 0 ? ux.session.tasks[i] : null;
  const now = useTick(t?.status === "running");
  if (!t) return null;
  const running = t.status === "running";
  return (
    <button type="button" className="ux-chip" onClick={onOpen} aria-label={running ? `Tarefa ${i + 1} em andamento. Voltar para a aba Feedback` : `Tarefa ${i + 1} aguardando avaliação. Abrir a aba Feedback`}>
      {running ? <><i /> <b>Tarefa {i + 1}</b> <span>{clock(elapsedSeconds(t, now))}</span> <em>Voltar ao Feedback</em></> : <><b>Tarefa {i + 1}</b> <span>avaliação pendente</span> <em>Responder</em></>}
    </button>
  );
}

type Form = { difficulty: "" | "sim" | "nao"; difficultyNote: string; help: "" | "sim" | "nao"; helpNote: string; problem: "" | "sim" | "nao"; problemNote: string; errorCount: string; comment: string };
const blankForm: Form = { difficulty: "", difficultyNote: "", help: "", helpNote: "", problem: "", problemNote: "", errorCount: "", comment: "" };

function validate(f: Form) {
  const e: Record<string, string> = {};
  if (!f.difficulty) e.difficulty = "Selecione uma opção.";
  if (!f.help) e.help = "Selecione uma opção.";
  if (!f.problem) e.problem = "Selecione uma opção.";
  if (f.problem === "sim") {
    if (!f.problemNote.trim()) e.problemNote = "Descreva o problema encontrado.";
    if (!/^\d{1,3}$/.test(f.errorCount.trim())) e.errorCount = "Informe um número inteiro, 0 ou maior.";
  }
  return e;
}

function YesNo({ name, label, value, onChange, error, disabled }: { name: string; label: string; value: "" | "sim" | "nao"; onChange?: (v: "sim" | "nao") => void; error?: string; disabled?: boolean }) {
  return (
    <fieldset className={"ux-field" + (error ? " has-error" : "")} disabled={disabled}>
      <legend>{label}</legend>
      <div className="ux-choices" role="radiogroup">
        {(["sim", "nao"] as const).map((v) => (
          <label key={v} className={"ux-choice" + (value === v ? " on" : "")}>
            <input type="radio" name={name} checked={value === v} onChange={() => onChange?.(v)} />
            <span>{v === "sim" ? "Sim" : "Não"}</span>
          </label>
        ))}
      </div>
      {error && <p className="ux-error" role="alert">{error}</p>}
    </fieldset>
  );
}

function Evaluation({ sessionId, idx, task, onSubmit }: { sessionId: string; idx: number; task: TaskRec; onSubmit: (a: Answers) => void }) {
  const key = `nexo-ux-draft:${sessionId}:${idx}`;
  const [f, setF] = useState<Form>(() => {
    try { const raw = window.localStorage.getItem(key); if (raw) return { ...blankForm, ...JSON.parse(raw) }; } catch { /* ignora */ }
    return blankForm;
  });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(f)); } catch { /* ignora */ } }, [f, key]);
  const errs = tried ? validate(f) : {};
  const set = (patch: Partial<Form>) => setF((cur) => ({ ...cur, ...patch }));
  function submit() {
    setTried(true);
    if (busy || Object.keys(validate(f)).length) return;
    setBusy(true);
    const has = f.problem === "sim";
    onSubmit({
      difficulty: f.difficulty === "sim", difficultyNote: f.difficultyNote.trim(), help: f.help === "sim", helpNote: f.helpNote.trim(),
      problem: has, problemNote: has ? f.problemNote.trim() : "", errorCount: has ? Number(f.errorCount.trim()) : 0, comment: f.comment.trim()
    });
    try { window.localStorage.removeItem(key); } catch { /* ignora */ }
  }
  return (
    <form className="ux-form" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <YesNo name="q1" label="1. Conseguiu realizar a tarefa?" value={task.outcome === "concluida" ? "sim" : "nao"} disabled />
      <p className="ux-hint">Preenchido a partir do que você informou ao encerrar a tentativa.</p>

      <YesNo name="q2" label="2. Encontrou alguma dificuldade durante a execução?" value={f.difficulty} onChange={(v) => set({ difficulty: v })} error={errs.difficulty} />
      <label className="ux-text">Comentário (opcional)<textarea rows={2} maxLength={1000} value={f.difficultyNote} onChange={(e) => set({ difficultyNote: e.target.value })} /></label>

      <YesNo name="q3" label="3. Precisou de ajuda para realizar a tarefa?" value={f.help} onChange={(v) => set({ help: v })} error={errs.help} />
      <label className="ux-text">Comentário (opcional)<textarea rows={2} maxLength={1000} value={f.helpNote} onChange={(e) => set({ helpNote: e.target.value })} /></label>

      <YesNo name="q4" label="4. Observou algum problema ou erro no aplicativo?" value={f.problem} onChange={(v) => set({ problem: v })} error={errs.problem} />
      {f.problem === "sim" && (
        <div className="ux-cond">
          <label className={"ux-text" + (errs.problemNote ? " has-error" : "")}>Descreva o problema encontrado (obrigatório)
            <textarea rows={3} maxLength={2000} value={f.problemNote} onChange={(e) => set({ problemNote: e.target.value })} placeholder="Se foi mais de um, pode listar todos aqui." />
            {errs.problemNote && <span className="ux-error" role="alert">{errs.problemNote}</span>}
          </label>
          <label className={"ux-text" + (errs.errorCount ? " has-error" : "")}>Quantidade de erros identificados
            <input inputMode="numeric" pattern="[0-9]*" maxLength={3} value={f.errorCount} onChange={(e) => set({ errorCount: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="0" />
            {errs.errorCount && <span className="ux-error" role="alert">{errs.errorCount}</span>}
          </label>
        </div>
      )}

      <label className="ux-text">5. Comentário adicional (opcional)<textarea rows={3} maxLength={2000} value={f.comment} onChange={(e) => set({ comment: e.target.value })} placeholder="Qualquer observação sobre a sua experiência." /></label>

      <button type="submit" className="primary ux-submit" disabled={busy}>{idx === TASKS.length - 1 ? "Enviar avaliação e finalizar" : "Enviar avaliação e continuar"}</button>
    </form>
  );
}

function Progress({ s, current }: { s: UxSession; current: number }) {
  const done = s.tasks.filter((t) => t.status === "done").length;
  return (
    <div className="ux-progress" aria-label="Progresso do teste">
      <div className="ux-progress-top"><b>{current >= 0 ? `Tarefa ${current + 1} de ${TASKS.length}` : "Teste finalizado"}</b><span>{done} {done === 1 ? "avaliada" : "avaliadas"} · {TASKS.length - done} {TASKS.length - done === 1 ? "restante" : "restantes"}</span></div>
      <div className="ux-bar"><i style={{ width: `${(done / TASKS.length) * 100}%` }} /></div>
      <ol className="ux-steps">
        {s.tasks.map((t, i) => {
          const cls = t.status === "done" ? (t.outcome === "concluida" ? "ok" : "fail") : i === current ? "now" : "todo";
          const mark = t.status === "done" ? (t.outcome === "concluida" ? "✓" : "✕") : String(i + 1);
          const label = t.status === "done" ? (t.outcome === "concluida" ? "concluída" : "não concluída") : i === current ? "em andamento" : "pendente";
          return <li key={i} className={"ux-step " + cls} aria-current={i === current ? "step" : undefined}><i aria-hidden="true">{mark}</i><span><b>{i + 1}</b><small>{label}</small></span></li>;
        })}
      </ol>
    </div>
  );
}

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
function rows(s: UxSession) {
  return s.tasks.map((t, i) => ({
    sessao: s.id, participante: s.participant, tarefa: i + 1, titulo: TASKS[i].title,
    resultado: t.outcome === "concluida" ? "concluída" : t.outcome === "nao_concluida" ? "não concluída" : "não realizada",
    tempo_segundos: t.seconds ?? "", tempo_formatado: t.seconds == null ? "" : minSec(t.seconds),
    dificuldade: t.answers ? (t.answers.difficulty ? "sim" : "não") : "", comentario_dificuldade: t.answers?.difficultyNote ?? "",
    precisou_ajuda: t.answers ? (t.answers.help ? "sim" : "não") : "", comentario_ajuda: t.answers?.helpNote ?? "",
    problema_ou_erro: t.answers ? (t.answers.problem ? "sim" : "não") : "", descricao_problemas: t.answers?.problemNote ?? "",
    quantidade_erros: t.answers ? t.answers.errorCount : "", comentario_adicional: t.answers?.comment ?? ""
  }));
}
function download(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SyncNote({ sync }: { sync: SyncState }) {
  const text = sync === "saved" ? "Respostas salvas." : sync === "saving" ? "Salvando…" : sync === "error" ? "Não foi possível sincronizar agora; mantendo uma cópia neste navegador e tentando de novo." : sync === "local" ? "Modo local: as respostas estão salvas apenas neste navegador." : "";
  return text ? <p className={"ux-sync " + sync} role="status">{text}</p> : null;
}

export function FeedbackTab({ ux }: { ux: Usability }) {
  const { session: s, ready, sync } = ux;
  const [code, setCode] = useState("");
  const [flash, setFlash] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const current = s ? s.tasks.findIndex((t) => t.status !== "done") : -1;
  const running = !!s && current >= 0 && s.tasks[current].status === "running";
  const now = useTick(running);
  const stage = s && current >= 0 ? s.tasks[current].status : "";
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [current, stage, s?.introSeen]);
  useEffect(() => { if (!flash) return; const id = window.setTimeout(() => setFlash(""), 4000); return () => window.clearTimeout(id); }, [flash]);

  if (!ready) return <div className="page"><div className="ux-wrap"><p className="ux-hint">Carregando…</p></div></div>;

  if (!s) {
    return (
      <div className="page"><div className="ux-wrap" ref={top}>
        <section className="surface ux-intro">
          <small className="ux-eyebrow">TESTE DE USABILIDADE</small>
          <h2>Ajude-nos a melhorar o Nexo</h2>
          <p>Você vai realizar 5 tarefas no aplicativo. Estamos avaliando o app, e não você: se algo parecer confuso, isso é uma informação valiosa. Faça do seu jeito, sem pressa, e depois conte como foi.</p>
          <ol className="ux-tasklist">
            {TASKS.map((t, i) => (
              <li key={i}><i>{i + 1}</i><div><b>{t.title}</b><p>{t.description}</p><small>Resultado esperado: {t.expected}</small></div></li>
            ))}
          </ol>
          <div className="ux-how"><b>Como funciona</b><p>Para cada tarefa, toque em “Iniciar tentativa” e execute-a no aplicativo. Ao terminar, volte a esta aba e escolha “Concluir tarefa” ou “Não consegui concluir”. Depois responda a 5 perguntas rápidas. O tempo é medido automaticamente.</p></div>
          <label className="ux-text ux-code">Código ou nome do participante (opcional)<input maxLength={60} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: P01" /></label>
          <button type="button" className="primary ux-submit" onClick={() => ux.begin(code)}>Começar teste</button>
        </section>
      </div></div>
    );
  }

  if (current < 0) {
    const r = rows(s);
    const okCount = s.tasks.filter((t) => t.outcome === "concluida").length;
    const total = s.tasks.reduce((a, t) => a + (t.seconds ?? 0), 0);
    return (
      <div className="page"><div className="ux-wrap" ref={top}>
        <Progress s={s} current={-1} />
        <section className="surface ux-done">
          <small className="ux-eyebrow">TESTE FINALIZADO</small>
          <h2>Obrigado pela sua participação!</h2>
          <p>Suas respostas foram registradas. Você concluiu {okCount} de {TASKS.length} tarefas, em {minSec(total)} no total.</p>
          <SyncNote sync={sync} />
          <div className="ux-summary">
            {s.tasks.map((t, i) => (
              <article key={i} className={"ux-sum " + (t.outcome === "concluida" ? "ok" : "fail")}>
                <header><b>{i + 1}. {TASKS[i].title}</b><span>{t.outcome === "concluida" ? "Concluída" : "Não concluída"} · {t.seconds == null ? "—" : minSec(t.seconds)}</span></header>
                <dl>
                  <div><dt>Dificuldade</dt><dd>{t.answers?.difficulty ? "Sim" : "Não"}</dd></div>
                  <div><dt>Precisou de ajuda</dt><dd>{t.answers?.help ? "Sim" : "Não"}</dd></div>
                  <div><dt>Problema/erro</dt><dd>{t.answers?.problem ? `Sim (${t.answers.errorCount})` : "Não"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="ux-actions">
            <button type="button" className="secondary" onClick={() => download(`nexo-teste-${s.id.slice(0, 8)}.csv`, "text/csv;charset=utf-8", "﻿" + [Object.keys(r[0]).join(","), ...r.map((x) => Object.values(x).map(csvCell).join(","))].join("\r\n"))}>Baixar CSV</button>
            <button type="button" className="secondary" onClick={() => download(`nexo-teste-${s.id.slice(0, 8)}.json`, "application/json", JSON.stringify(s, null, 2))}>Baixar JSON</button>
            <button type="button" className="secondary" onClick={() => { if (window.confirm("Iniciar um novo teste para outro participante? Os resultados deste teste continuam salvos.")) ux.restart(); }}>Iniciar novo teste</button>
          </div>
        </section>
      </div></div>
    );
  }

  const t = s.tasks[current];
  const def = TASKS[current];
  return (
    <div className="page"><div className="ux-wrap" ref={top}>
      <Progress s={s} current={current} />
      {flash && <p className="ux-flash" role="status">{flash}</p>}
      <section className="surface ux-task">
        <small className="ux-eyebrow">TAREFA {current + 1} DE {TASKS.length}</small>
        <h2>{def.title}</h2>
        <p>{def.description}</p>
        <p className="ux-expected"><b>Resultado esperado:</b> {def.expected}</p>

        {t.status === "idle" && (
          <div className="ux-cta">
            <button type="button" className="primary" onClick={() => ux.startTask(current)}>Iniciar tentativa</button>
            <small>O cronômetro começa ao tocar no botão. Depois, realize a tarefa no aplicativo e volte aqui.</small>
          </div>
        )}

        {t.status === "running" && (
          <div className="ux-running">
            <div className="ux-timer" role="timer" aria-label="Tempo da tentativa"><i /> <strong>{clock(elapsedSeconds(t, now))}</strong><span>Tentativa em andamento</span></div>
            <p className="ux-hint">Realize a tarefa no aplicativo. Você pode navegar entre as abas: o tempo continua sendo contado. Quando terminar, volte aqui.</p>
            <div className="ux-actions">
              <button type="button" className="primary" onClick={() => ux.endTask(current, "concluida")}>Concluir tarefa</button>
              <button type="button" className="secondary" onClick={() => ux.endTask(current, "nao_concluida")}>Não consegui concluir</button>
            </div>
          </div>
        )}

        {t.status === "form" && (
          <div className="ux-eval">
            <div className={"ux-result " + (t.outcome === "concluida" ? "ok" : "fail")}>
              <b>{t.outcome === "concluida" ? "Tarefa concluída" : "Tarefa encerrada sem sucesso"}</b>
              <span>Tempo: {minSec(t.seconds ?? 0)}</span>
            </div>
            <Evaluation key={`${s.id}-${current}`} sessionId={s.id} idx={current} task={t} onSubmit={(a) => { ux.submitTask(current, a); setFlash(`Avaliação da tarefa ${current + 1} registrada.`); }} />
          </div>
        )}
      </section>
      <SyncNote sync={sync} />
    </div></div>
  );
}
