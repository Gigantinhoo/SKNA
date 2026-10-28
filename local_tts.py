import io
import json
import os
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import torch
import soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.environ.get("LOCAL_TTS_PORT", "8765"))
REFERENCE_AUDIO = Path(os.environ.get("TTS_REFERENCE_AUDIO", str(ROOT / "voice-reference.wav")))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL = None

def load_model():
    global MODEL
    if MODEL is None:
        print(f"[LOCAL TTS] Carregando Chatterbox Multilingual V3 em {DEVICE}.")
        print("[LOCAL TTS] A primeira inicialização baixa os pesos do modelo; pode demorar.")
        MODEL = ChatterboxMultilingualTTS.from_pretrained(device=DEVICE)
        print("[LOCAL TTS] Modelo pronto.")
    return MODEL

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[LOCAL TTS]", fmt % args)

    def do_GET(self):
        if self.path == "/health":
            ready = MODEL is not None
            body = json.dumps({
                "ok": True,
                "modelLoaded": ready,
                "device": DEVICE,
                "referenceAudio": REFERENCE_AUDIO.exists()
            }).encode("utf-8")
            self.send_response(200 if ready else 503)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != "/tts":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            text = str(data.get("text", "")).strip()[:300]
            if not text:
                return self.respond_json(400, {"error": "Texto vazio."})
            model = load_model()
            kwargs = {"language_id": "Portuguese", "exaggeration": 0.65, "cfg_weight": 0.35}
            if REFERENCE_AUDIO.exists():
                kwargs["audio_prompt_path"] = str(REFERENCE_AUDIO)
                print(f"[LOCAL TTS] Usando áudio de referência: {REFERENCE_AUDIO.name}")
            wav = model.generate(text, **kwargs).squeeze().detach().cpu().numpy()
            buffer = io.BytesIO()
            sf.write(buffer, wav, model.sr, format="WAV", subtype="PCM_16")
            payload = buffer.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:
            traceback.print_exc()
            self.respond_json(500, {"error": f"Chatterbox local falhou: {exc}"})

    def respond_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

if __name__ == "__main__":
    try:
        load_model()
        print(f"[LOCAL TTS] Serviço local em http://{HOST}:{PORT}")
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except Exception:
        traceback.print_exc()
        input("Falha ao iniciar o Chatterbox. Pressione Enter para fechar...")
