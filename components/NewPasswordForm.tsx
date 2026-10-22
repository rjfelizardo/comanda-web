'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function NewPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => setReady(!!data.user));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError('Não foi possível trocar a senha. Peça um novo link e tente de novo.');
    router.replace('/painel');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={48} height={48} />
        <span className="font-display text-2xl font-extrabold">Comanda</span>
      </div>
      <h1 className="text-center text-2xl font-extrabold">Crie sua nova senha</h1>

      {ready === false && (
        <div className="grid gap-3 text-center">
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            Este link expirou ou foi aberto em outro navegador. Peça um novo link na tela de entrada e abra-o no mesmo aparelho.
          </p>
          <Link href="/login" className="btn-primary">Voltar para entrar</Link>
        </div>
      )}

      {ready && (
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label className="label" htmlFor="nova">Nova senha</label>
            <div className="relative">
              <input id="nova" type={show ? 'text' : 'password'} required minLength={8} className="input pr-20" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="absolute inset-y-0 right-2 my-auto h-9 rounded-full px-3 text-sm font-semibold text-brand-dark">
                {show ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <p className="mt-1 text-xs text-ink/50">Pelo menos 8 caracteres.</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      )}
    </main>
  );
}
