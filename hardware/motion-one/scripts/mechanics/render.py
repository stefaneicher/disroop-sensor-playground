"""Blender-Render der Baugruppe (Geraetekoordinaten aus STEP-Exporten via STL). blender -b -P render.py"""
import bpy, math, os
D = "/workspace/hardware/motion-one/mechanics"
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n, rgb):
    m = bpy.data.materials.new(n); m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1); return m
def hx(h): return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (1, 3, 5))
parts = [("oberschale", "#1f2937", False, 0.0), ("unterschale_glatt", "#111827", True, -0.0), ("tastenkappe", "#a3e635", True, None)]
x = 0
for name, col, flip, _ in parts:
    bpy.ops.wm.stl_import(filepath=f"{D}/print/{name}.stl")
    o = bpy.context.selected_objects[0]; o.data.materials.append(mat(name, hx(col)))
    if name == "oberschale": o.location = (0, -60, 0)
    elif name == "unterschale_glatt": o.location = (0, 0, 0)
    else: o.location = (185, -10, 0)
bpy.ops.object.light_add(type="SUN", rotation=(0.6, 0.3, 0.8)); bpy.context.object.data.energy = 4
bpy.ops.object.camera_add(location=(100, -230, 170), rotation=(math.radians(50), 0, math.radians(8)))
cam = bpy.context.object; bpy.context.scene.camera = cam; cam.data.lens = 30
w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.color = (0.9, 0.9, 0.9)
r = bpy.context.scene.render; r.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_WORKBENCH"
r.resolution_x, r.resolution_y = 900, 500; r.filepath = f"{D}/renders/teile_druckorientierung.png"
bpy.ops.render.render(write_still=True)
