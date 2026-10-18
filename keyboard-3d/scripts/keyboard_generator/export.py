import json
import math
import struct
from pathlib import Path
import bpy
from mathutils import Vector
from .validation import validate_scene, validate_glb


def repair_degenerate_tangents(path):
    """Give UV-singular bevel vertices a valid orthogonal tangent frame.

    Blender's MikkTSpace exporter can emit (0,0,0) at a collapsed UV corner.
    The normal is still valid; select a perpendicular unit direction there only.
    """
    data=bytearray(path.read_bytes())
    json_length=struct.unpack_from('<I',data,12)[0]
    document=json.loads(data[20:20+json_length])
    binary=20+json_length+8
    seen=set()
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            attrs=primitive['attributes']; index=attrs.get('TANGENT')
            if index is None or index in seen:continue
            seen.add(index)
            tangent=document['accessors'][index];normal=document['accessors'][attrs['NORMAL']]
            tv=document['bufferViews'][tangent['bufferView']];nv=document['bufferViews'][normal['bufferView']]
            for i in range(tangent['count']):
                offset=binary+tv.get('byteOffset',0)+tangent.get('byteOffset',0)+i*tv.get('byteStride',16)
                x,y,z,w=struct.unpack_from('<4f',data,offset)
                if x*x+y*y+z*z>1e-12:continue
                no=binary+nv.get('byteOffset',0)+normal.get('byteOffset',0)+i*nv.get('byteStride',12)
                n=Vector(struct.unpack_from('<3f',data,no))
                axis=Vector((1,0,0)) if abs(n.x)<.9 else Vector((0,1,0))
                t=n.cross(axis).normalized()
                struct.pack_into('<4f',data,offset,t.x,t.y,t.z,1 if w>=0 else -1)
    path.write_bytes(data)


def visibility(node,visible):
    if node:
        for obj in [node]+list(node.children_recursive): obj.hide_render=not visible


def studio(spec):
    scene=bpy.context.scene
    scene.render.engine='CYCLES'; scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.world=bpy.data.worlds.new('STUDIO_WORLD'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.038,.063,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    scene.view_settings.view_transform='AgX'
    width=spec['caseWidthMM']*.001
    target=Vector((0,0,.019))
    camera_data=bpy.data.cameras.new('STUDIO_CAMERA'); camera=bpy.data.objects.new('STUDIO_CAMERA',camera_data)
    scene.collection.objects.link(camera)
    camera.location=(width*.72,-width*.95,width*1.04)
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO'; camera_data.ortho_scale=width*1.3; camera_data.clip_start=.001
    scene.camera=camera
    for name,location,power,size,color in [
        ('KEY',(-.24,-.28,.48),12,.4,(.94,.96,1)),
        ('RIM',(.22,.25,.35),16,.3,(.78,.69,1)),
        ('FILL',(.4,-.1,.2),7,.3,(1,.92,.83))]:
        data=bpy.data.lights.new('STUDIO_'+name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size; data.color=color
        obj=bpy.data.objects.new(data.name,data); scene.collection.objects.link(obj); obj.location=location
        obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
    visibility(bpy.data.objects.get('OPTION_CABLE'),False)
    visibility(bpy.data.objects.get('OPTION_DISPLAY'),False)
    visibility(bpy.data.objects.get('OPTION_KNOB'),True)


def save(spec,root,folder,render=True):
    validate_scene(spec)
    path=folder/'exports'/f"keyboard_{spec['id']}.glb"
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [root]+list(root.children_recursive): obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_apply=True,export_yup=True,export_extras=True,export_tangents=True,export_cameras=False,
        export_lights=False,export_animations=False,export_materials='EXPORT')
    repair_degenerate_tangents(path)
    report=validate_glb(path,spec)
    studio(spec)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/'blender'/f"keyboard_{spec['id']}.blend"))
    if render:
        bpy.context.scene.render.filepath=str(folder/'previews'/f"keyboard_{spec['id']}.png")
        bpy.ops.render.render(write_still=True)
    # Reopen the saved source to test persistence, names and geometry.
    bpy.ops.wm.open_mainfile(filepath=str(folder/'blender'/f"keyboard_{spec['id']}.blend"))
    validate_scene(spec); report['blendReopened']='passed'
    (folder/'exports'/f"validation_{spec['id']}.json").write_text(json.dumps(report,indent=2)+'\n')
    return report


def write_manifest(folder,specs,options,compatibility):
    layouts=[]
    for spec in specs:
        layouts.append(dict(id=spec['id'],name=spec['name'],glb=f"keyboard_{spec['id']}.glb",
            dimensionsMM=dict(width=spec['caseWidthMM'],depth=spec['caseDepthMM'],
                approximateHeight=round(28+spec['caseDepthMM']*math.tan(math.radians(6)),1)),
            camera=dict(target=[0,.018,0],distance=round(spec['caseWidthMM']*.0016,3)),
            keyCount=len(spec['keys']),requiredWidths=sorted({k['width'] for k in spec['keys']}),
            requiredHeights=sorted({k['height'] for k in spec['keys']}),
            rgbCapable=True,switchMount='MX',knobSupported=bool(spec['bay']),displaySupported=bool(spec['bay']),
            caseVariant='case-'+spec['id'],priceAdjustment=0))
    manifest=dict(schemaVersion=3,units='metres',sourceUnits='millimetres',
        sourceAxes='Blender Z up, front -Y',exportAxes='glTF Y up, front +Z',
        typingAngleDegrees=6,layouts=layouts,**options,compatibility=compatibility,
        bindings=dict(caseMaterial=['MAT_CASE_ACTIVE'],
            keycapMaterials=['MAT_KEYCAP_ALPHA','MAT_KEYCAP_MODIFIER','MAT_KEYCAP_ACCENT','MAT_KEYCAP_LEGEND'],
            switchMaterial=['MAT_SWITCH_STEM'],rgbNodes=['GROUP_RGB','RGB_PER_KEY','RGB_UNDERGLOW'],
            rgbMaterials=['MAT_RGB_EMISSIVE','MAT_RGB_CYAN','MAT_RGB_ROSE'],
            connectionNode='OPTION_CABLE',knobNode='OPTION_KNOB',displayNode='OPTION_DISPLAY',
            volumeKnob='VOLUME_KNOB_ROOT',displayScreen='MINI_DISPLAY_SCREEN',keyPrefix='KEY_'),
        typing=dict(travelMM=3.4,downMS=45,upMS=95,physicalCodes={s['id']:[k['code'] for k in s['keys']] for s in specs}),
        soundProfiles=json.loads((Path(__file__).resolve().parents[2]/'config'/'sound_profiles.json').read_text()),
        pricingNote='The storefront calculates prices from its catalog.',
        audioNote='Original procedural synthesis approximations, not recordings. Optional licensed sample replacement is supported.')
    (folder/'exports'/'keyboard_manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
