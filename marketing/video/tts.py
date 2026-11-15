"""Narration with Kokoro TTS (offline, Apache-2.0). Writes build/tts/<scene>.wav and build/durations.json."""
import json, os, soundfile as sf
from kokoro_onnx import Kokoro
B = os.path.dirname(os.path.abspath(__file__)); BUILD = f"{B}/build"; os.makedirs(f"{BUILD}/tts", exist_ok=True)
MODELS = os.environ.get("KOKORO_DIR", f"{BUILD}/models")
VOICE = os.environ.get("VOICE", "am_michael")
k = Kokoro(f"{MODELS}/kokoro-v1.0.int8.onnx", f"{MODELS}/voices-v1.0.bin")
sc = json.load(open(f"{B}/script.json")); dur = {}
for s in sc:
    a, sr = k.create(s["text"].replace("Thingy fifty-two", "Thingy fifty two"), voice=VOICE, speed=1.0, lang="en-us")
    sf.write(f"{BUILD}/tts/{s['id']}.wav", a, sr); dur[s["id"]] = round(len(a)/sr, 3)
    print(s["id"], dur[s["id"]], flush=True)
json.dump(dur, open(f"{BUILD}/durations.json", "w"), indent=1)
