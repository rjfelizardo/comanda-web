import 'server-only';

const GRAPH = 'https://graph.facebook.com/v21.0';

async function graph(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// Confere o token e devolve o numero exibido (usado ao conectar).
export async function checkNumber(token: string, phoneNumberId: string) {
  const r = await graph(token, `/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`);
  return r.ok ? { display: String(r.json.display_phone_number ?? ''), name: String(r.json.verified_name ?? '') } : null;
}

export async function sendText(token: string, phoneNumberId: string, to: string, body: string) {
  // O WhatsApp aceita ate 4096 caracteres por mensagem.
  const text = body.slice(0, 4000);
  const r = await graph(token, `/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body: text } }),
  });
  if (!r.ok) console.error('wa send', r.status, JSON.stringify(r.json).slice(0, 300));
  return r.ok;
}

export async function markRead(token: string, phoneNumberId: string, messageId: string) {
  await graph(token, `/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {});
}

// Baixa o audio recebido e transcreve (Groq Whisper). Devolve null se nao for possivel.
export async function transcribeAudio(token: string, mediaId: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const meta = await graph(token, `/${encodeURIComponent(mediaId)}`);
  const url = meta.json?.url;
  if (!meta.ok || typeof url !== 'string') return null;
  const file = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!file.ok) return null;
  const buf = await file.arrayBuffer();
  if (buf.byteLength > 10_000_000) return null;
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/ogg' }), 'audio.ogg');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  form.append('response_format', 'json');
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!r.ok) {
    console.error('groq stt', r.status);
    return null;
  }
  const j: any = await r.json().catch(() => ({}));
  const t = typeof j.text === 'string' ? j.text.trim() : '';
  return t || null;
}
