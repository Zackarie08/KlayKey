"""Render the holiday catalog photos from the existing Blender keyboard sources.
Run with Blender --background --python keyboard-3d/scripts/render_christmas.py.
Original .blend files are opened read-only and never overwritten.
"""
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else ROOT / 'keyboard-3d/previews'
OUTPUT.mkdir(parents=True, exist_ok=True)
EDITIONS = json.loads((ROOT / 'public/assets/christmas-editions.json').read_text(encoding='utf-8'))

def rgba(hexcolor):
    values = [int(hexcolor[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values) + (1,)

for edition in EDITIONS:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / f"keyboard-3d/blender/keyboard_{edition['layout']}.blend"))
    colors = {'MAT_CASE_ACTIVE':'case', 'MAT_KEYCAP_ALPHA':'alpha', 'MAT_KEYCAP_MODIFIER':'modifier', 'MAT_KEYCAP_ACCENT':'accent', 'MAT_KNOB':'metal', 'MAT_HARDWARE':'metal'}
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        bsdf = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        if material.name in colors:
            bsdf.inputs['Base Color'].default_value = rgba(edition[colors[material.name]])
        if material.name.startswith('MAT_RGB_'):
            bsdf.inputs['Emission Color'].default_value = rgba(edition['rgb'])
            bsdf.inputs['Emission Strength'].default_value = 1.1
    # Small metallic edition name across the front face.
    font = bpy.data.curves.new('HOLIDAY_BADGE', 'FONT')
    font.body = edition['badge']
    font.align_x = 'CENTER'
    font.size = .0045
    font.extrude = .00005
    badge = bpy.data.objects.new('HOLIDAY_BADGE', font)
    bpy.context.scene.collection.objects.link(badge)
    case = bpy.data.objects.get('CASE_TOP')
    corners = [case.matrix_world @ Vector(c) for c in case.bound_box]
    front = min(c.y for c in corners)
    badge.location = (0, front-.0003, .009)
    badge.rotation_euler = (1.570796, 0, 0)
    material = bpy.data.materials.new('HOLIDAY_GOLD')
    material.diffuse_color = rgba(edition['metal'])
    font.materials.append(material)
    scene = bpy.context.scene
    scene.cycles.samples = 24
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = str(OUTPUT / f"{edition['key']}.png")
    bpy.ops.render.render(write_still=True)
