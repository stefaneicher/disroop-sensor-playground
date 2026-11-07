#!/usr/bin/env bash
# Smoke-Test des Werkzeug-Images: jedes Werkzeug macht eine kleine echte Aufgabe, das Ergebnis wird geprüft.
# Läuft im Container (./project hw smoke). Ausgabe: devices/motion-one/logs/tools-smoke/
set -u
OUT=${1:-devices/motion-one/logs/tools-smoke}
mkdir -p "$OUT"; cd "$OUT"
export HOME=${HOME:-/tmp}
fails=0
ok()   { printf 'PASS  %-12s %s\n' "$1" "$2"; }
bad()  { printf 'FAIL  %-12s %s\n' "$1" "$2"; fails=$((fails+1)); }
size() { [ -s "$1" ] && echo "$1 ($(stat -c %s "$1") B)"; }

# KiCad: Version und ein leeres Board als Gerber exportieren
v=$(kicad-cli version 2>/dev/null)
cat > test.kicad_pcb <<'K'
(kicad_pcb (version 20240108) (generator "smoke") (general (thickness 1.6)) (paper "A4")
  (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (44 "Edge.Cuts" user))
  (gr_rect (start 0 0) (end 40 25) (stroke (width 0.1) (type default)) (layer "Edge.Cuts")))
K
if kicad-cli pcb export gerbers -o gerber/ test.kicad_pcb >kicad.log 2>&1 && ls gerber/*Edge_Cuts* >/dev/null 2>&1
then ok KiCad "$v, Gerber exportiert"; else bad KiCad "$v, siehe kicad.log"; fi

# FreeCAD: Gehäuse-Testteil (Quader mit Bohrung) als STEP und STL
cat > part.py <<'P'
import FreeCAD, Part, Mesh
b = Part.makeBox(40, 25, 12).cut(Part.makeCylinder(3, 12, FreeCAD.Vector(20, 12.5, 0)))
b.exportStep("part.step")
m = Mesh.Mesh(); m.addFacets(b.tessellate(0.1)); m.write("part.stl")
P
freecadcmd part.py >freecad.log 2>&1
[ -s part.step ] && [ -s part.stl ] && ok FreeCAD "$(size part.stl)" || bad FreeCAD "siehe freecad.log"

# trimesh: STL ist wasserdicht
python3 -c "import trimesh,sys; m=trimesh.load('part.stl'); sys.exit(0 if m.is_watertight else 1)" 2>/dev/null \
  && ok trimesh "part.stl wasserdicht" || bad trimesh "part.stl nicht wasserdicht"

# Bambu Studio: Testteil mit den Systemprofilen für den Bambu Lab P2S (0,4-mm-Düse, PLA Basic, 0,20 mm Standard) slicen
BBL=/opt/bambu-studio/resources/profiles/BBL
bambu-studio --slice 0 --arrange 1 --orient 1 --outputdir slice \
  --load-settings "$BBL/machine/Bambu Lab P2S 0.4 nozzle.json;$BBL/process/0.20mm Standard @BBL P2S.json" \
  --load-filaments "$BBL/filament/Bambu PLA Basic @BBL P2S.json" part.stl >bambu.log 2>&1
g=$(find slice -name '*.gcode' 2>/dev/null | head -1)
if [ -n "$g" ] && grep -q "P2S" "$g"; then
  ok Bambu "P2S, $(grep -m1 -oE 'model printing time: [^;]*' "$g"), $(size "$g")"
else bad Bambu "kein G-Code für den P2S, siehe bambu.log"; fi

# Blender: Testteil rendern (Cycles, CPU)
cat > render.py <<'R'
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath="part.stl")
o = bpy.context.selected_objects[0]
bpy.ops.object.camera_add(location=(90, -90, 70)); cam = bpy.context.object
c = cam.constraints.new("TRACK_TO"); c.target = o
bpy.ops.object.light_add(type="SUN", location=(0, 0, 100))
s = bpy.context.scene; s.camera = cam; s.render.engine = "CYCLES"; s.cycles.samples = 8
s.render.resolution_x, s.render.resolution_y = 320, 240; import os; s.render.filepath = os.path.abspath("render.png")
bpy.ops.render.render(write_still=True)
R
blender -b -P render.py >blender.log 2>&1
[ -s render.png ] && ok Blender "$(blender --version 2>/dev/null | head -1), $(size render.png)" || bad Blender "siehe blender.log"

# ngspice: RC-Glied, Spannung nach 5 tau
cat > rc.cir <<'S'
RC smoke
V1 in 0 PULSE(0 3.3 0 1n 1n 1 2)
R1 in out 10k
C1 out 0 100n
.tran 10u 5m
.control
run
meas tran vend FIND v(out) AT=5m
quit
.endc
.end
S
vend=$(ngspice -b rc.cir 2>&1 | awk '/vend/{print $3; exit}')
awk -v v="$vend" 'BEGIN{exit !(v>3.2 && v<3.31)}' && ok ngspice "v(out)=$vend V" || bad ngspice "v(out)=$vend"

# pandoc + xelatex: deutsches PDF
printf '# Prüfbericht\n\nÄnderung, Größe, ±4000 °/s, µA.\n' > doc.md
pandoc doc.md -o doc.pdf --pdf-engine=xelatex >pandoc.log 2>&1
[ -s doc.pdf ] && ok pandoc "$(size doc.pdf)" || bad pandoc "siehe pandoc.log"

# ffmpeg: 2-s-Video aus dem Render
if [ -s render.png ]; then
  ffmpeg -y -loop 1 -i render.png -t 2 -r 25 -pix_fmt yuv420p clip.mp4 >ffmpeg.log 2>&1
  [ -s clip.mp4 ] && ok ffmpeg "$(size clip.mp4)" || bad ffmpeg "siehe ffmpeg.log"
else bad ffmpeg "kein render.png als Eingabe"; fi

# CadQuery, Gmsh, CalculiX: parametrischer Würfel, Vernetzung, Solver-Version
python3 -c "import cadquery as cq; cq.exporters.export(cq.Workplane().box(20,20,20).faces('>Z').hole(5),'cube.stl')" >cq.log 2>&1
[ -s cube.stl ] && ok CadQuery "$(size cube.stl)" || bad CadQuery "siehe cq.log"
gv=$(gmsh --version 2>&1 | tail -1); [ -n "$gv" ] && gmsh -version >/dev/null 2>&1 && ok Gmsh "$gv" || bad Gmsh "gmsh --version: $gv"
command -v ccx >/dev/null && ok CalculiX "$(ccx -v 2>&1 | grep -m1 Version)" || bad CalculiX "ccx fehlt"

echo "Fehler: $fails"
exit $fails
