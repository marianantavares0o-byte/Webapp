"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPage(){
  const params=useSearchParams(); const [email,setEmail]=useState(params.get("email")||""); const [token,setToken]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [error,setError]=useState(""); const [success,setSuccess]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setError("");setSuccess("");
    if(password.length<5||password.length>20){setError("A senha deve ter entre 5 e 20 caracteres.");return;}
    if(password!==confirm){setError("As senhas não coincidem.");return;}
    if(!/^\d{6}$/.test(token)){setError("Digite o código de 6 dígitos recebido por e-mail.");return;}
    setLoading(true); const supabase=createClient();
    const {error:verify}=await supabase.auth.verifyOtp({email,token,type:"recovery"});
    if(verify){setLoading(false);setError("Código inválido ou expirado.");return;}
    const {error:update}=await supabase.auth.updateUser({password});
    setLoading(false);
    if(update){setError("Não foi possível atualizar a senha.");return;}
    await supabase.auth.signOut(); setSuccess("Senha redefinida com sucesso. Você já pode entrar novamente.");
  }
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">F</span><strong>fluxo</strong></div><h1>Nova senha</h1><p>Informe o código enviado e escolha sua nova senha.</p>
    <form onSubmit={submit} className="auth-form"><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Código<input inputMode="numeric" pattern="\d{6}" maxLength={6} required value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,""))} placeholder="000000"/></label><label>Nova senha<input type="password" required minLength={5} maxLength={20} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirmar nova senha<input type="password" required minLength={5} maxLength={20} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    {error&&<p className="auth-error">{error}</p>}{success&&<p className="auth-success">{success}</p>}<button className="primary auth-submit" disabled={loading}>{loading?"Salvando...":"Redefinir senha"}</button></form><Link className="auth-link" href="/login">Voltar para o login</Link>
  </section></main>;
}


export default function Page(){
  return <Suspense fallback={<main className="auth-page"><section className="auth-card"><p>Carregando...</p></section></main>}><ResetPage /></Suspense>;
}
