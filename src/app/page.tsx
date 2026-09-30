export default function Home() {
  const gastos = [
    { nome: 'Conta de energia', valor: 120, nivel: 'P1', acao: 'Pagar agora' },
    { nome: 'Transporte', valor: 100, nivel: 'P1', acao: 'Pagar agora' },
    { nome: 'Curso', valor: 180, nivel: 'P2', acao: 'Planejar' },
    { nome: 'Tênis', valor: 250, nivel: 'P3', acao: 'Aguardar' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-screen w-64 border-r bg-white p-6 md:block">
          <h1 className="text-2xl font-bold tracking-tight">Prioriza</h1>
          <p className="mt-1 text-sm text-slate-500">Decisão financeira</p>
          <nav className="mt-10 space-y-2 text-sm">
            {['Visão geral', 'Gastos', 'Contas', 'Orçamento', 'Relatórios', 'Configurações'].map((item, i) => (
              <div key={item} className={`rounded-lg px-4 py-3 ${i === 0 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-6 md:p-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Visão geral</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Seu dinheiro, suas prioridades.</h2>
              <p className="mt-2 text-slate-500">Veja o que pode ser pago sem comprometer seu caixa.</p>
            </div>
            <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm">+ Novo gasto</button>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Saldo atual', 'R$ 1.850'],
              ['Comprometido', 'R$ 920'],
              ['Reserva mínima', 'R$ 300'],
              ['Disponível', 'R$ 630'],
            ].map(([label, value], i) => (
              <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`mt-2 text-2xl font-bold ${i === 3 ? 'text-emerald-700' : ''}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Gastos a decidir</h3>
                  <p className="mt-1 text-sm text-slate-500">Ordenados pela prioridade calculada.</p>
                </div>
              </div>
              <div className="mt-5 divide-y">
                {gastos.map((gasto) => (
                  <div key={gasto.nome} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold">{gasto.nivel}</span>
                      <div><p className="font-medium">{gasto.nome}</p><p className="text-sm text-slate-500">{gasto.acao}</p></div>
                    </div>
                    <span className="font-semibold">R$ {gasto.valor}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-900 p-6 text-white shadow-sm">
              <p className="text-sm text-slate-400">Recomendação</p>
              <h3 className="mt-2 text-xl font-semibold">Margem de decisão: R$ 630</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">Após compromissos e reserva mínima, este é o valor disponível para novos gastos sem consumir a proteção definida.</p>
              <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
                <span className="font-semibold">Próximo passo:</span> priorize os gastos P1 antes de avaliar despesas adiáveis.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
