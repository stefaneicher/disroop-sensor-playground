"""Mix narration (build/tts) with a quiet synthetic ambient bed -> build/narration_mix.wav."""
import json, os, numpy as np, soundfile as sf
B = os.path.dirname(os.path.abspath(__file__)); BUILD = f"{B}/build"
SR = 24000
sc = json.load(open(f"{B}/script.json")); dur = json.load(open(f"{BUILD}/durations.json"))
PAD_IN, PAD_OUT = 0.6, 0.9
parts = []
for s in sc:
    a, sr = sf.read(f"{BUILD}/tts/{s['id']}.wav"); assert sr == SR
    total = int(round((dur[s['id']] + PAD_IN + PAD_OUT) * 30)) / 30  # match video frame count
    buf = np.zeros(int(total * SR)); o = int(PAD_IN * SR); buf[o:o+len(a)] = a[:len(buf)-o]
    parts.append(buf)
voice = np.concatenate(parts)
n = len(voice); t = np.arange(n) / SR
# quiet ambient pad: slow-moving minor chord + soft pulse
bed = np.zeros(n)
for f, ph in [(55, 0), (82.4, 1), (110, 2), (130.8, 3), (164.8, 4)]:
    lfo = 0.6 + 0.4 * np.sin(2*np.pi*0.05*t + ph)
    bed += lfo * (np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*2*f*t + ph))
beat = np.exp(-((t % 1.0) * 12)) * np.sin(2*np.pi*48*t)  # soft 60 bpm heartbeat thump
bed = bed / np.abs(bed).max() * 0.05 + beat * 0.04
fade = np.minimum(1, np.minimum(t / 2.0, (t[-1] - t) / 3.0))
mix = voice * 0.95 + bed * fade
mix = mix / max(1.0, np.abs(mix).max() / 0.98)
sf.write(f"{BUILD}/narration_mix.wav", mix, SR)
print("audio seconds", n / SR)
