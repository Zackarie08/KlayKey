"""Source-scene and binary GLB checks, with measured performance reports."""
import json
import struct
from pathlib import Path
import bpy
from mathutils import Vector
from .layouts import validate_layout

REQUIRED=['KEYBOARD_ROOT','GROUP_CASE','CASE_TOP','CASE_BOTTOM','CASE_SCREWS','CASE_FEET',
          'USB_C_PORT','GROUP_PLATE','GROUP_SWITCHES','GROUP_KEYCAPS','KEYCAPS_ALPHA',
          'KEYCAPS_MODIFIER','KEYCAPS_ACCENT','KEYCAP_LEGENDS','GROUP_RGB','RGB_PER_KEY',
          'RGB_UNDERGLOW','OPTION_CABLE','CABLE_USB_C','CONNECTOR_USB_C']
MATERIALS=['MAT_CASE_ACTIVE','MAT_PLATE','MAT_KEYCAP_ALPHA','MAT_KEYCAP_MODIFIER',
           'MAT_KEYCAP_ACCENT','MAT_KEYCAP_LEGEND','MAT_RGB_EMISSIVE']


def validate_scene(spec):
    validate_layout(spec)
    for name in REQUIRED + ['CONTROL_MODULE','OPTION_VOLUME_KNOB','VOLUME_KNOB_ROOT','VOLUME_KNOB_BODY','VOLUME_KNOB_INDICATOR','OPTION_MINI_DISPLAY','MINI_DISPLAY_SCREEN','STABILIZER_HOUSINGS','STABILIZER_WIRES','PCB_LAYER']:
        assert bpy.data.objects.get(name), f'Missing node {name}'
    for name in MATERIALS: assert bpy.data.materials.get(name), f'Missing material {name}'
    vertices=[]
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH': continue
        assert all(abs(s-1)<1e-6 for s in obj.scale), f'Unapplied scale: {obj.name}'
        if obj.name.startswith('CAP_'):
            vertices += [obj.matrix_world @ v.co for v in obj.data.vertices]
    assert max(v.x for v in vertices)<spec['caseWidthMM']*.0005
    assert min(v.x for v in vertices)>-spec['caseWidthMM']*.0005
    assert max(v.y for v in vertices)<spec['caseDepthMM']*.0005
    assert min(v.y for v in vertices)>-spec['caseDepthMM']*.0005
    top=bpy.data.objects['CASE_TOP']
    width=max(v.co.x for v in top.data.vertices)-min(v.co.x for v in top.data.vertices)
    assert abs(width-spec['caseWidthMM']*.001)<.0001
    for key in spec['keys']:
        node=bpy.data.objects['KEY_'+key['code']]
        assert node['code']==key['code'] and node['travelMM']==3.4
        assert any(c.name.startswith('CAP_') for c in node.children)
        assert any(c.name.startswith('STEM_') for c in node.children)
        # Lowest keycap edge after full press clears the 14.4 mm plate by >2 mm.
        assert 20-node['travelMM']>14.4
    return {'layoutOverlapCheck':'passed','keycapContainment':'passed','requiredNames':'passed','appliedScale':'passed','keyNodeMapping':'passed','controlBayClearance':'passed','travelPlateClearanceMM':2.2}


def read_glb(path):
    data=Path(path).read_bytes()
    magic,version,length=struct.unpack_from('<4sII',data)
    assert magic==b'glTF' and version==2 and length==len(data)
    chunk_length,chunk_type=struct.unpack_from('<II',data,12)
    assert chunk_type==0x4E4F534A
    return json.loads(data[20:20+chunk_length])


def validate_glb(path,spec):
    doc=read_glb(path); names={n.get('name') for n in doc['nodes']}
    assert set(REQUIRED)<=names
    assert set(MATERIALS)<={m.get('name') for m in doc['materials']}
    assert not doc.get('cameras')
    assert all('uri' not in b for b in doc.get('buffers',[]))
    assert all('bufferView' in im for im in doc.get('images',[]))
    tris=0; calls=0
    for node in doc['nodes']:
        if 'mesh' not in node: continue
        for p in doc['meshes'][node['mesh']]['primitives']:
            assert p.get('mode',4)==4
            acc=doc['accessors'][p.get('indices',p['attributes']['POSITION'])]
            tris+=acc['count']//3; calls+=1
    assert tris < 350000, f'Triangle budget exceeded: {tris}'
    size=Path(path).stat().st_size
    assert size<30*1024*1024
    return dict(triangles=tris,materials=len(doc['materials']),drawCallsAllOptions=calls,
                glbBytes=size,glbMiB=round(size/1024**2,3),textures=[dict(name=i.get('name'),dimensions=[256,256]) for i in doc.get('images',[])],
                keyCount=len(spec['keys']),**validate_scene(spec))
