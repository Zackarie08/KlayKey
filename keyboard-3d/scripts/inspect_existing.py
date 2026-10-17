"""Read-only baseline inventory before the v2 upgrade."""
import bpy, json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
report=[]
for size in ('60','75','100'):
    bpy.ops.wm.open_mainfile(filepath=str(root/'blender'/f'keyboard_{size}.blend'))
    raw=(root/'exports'/f'keyboard_{size}.glb').read_bytes()
    length=struct.unpack_from('<I',raw,12)[0]; gltf=json.loads(raw[20:20+length])
    report.append(dict(layout=size,blenderVersion=bpy.app.version_string,
        sceneObjects=[o.name for o in bpy.context.scene.objects],
        materials=[m.name for m in bpy.data.materials],glbNodes=len(gltf['nodes']),
        glbBytes=len(raw),hasAudio=False))
(root/'exports'/'baseline_inventory.json').write_text(json.dumps(report,indent=2))
print('BASELINE_INSPECTION_OK',[(r['layout'],len(r['sceneObjects'])) for r in report])
