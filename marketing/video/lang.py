"""Language selection shared by the video scripts: VIDEO_LANG=en (default) or de."""
import os
B = os.path.dirname(os.path.abspath(__file__))
LANG = os.environ.get("VIDEO_LANG", "en")
SCRIPT = f"{B}/script.json" if LANG == "en" else f"{B}/script.{LANG}.json"
BUILD = f"{B}/build/{LANG}"          # per language: clips, shots, tts, scenes
MODELS = os.environ.get("MODELS_DIR", f"{B}/build/models")
OUT = f"{B}/sensor-playground-explainer.mp4" if LANG == "en" else f"{B}/sensor-playground-explainer-{LANG}.mp4"
# texts drawn by render.py
UI = {
    "en": dict(tag="SHOWCASE  //  BUILT BY AI", sub="motion becomes a controller"),
    "de": dict(tag="SHOWCASE  //  KI-ENTWICKELT", sub="Bewegung wird zum Controller"),
}[LANG]
os.makedirs(BUILD, exist_ok=True)
if __name__ == "__main__":
    print(OUT)
