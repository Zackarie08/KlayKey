import bpy
import random


def surface_maps():
    """Original deterministic micrograin; packed images survive GLB export."""
    rng=random.Random(2207); size=256
    normal=bpy.data.images.new('SURFACE_MICRO_NORMAL',width=size,height=size,alpha=False)
    rough=bpy.data.images.new('SURFACE_MICRO_ROUGHNESS',width=size,height=size,alpha=False)
    n=[];r=[]
    for _ in range(size*size):
        n.extend([.5+rng.uniform(-.025,.025),.5+rng.uniform(-.025,.025),.999,1])
        grain=.93+rng.uniform(-.035,.035);r.extend([grain,grain,grain,1])
    for image,pixels in [(normal,n),(rough,r)]:
        image.colorspace_settings.name='Non-Color';image.pixels.foreach_set(pixels);image.pack()
    return normal,rough


def add_grain(mat,normal,rough,strength=.18):
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexImage');tex.image=normal
    bump=nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=strength
    links.new(tex.outputs['Color'],bump.inputs['Color']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    tex=nodes.new('ShaderNodeTexImage');tex.image=rough
    separate=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],separate.inputs['Color'])
    multiply=nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=bsdf.inputs['Roughness'].default_value
    links.new(separate.outputs['Green'],multiply.inputs[0]);links.new(multiply.outputs[0],bsdf.inputs['Roughness'])


def linear(hex_color):
    rgb = [int(hex_color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)


def material(name, color, metal=0, rough=.4, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgb = (*linear(color),1)
    mat.diffuse_color = rgb
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgb
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if emission:
        bsdf.inputs['Emission Color'].default_value = rgb
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def build(options):
    mats = {}
    for c in options['caseColors']:
        mats[c['material']] = material(c['material'],c['color'],c['metallic'],c['roughness'])
    c = next(c for c in options['caseColors'] if c['id']=='purple')
    mats['MAT_CASE_ACTIVE'] = material('MAT_CASE_ACTIVE',c['color'],c['metallic'],c['roughness'])
    theme = options['keycapThemes'][0]
    for role in ('alpha','modifier','accent','legend'):
        name = 'MAT_KEYCAP_'+role.upper()
        mats[name] = material(name,theme[role],0,.32 if role=='legend' else .43)
    for name, color, metal, rough, glow in [
        ('MAT_PLATE','#23232E',.65,.38,0),('MAT_HARDWARE','#868896',.82,.27,0),
        ('MAT_RUBBER','#15151D',0,.8,0),('MAT_SWITCH','#332B3E',0,.46,0),
        ('MAT_SWITCH_STEM','#C83A4B',0,.4,0),('MAT_RGB_EMISSIVE','#A66AFF',0,.3,2),
        ('MAT_RGB_CYAN','#51CDFF',0,.3,2),('MAT_RGB_ROSE','#EF6BB2',0,.3,2),
        ('MAT_DISPLAY_GLASS','#151522',.3,.2,0),('MAT_DISPLAY_EMISSIVE','#87E9EE',0,.4,1.6)]:
        mats[name] = material(name,color,metal,rough,glow)
    mats['MAT_SWITCH_UPPER']=material('MAT_SWITCH_UPPER','#6C6875',0,.36)
    mats['MAT_PCB']=material('MAT_PCB','#1B3632',.1,.63)
    mats['MAT_KNOB']=material('MAT_KNOB','#9293A3',.85,.3)
    mats['MAT_DISPLAY_EMISSIVE'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.006,.008,.012,1)
    # PBT starts matte; ABS and PC are independent runtime physical profiles.
    normal,rough=surface_maps()
    for name in ['MAT_CASE_ACTIVE','MAT_KEYCAP_ALPHA','MAT_KEYCAP_MODIFIER','MAT_KEYCAP_ACCENT','MAT_PLATE','MAT_KNOB']:
        add_grain(mats[name],normal,rough,.28 if 'KEYCAP' in name else .13)
    return mats
