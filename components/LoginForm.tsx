'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'cadastro'>(params.get('modo') === 'cadastro' ? 'cadastro' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace('/painel');
          router.refresh();
        } else {
          setInfo('Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace('/painel');
        router.refresh();
      }
    } catch (err: any) {
      const m = String(err?.message ?? '');
      if (/invalid login/i.test(m)) setError('E-mail ou senha incorretos.');
      else if (/already registered|already been registered/i.test(m)) setError('Este e-mail já tem conta. Use “Entrar”.');
      else if (/not confirmed/i.test(m)) setError('Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.');
      else if (/rate limit/i.test(m)) setError('Muitas tentativas. Aguarde alguns minutos.');
      else setError('Não foi possível continuar. Tente novamente.');
    }
    setBusy(false);
  }

  async function forgot() {
    setError('');
    setInfo('');
    if (!email.includes('@')) return setError('Digite seu e-mail acima para receber o link.');
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/painel/config`,
    });
    if (error) setError('Não foi possível enviar o e-mail agora.');
    else setInfo('Se esse e-mail tiver conta, enviamos um link para criar nova senha.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <Link href="/" className="flex items-center gap-3 self-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={48} height={48} />
        <span className="font-display text-2xl font-extrabold">Comanda</span>
      </Link>

      <div className="grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-semibold">
        {(['login', 'cadastro'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(''); setInfo(''); }}
            className={`rounded-full py-2.5 ${mode === m ? 'bg-white shadow-card' : 'text-ink/60'}`}
          >
            {m === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" required className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="senha">Senha</label>
          <input id="senha" type="password" required minLength={8} className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{info}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}</button>
        {mode === 'login' && (
          <button type="button" onClick={forgot} className="text-sm font-semibold text-brand-dark underline">Esqueci minha senha</button>
        )}
      </form>
    </main>
  );
}
