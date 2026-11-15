"""Narration -> build/<lang>/tts/<scene>.wav and build/<lang>/durations.json.
en: Kokoro (offline, Apache-2.0, VOICE=am_michael). de: Piper, voice de-thorsten-low (offline, MIT)."""
import json, os, wave
from lang import LANG, SCRIPT, BUILD, MODELS
os.makedirs(f"{BUILD}/tts", exist_ok=True)
sc = json.load(open(SCRIPT, encoding="utf-8")); dur = {}

if LANG == "de":
    from piper import PiperVoice, SynthesisConfig
    v = PiperVoice.load(f"{MODELS}/de-thorsten-low.onnx")
    cfg = SynthesisConfig(length_scale=float(os.environ.get("SPEED", "1.12")))  # >1 = slower, calmer narration
    def speak(text, path):
        with wave.open(path, "wb") as w: v.synthesize_wav(text, w, syn_config=cfg)
else:
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(f"{MODELS}/kokoro-v1.0.int8.onnx", f"{MODELS}/voices-v1.0.bin")
    def speak(text, path):
        a, sr = k.create(text, voice=os.environ.get("VOICE", "am_michael"), speed=1.0, lang="en-us")
        sf.write(path, a, sr)

import soundfile as sf
for s in sc:
    p = f"{BUILD}/tts/{s['id']}.wav"
    speak(s.get("say", s["text"]), p)
    info = sf.info(p); dur[s["id"]] = round(info.frames / info.samplerate, 3)
    print(s["id"], dur[s["id"]], flush=True)
json.dump(dur, open(f"{BUILD}/durations.json", "w"), indent=1)
