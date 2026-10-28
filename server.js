import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrega o .env ao lado do server.js, mesmo que o terminal seja aberto em outra pasta.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envResult = dotenv.config({ path: path.join(__dirname, '.env') });
if (envResult.error && envResult.error.code !== 'ENOENT') {
  console.error('Erro ao ler .env:', envResult.error.message);
}
console.log('[CONFIG] .env encontrado:', !envResult.error);
console.log('[CONFIG] Provedor de voz:', process.env.TTS_PROVIDER || 'browser');
console.log('[CONFIG] Chatterbox local: sem chave de API; exige serviço Python em execução.');
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const clients = new Set();
let tiktok = null;
let tiktokStatus = { connected: false, username: process.env.TIKTOK_USERNAME || '', message: 'Desconectado' };
let settings = {
  character: 'sukuna',
  background: 'shrine',
  aiProvider: process.env.AI_PROVIDER || 'openai',
  voice: ['chatterbox', 'fish', 'browser'].includes(process.env.TTS_PROVIDER) ? process.env.TTS_PROVIDER : 'browser',
  voiceRate: 1,
  voicePitch: 0.72,
  replyToChat: true,
  replyToGifts: true,
  replyCooldownSeconds: 8,
  prompt: 'Você é um personagem de anime inspirado em um rei das maldições: confiante, sarcástico, teatral e divertido. Responda em português brasileiro, em uma ou duas frases curtas. Não afirme ser o personagem oficial nem o dublador original. Nunca incentive violência real.'
};
const recentReplies = new Map();

function broadcast(type, data = {}) {
  const payload = JSON.stringify({ type, ...data });
  for (const client of clients) if (client.readyState === 1) client.send(payload);
}
wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'state', settings, tiktokStatus }));
  ws.on('close', () => clients.delete(ws));
});

app.get('/api/status', (_, res) => res.json({
  settings,
  tiktokStatus,
  aiConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY),
  ttsConfigured: (process.env.TTS_PROVIDER === 'chatterbox') || Boolean(process.env.FISH_AUDIO_API_KEY),
  ttsProvider: process.env.TTS_PROVIDER || 'browser'
}));
app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  broadcast('settings', { settings });
  res.json({ ok: true, settings });
});
app.post('/api/test-event', async (req, res) => {
  const { kind = 'comment', username = 'Visitante', text = 'Oi!' } = req.body;
  const event = { kind, username, text, giftName: req.body.giftName || 'Rosa', repeatCount: req.body.repeatCount || 1 };
  broadcast('event', { event });
  if (kind === 'comment' && settings.replyToChat) {
    const reply = await makeReply(username, text);
    broadcast('reply', { username, text: reply });
  } else if (kind === 'gift' && settings.replyToGifts) {
    broadcast('reaction', { reaction: reactionForGift(event.giftName), event });
  }
  res.json({ ok: true });
});
app.post('/api/connect-tiktok', async (req, res) => {
  const username = String(req.body.username || settings.tiktokUsername || process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();
  if (!username) return res.status(400).json({ error: 'Informe o usuário do TikTok sem @.' });
  try {
    if (tiktok) { try { await tiktok.disconnect(); } catch {} tiktok = null; }
    tiktokStatus = { connected: false, username, message: 'Conectando…' };
    broadcast('tiktok-status', { tiktokStatus });
    tiktok = new TikTokLiveConnection(username);
    tiktok.on(WebcastEvent.CHAT, async data => {
      const name = data.nickname || data.uniqueId || 'Visitante';
      const comment = data.comment || '';
      broadcast('event', { event: { kind: 'comment', username: name, text: comment } });
      if (settings.replyToChat && comment.trim()) {
        const key = `${name}:${comment}`;
        const now = Date.now();
        if (now - (recentReplies.get(name) || 0) >= Number(settings.replyCooldownSeconds) * 1000) {
          recentReplies.set(name, now);
          const reply = await makeReply(name, comment);
          broadcast('reply', { username: name, text: reply });
        }
      }
    });
    tiktok.on(WebcastEvent.GIFT, data => {
      const giftName = data.giftName || 'Presente';
      const username = data.nickname || data.uniqueId || 'Visitante';
      const repeatCount = data.repeatCount || 1;
      const event = { kind: 'gift', username, giftName, repeatCount };
      broadcast('event', { event });
      if (settings.replyToGifts) broadcast('reaction', { reaction: reactionForGift(giftName), event });
    });
    await tiktok.connect();
    tiktokStatus = { connected: true, username, message: 'Conectado à live' };
    broadcast('tiktok-status', { tiktokStatus });
    res.json({ ok: true, tiktokStatus });
  } catch (e) {
    tiktokStatus = { connected: false, username, message: e.message || 'Falha ao conectar' };
    broadcast('tiktok-status', { tiktokStatus });
    res.status(502).json({ error: tiktokStatus.message });
  }
});
app.post('/api/disconnect-tiktok', async (_, res) => {
  try { if (tiktok) await tiktok.disconnect(); } catch {}
  tiktok = null;
  tiktokStatus = { connected: false, username: tiktokStatus.username, message: 'Desconectado' };
  broadcast('tiktok-status', { tiktokStatus });
  res.json({ ok: true });
});
app.post('/api/tts', async (req, res) => {
  const text = String(req.body.text || '').slice(0, 300);
  if (!text.trim()) return res.status(400).json({ error: 'Texto vazio.' });

  if ((settings.voice || process.env.TTS_PROVIDER) === 'chatterbox' || process.env.TTS_PROVIDER === 'chatterbox') {
    try {
      const response = await fetch(`http://127.0.0.1:${process.env.LOCAL_TTS_PORT || 8765}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) {
        const detail = await response.text();
        console.error('Chatterbox local error:', response.status, detail);
        return res.status(response.status).json({ error: `Chatterbox local: ${detail.slice(0, 500)}` });
      }
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('Chatterbox local indisponível:', error.message);
      return res.status(502).json({ error: 'A voz local não está iniciada. Execute INICIAR-VOZ-LOCAL.bat e aguarde o modelo carregar.' });
    }
  }

  if (!process.env.FISH_AUDIO_API_KEY) return res.status(400).json({ error: 'FISH_AUDIO_API_KEY não está configurada no .env.' });
  const referenceId = process.env.FISH_AUDIO_VOICE_ID || '';
  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        'model': process.env.FISH_AUDIO_MODEL || 's2.1-pro'
      },
      body: JSON.stringify({ text, ...(referenceId ? { reference_id: referenceId } : {}), format: 'mp3' })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('Fish Audio TTS error:', response.status, detail);
      return res.status(response.status).json({ error: `Fish Audio retornou HTTP ${response.status}. Verifique a chave, os créditos e o Voice ID.` });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Fish Audio request failed:', error.message);
    res.status(502).json({ error: 'Não foi possível acessar a Fish Audio.' });
  }
});

app.post('/api/reply', async (req, res) => {
  const username = String(req.body.username || 'Visitante').slice(0, 80);
  const comment = String(req.body.comment || '').slice(0, 1000);
  res.json({ reply: await makeReply(username, comment) });
});

function reactionForGift(giftName = '') {
  const g = giftName.toLowerCase();
  if (g.includes('rosa') || g.includes('rose')) return 'dance';
  if (g.includes('balão') || g.includes('balloon') || g.includes('ball')) return 'jump';
  if (g.includes('galáxia') || g.includes('galaxy') || g.includes('universo')) return 'explosion';
  if (g.includes('leão') || g.includes('lion')) return 'ultimate';
  return 'celebrate';
}
async function makeReply(username, comment) {
  const provider = settings.aiProvider || process.env.AI_PROVIDER || 'openai';
  const key = provider === 'xai' ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY;
  if (provider === 'local' || !key) {
    return localReply(username, comment);
  }
  try {
    const client = new OpenAI({
      apiKey: key,
      baseURL: provider === 'xai' ? 'https://api.x.ai/v1' : undefined
    });
    const model = provider === 'xai' ? (process.env.XAI_MODEL || 'grok-3-mini') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: settings.prompt },
        { role: 'user', content: `Nome de quem comentou: ${username}\nComentário: ${comment}\nResponda diretamente ao comentário.` }
      ],
      max_tokens: 90,
      temperature: 0.9
    });
    return completion.choices?.[0]?.message?.content?.trim() || localReply(username, comment);
  } catch (e) {
    console.error('Falha na IA:', e.message);
    return localReply(username, comment);
  }
}
function localReply(username, comment) {
  const c = comment.toLowerCase();
  if (c.includes('oi') || c.includes('olá') || c.includes('salve')) return `${username}, veio saudar o rei das maldições? Fique. Talvez eu esteja de bom humor.`;
  if (c.includes('gosto') || c.includes('amo')) return `Hah! Pelo menos você reconhece algo de valor, ${username}.`;
  if (c.includes('?')) return `Uma pergunta interessante, ${username}. Até você pode surpreender.`;
  return `Eu vi seu comentário, ${username}. Continue falando, estou me divertindo.`;
}
const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`Sukuna Live em http://127.0.0.1:${port}`));
