# Rendert Motion One aus mechanics/assembly_stl/*.stl (echte Geometrie, mm -> m Skalierung 0.001).
# Aufruf: blender -b -P scripts/media/render_product.py -- <assembly_stl_dir> <outdir> [view ...]
import bpy, sys, os, json, math
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
views = argv[2:] or ["iso_closed", "iso_open", "exploded", "top_open"]
os.makedirs(out, exist_ok=True)
ex = json.load(open(os.path.join(src, "explode.json")))["parts"]
COL = {"oberschale": (0.08, 0.09, 0.11, 1), "unterschale_glatt": (0.12, 0.13, 0.15, 1),
       "tastenkappe": (0.95, 0.45, 0.05, 1), "lichtleiter": (0.7, 0.9, 1.0, 1),
       "pcb_r3": (0.05, 0.35, 0.15, 1), "akku": (0.2, 0.3, 0.8, 1)}

def build(mode):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = {}
    for name, p in ex.items():
        if mode == "open" and name == "oberschale":
            continue
        bpy.ops.wm.stl_import(filepath=os.path.join(src, p["file"]))
        o = bpy.context.selected_objects[0]
        o.scale = (0.001,) * 3
        bpy.context.view_layer.update()
        dims = [round(d * 1000, 2) for d in o.dimensions]
        print("DIM_MM", name, dims)
        if mode == "exploded":
            o.location = tuple(v * 0.001 for v in p["explode_mm"])
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = COL.get(name, (0.5,) * 3 + (1,))
        b.inputs["Roughness"].default_value = 0.45
        if name == "lichtleiter":
            b.inputs["Alpha"].default_value = 0.6
        o.data.materials.append(m)
        objs[name] = o
    return objs

def render(mode, loc, target, fname, lens=70, ortho=None):
    objs = build(mode)
    sc = bpy.context.scene
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object; sc.camera = cam
    cam.data.lens = lens
    if ortho:
        cam.data.type = "ORTHO"; cam.data.ortho_scale = ortho
    t = bpy.data.objects.new("t", None); sc.collection.objects.link(t); t.location = target
    c = cam.constraints.new("TRACK_TO"); c.target = t
    c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    for loc_l, e in (((0.1, -0.2, 0.3), 3.0), ((-0.2, 0.1, 0.2), 1.2)):
        bpy.ops.object.light_add(type="AREA", location=loc_l)
        bpy.context.object.data.energy = e * 30; bpy.context.object.data.size = 0.3
        bpy.context.object.rotation_euler = (0, 0, 0)
        tc = bpy.context.object.constraints.new("TRACK_TO"); tc.target = t
        tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 3840; sc.render.resolution_y = 2160; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = os.path.join(out, fname)
    bpy.ops.render.render(write_still=True)
    print("RENDERED", fname)

C = (0.085, 0.0, 0.0)  # Mitte des Geraets (x 0..170 mm)
for v in views:
    if v == "iso_closed": render("closed", (0.30, -0.42, 0.28), C, "iso_closed.png", lens=85)
    if v == "iso_open": render("open", (0.25, -0.38, 0.30), (0.06, 0, -0.005), "iso_open.png", lens=85)
    if v == "exploded": render("exploded", (0.32, -0.55, 0.22), (0.085, 0, 0.0), "exploded_raw.png", lens=75)
    if v == "top_open": render("open", (0.06, 0, 0.8), (0.06, 0, 0), "top_open.png", lens=100, ortho=0.17)
