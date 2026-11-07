#!/usr/bin/env bash
# Vorab-Smoke-Test vor den Master-Prompts: prüft nur, installiert nichts.
# Aufruf aus dem Repo-Wurzelordner (WSL): devices/motion-one/preflight.sh
# Ergebnis: devices/motion-one/preflight/PREFLIGHT_RESULT.md
set -u
cd "$(dirname "$0")/../.."
OUT=devices/motion-one/preflight/PREFLIGHT_RESULT.md
IMAGE=disroop-sensor-playground-dev
WIN_PROGRAMS=("/mnt/c/Program Files" "/mnt/c/Program Files (x86)" "/mnt/c/Users/${WIN_USER:-stefa}/AppData/Local/Programs")
mkdir -p "$(dirname "$OUT")"

rows=()
row() { rows+=("| $1 | $2 | $3 | $4 |"); }   # Bereich | Prüfung | Status | Detail

find_win() { # erstes Vorkommen einer Windows-exe unter den Programmordnern
  local name=$1 d
  for d in "${WIN_PROGRAMS[@]}"; do
    [ -d "$d" ] || continue
    find "$d" -maxdepth 4 -iname "$name" 2>/dev/null | head -1 | grep . && return 0
  done
  return 1
}

# --- Host ---
row Host "Betriebssystem" INFO "$(. /etc/os-release; echo "$PRETTY_NAME"), Kernel $(uname -r)"
row Host "CPU / RAM" INFO "$(nproc) Kerne, $(free -g | awk '/Mem:/{print $2}') GB RAM"
row Host "Freier Speicher C:" INFO "$(df -h /mnt/c 2>/dev/null | awk 'NR==2{print $4}')"

# --- Basis ---
if docker info >/dev/null 2>&1; then row Basis "Docker" PASS "$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
else row Basis "Docker" FAIL "Docker Desktop starten"; fi
if docker image inspect "$IMAGE" >/dev/null 2>&1; then row Basis "Devcontainer-Image" PASS "$IMAGE"
else row Basis "Devcontainer-Image" MISSING "./project build-image o. ä. ausführen"; fi
if gh auth status >/dev/null 2>&1; then row Basis "GitHub CLI angemeldet" PASS "$(gh --version | head -1)"
else row Basis "GitHub CLI angemeldet" FAIL "gh auth login"; fi
cv=$(timeout 20 copilot --version 2>/dev/null | head -1)
[ -n "$cv" ] && row Basis "Copilot CLI" PASS "$cv" || row Basis "Copilot CLI" FAIL "nicht gefunden"
row Basis "Node.js (Host)" "$(command -v node >/dev/null && echo PASS || echo MISSING)" "$(node --version 2>/dev/null)"

# --- MCP-Server ---
mcp=$(timeout 30 copilot mcp list 2>/dev/null)
check_mcp() { # Name-Muster | Zweck | Pflicht
  if grep -qiE "$1" <<<"$mcp"; then row MCP "$2" PASS "$(grep -iE "$1" <<<"$mcp" | head -1 | xargs)"
  else row MCP "$2" "$([ "$3" = ja ] && echo MISSING || echo OPTIONAL)" "nicht konfiguriert (Pflicht: $3)"; fi
}
check_mcp 'github'     "GitHub (Repo, CI)"                   ja
check_mcp 'playwright' "Playwright (Browser, Shop-/Lagerseiten, Produktseiten-Tests)" ja
check_mcp 'kicad'      "KiCad"                               nein
check_mcp 'freecad'    "FreeCAD"                             nein
check_mcp 'blender'    "Blender"                             nein
check_mcp 'jlc|lcsc'   "JLCPCB/LCSC-Teilesuche"              nein
check_mcp 'stripe'     "Stripe (Prompt 2, Testmodus)"        nein

# --- Windows-Programme ---
p=$(find_win kicad-cli.exe) && row Programme "KiCad (kicad-cli)" PASS "$("$p" version 2>/dev/null | tr -d '\r')" \
  || row Programme "KiCad (kicad-cli)" MISSING "KiCad 9/10 installieren"
p=$(find_win freecadcmd.exe) && row Programme "FreeCAD (freecadcmd)" PASS "${p#/mnt/c/}" \
  || row Programme "FreeCAD (freecadcmd)" OPTIONAL "CadQuery im Container genügt"
p=$(find_win blender.exe) && row Programme "Blender" PASS "$("$p" --version 2>/dev/null | head -1 | tr -d '\r')" \
  || row Programme "Blender" MISSING "Blender installieren"
slicer=""
for s in prusa-slicer-console.exe prusa-slicer.exe orca-slicer.exe bambu-studio.exe CuraEngine.exe; do
  p=$(find_win "$s") && { slicer="$s: ${p#/mnt/c/}"; break; }
done
[ -n "$slicer" ] && row Programme "Slicer mit CLI" PASS "$slicer" \
  || row Programme "Slicer mit CLI" MISSING "PrusaSlicer oder OrcaSlicer installieren bzw. im Container bereitstellen"

# --- Container-Werkzeuge ---
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  for t in ffmpeg pandoc ngspice python3 node git xelatex freecadcmd blender; do
    if docker run --rm --entrypoint sh "$IMAGE" -c "command -v $t" >/dev/null 2>&1; then
      row Container "$t" PASS "im Image"
    elif [ "$t" = freecadcmd ] || [ "$t" = blender ]; then
      row Container "$t" OPTIONAL "fehlt im Image; Windows-Version (oben) oder CadQuery nutzbar"
    else
      row Container "$t" MISSING "im Image ergänzen (Dockerfile oder eigenes Geräte-Image)"
    fi
  done
fi

# --- Dienste für Prompt 2 ---
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if gh api "repos/$repo/pages" >/dev/null 2>&1; then row "Prompt 2" "GitHub Pages" PASS "aktiv für $repo"
else row "Prompt 2" "GitHub Pages" MISSING "in den Repo-Settings aktivieren (Quelle: GitHub Actions)"; fi
if [ -f "$HOME/.env" ] && grep -q '^FAL_KEY=.' "$HOME/.env"; then row "Prompt 2" "fal.ai-Schlüssel in ~/.env" PASS "vorhanden (Wert nicht angezeigt)"
else row "Prompt 2" "fal.ai-Schlüssel in ~/.env" MANUELL "Konto bei fal.ai, FAL_KEY=… in ~/.env, chmod 600 ~/.env"; fi
row "Prompt 2" "Stripe-Konto (Testmodus)" MANUELL "Konto anlegen, Test-Key nur lokal in ~/.env (nicht im Repo)"
row "Prompt 2" "Warteliste (Formulardienst mit Double-Opt-in)" MANUELL "Dienst wählen (z. B. Formspree, Brevo, Buttondown) und Konto anlegen"

{
  echo "# Vorab-Smoke-Test"
  echo
  echo "Erzeugt: $(date '+%Y-%m-%d %H:%M %Z') mit \`devices/motion-one/preflight.sh\`. Prüft nur, installiert nichts."
  echo "Status: PASS = bereit, MISSING = fehlt (Pflicht), OPTIONAL = Kommandozeile reicht, MANUELL = nur du kannst das, INFO."
  echo
  echo "| Bereich | Prüfung | Status | Detail |"
  echo "|---|---|---|---|"
  printf '%s\n' "${rows[@]}"
} > "$OUT"

cat "$OUT"
missing=$(printf '%s\n' "${rows[@]}" | grep -cE '\| (MISSING|FAIL) \|')
echo
echo "Fehlend/Fehler: $missing  →  $OUT"
