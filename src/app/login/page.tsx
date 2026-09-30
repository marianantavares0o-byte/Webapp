'use client'

import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Autenticação real será conectada ao backend na próxima etapa.
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
          <div className="hidden bg-slate-900 p-12 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">Prioriza</p>
              <p className="mt-1 text-sm text-slate-400">Decisão financeira</p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Controle</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight">Decida seus gastos com mais clareza.</h1>
              <p className="mt-5 max-w-sm leading-7 text-slate-300">Organize seu saldo, compromissos e prioridades em um único lugar.</p>
            </div>
            <p className="text-xs text-slate-500">Seu painel financeiro pessoal.</p>
          </div>

          <div className="p-8 sm:p-12">
            <div className="md:hidden">
              <p className="text-2xl font-bold">Prioriza</p>
              <p className="mt-1 text-sm text-slate-500">Decisão financeira</p>
            </div>
            <div className="mt-10 md:mt-16">
              <p className="text-sm font-medium text-slate-500">Acesso seguro</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Entrar na sua conta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Informe seus dados para acessar seu painel financeiro.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">E-mail</label>
                <input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold">Senha</label>
                  <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-900">Esqueci minha senha</button>
                </div>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Digite sua senha" className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pr-20 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
              <button type="submit" className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800">Entrar</button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">Ainda não possui uma conta? <button type="button" className="font-semibold text-slate-900">Criar conta</button></p>
          </div>
        </section>
      </div>
    </main>
  )
}
