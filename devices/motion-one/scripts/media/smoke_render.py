# Smoke-Test §5.5: STL bekannter Grösse importieren, Einheiten prüfen, PNG + Frames rendern.
# Aufruf: blender -b -P devices/motion-one/scripts/media/smoke_render.py -- <stl> <outdir>
import bpy, sys, math, os
argv = sys.argv[sys.argv.index("--") + 1:]
stl, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=stl)
obj = bpy.context.selected_objects[0]
raw = tuple(round(d, 4) for d in obj.dimensions)
print("DIM_RAW_BU", raw)  # STL in mm -> 1 BU pro mm
obj.scale = (0.001, 0.001, 0.001)
bpy.context.view_layer.update()
m = tuple(round(d, 5) for d in obj.dimensions)
print("DIM_M", m, "DIM_MM", tuple(round(d * 1000, 2) for d in obj.dimensions))
assert all(abs(a - b) < 1e-4 for a, b in zip(m, (0.040, 0.025, 0.012))), "Abmessungen falsch"
sc = bpy.context.scene
sc.unit_settings.system = "METRIC"; sc.unit_settings.length_unit = "MILLIMETERS"
mat = bpy.data.materials.new("alu"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.45, 0.8, 1)
obj.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0.08, -0.08, 0.06))
cam = bpy.context.object; sc.camera = cam
c = cam.constraints.new("TRACK_TO"); c.target = obj
bpy.ops.object.light_add(type="SUN", location=(0, 0, 1)); bpy.context.object.data.energy = 4
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 8
sc.render.resolution_x = 640; sc.render.resolution_y = 480; sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = os.path.join(out, "smoke_still.png")
bpy.ops.render.render(write_still=True)
obj.rotation_mode = "XYZ"
obj.keyframe_insert("rotation_euler", frame=1)
obj.rotation_euler[2] = 2 * math.pi * 49 / 50
obj.keyframe_insert("rotation_euler", frame=50)
for fc in obj.animation_data.action.fcurves if hasattr(obj.animation_data.action, "fcurves") else []:
    for k in fc.keyframe_points: k.interpolation = "LINEAR"
sc.frame_start, sc.frame_end = 1, 50
sc.cycles.samples = 4
sc.render.filepath = os.path.join(out, "frames", "f_")
bpy.ops.render.render(animation=True)
print("SMOKE_DONE")
