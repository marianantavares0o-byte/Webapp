"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPassword(){
  const [email,setEmail]=useState(""); const [error,setError]=useState(""); const [sent,setSent]=useState(false); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setError("");setLoading(true);
    const origin=window.location.origin;
    const {error}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:origin+"/redefinir-senha"});
    setLoading(false);
    if(error){setError("Não foi possível enviar o código. Tente novamente.");return;}
    setSent(true);
  }
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">F</span><strong>fluxo</strong></div><h1>Recuperar senha</h1><p>Enviaremos um código de verificação para seu e-mail.</p>
    {!sent?<form onSubmit={submit} className="auth-form"><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{error&&<p className="auth-error">{error}</p>}<button className="primary auth-submit" disabled={loading}>{loading?"Enviando...":"Enviar código"}</button></form>
    :<div className="auth-message"><strong>Código enviado.</strong><p>Abra o e-mail recebido, copie o código de 6 dígitos e continue.</p><Link className="auth-secondary" href={"/redefinir-senha?email="+encodeURIComponent(email)}>Inserir código</Link></div>}
    <Link className="auth-link" href="/login">Voltar para o login</Link>
  </section></main>;
}
