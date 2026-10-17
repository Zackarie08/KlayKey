import math
import bpy
from mathutils.bvhtree import BVHTree
from . import geometry as g
from .layouts import key_center
from . import mechanical


def build(spec, mats):
    root=g.empty('KEYBOARD_ROOT'); root['layout']=spec['id']; root['units']='metres'
    groups={name:g.empty(name,root) for name in ['GROUP_CASE','GROUP_PLATE','GROUP_SWITCHES',
        'GROUP_KEYCAPS','GROUP_RGB','OPTION_CABLE']}
    case=groups['GROUP_CASE']; w=spec['caseWidthMM']; d=spec['caseDepthMM']
    active=mats['MAT_CASE_ACTIVE']; metal=mats['MAT_HARDWARE']; rubber=mats['MAT_RUBBER']
    bottom=g.box('CASE_BOTTOM',(0,0,5.6),(w-1,d-1,8),3.2,active,case,bevel=.45)
    top=g.ring('CASE_TOP',w,d,4.5,10,6,3.5,active,case)
    # USB opening intersects the rear wall; a real boolean cut, not a painted socket.
    cutter=g.box('TEMP_PORT_CUT',(-w*.32,d/2,12.4),(10,14,4.5),1.6,rubber)
    mod=top.modifiers.new('USB_C_APERTURE','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=cutter
    bpy.context.view_layer.objects.active=top
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    g.box('USB_C_PORT',(-w*.32,d/2-2.5,12.4),(9,1,3.7),1.2,rubber,case)
    g.box('USB_C_TONGUE',(-w*.32,d/2-1.8,12.4),(6,.9,.65),.25,metal,case,.12)
    # Thin metallic port liner plus visible contact fingers.
    contacts=[]
    for i in range(8):
        contacts.append(g.box('contact',(-w*.32-2.5+i*.7,d/2-1.3,12.85),(.3,1,.12),.06,metal,case,.02))
    g.merge('USB_C_CONTACTS',contacts,case)
    # Apply a tightly controlled chamfer to the Boolean aperture edge.
    bevel=top.modifiers.new('MACHINED_EDGE','BEVEL');bevel.width=.12;bevel.segments=2
    bpy.context.view_layer.objects.active=top;bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Interior deck is recessed 2 mm below the top lip.
    mechanical.plate(spec,mats,groups['GROUP_PLATE'])
    g.box('FRONT_LIP',(0,-d/2+.8,12.1),(w-13,.9,.65),.2,metal,case,.15)
    # Small underside machining inset, feet and slotted screw heads.
    g.box('UNDERSIDE_INSET',(0,0,1.45),(w-42,d-38,.6),4,mats['MAT_PLATE'],case,.15)
    screws=[]; slots=[]; feet=[]; screw_cuts=[]
    slope=math.tan(math.radians(6))
    for x in (-w/2+15,w/2-15):
        for y in (-d/2+13,d/2-13):
            sy=y+(10 if y<0 else -10)
            screw_cuts.append(g.cylinder('screw_recess',(x,sy,1.1),2.65,4.6,rubber,None,24))
            screws.append(g.cylinder('screw',(x,sy,2.0),2.1,.8,metal,case,24))
            slots.append(g.box('slot',(x,sy,1.57),(2.6,.45,.08),.12,rubber,case,.02))
            slots.append(g.box('slot',(x,sy,1.57),(.45,2.6,.08),.12,rubber,case,.02))
            # Foot bottoms compensate the deck slope and land on the same plane.
            foot=g.box('foot',(x,y,0),(22,8,2),3,rubber,case)
            for v in foot.data.vertices:
                if v.co.z < 0: v.co.z=-((v.co.y+d/2)*slope)
                else: v.co.z=1.5
            feet.append(foot)
    cutter=g.merge('TEMP_SCREW_HOLES',screw_cuts,None)
    mod=bottom.modifiers.new('COUNTERBORED_SCREWS','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.context.view_layer.objects.active=bottom;bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    g.merge('CASE_SCREWS',screws,case); g.merge('SCREW_SLOTS',slots,case); g.merge('CASE_FEET',feet,case)
    cap_sets={r:g.empty('KEYCAPS_'+r.upper(),groups['GROUP_KEYCAPS']) for r in ['alpha','modifier','accent']}
    g.empty('KEYCAP_LEGENDS',groups['GROUP_KEYCAPS']) # legacy binding; legends now follow each key
    housings=[]; rgb=[]; stabilizer_bodies=[]; stabilizer_wires=[]
    palette=['MAT_RGB_EMISSIVE','MAT_RGB_CYAN','MAT_RGB_ROSE']
    for i,k in enumerate(spec['keys']):
        x,y=key_center(k,spec)
        key=g.empty('KEY_'+k['code'],cap_sets[k['group']]);key['pivotMM']=[x,y,20]
        key['code']=k['code'];key['widthU']=k['width'];key['heightU']=k['height'];key['travelMM']=3.4
        cap=g.keycap('CAP_'+k['code'],x,y,k['width'],k['height'],k['profileRow'],
                     mats['MAT_KEYCAP_'+k['group'].upper()],key)
        # Vector legends merged into one mesh. Project each vertex onto the dish.
        label=k['legend']; label={'Left':'<','Right':'>','Up':'^','Down':'v','Space':''}.get(label,label)
        if label:
            text=g.text_mesh('LEGEND_'+k['code'],label,x,y,40,3.4 if len(label)<=2 else 2.5,
                             mats['MAT_KEYCAP_LEGEND'],key)
            tree=BVHTree.FromPolygons([v.co for v in cap.data.vertices],[list(p.vertices) for p in cap.data.polygons])
            for v in text.data.vertices:
                hit=tree.ray_cast((v.co.x,v.co.y,50),(0,0,-1))[0]
                if hit: v.co.z=hit.z+.025
        switch,_=mechanical.switch_parts(k,x,y,mats,groups['GROUP_SWITCHES'],key);housings+=switch
        bodies,wires=mechanical.stabilizers(k,x,y,mats,groups['GROUP_SWITCHES'])
        stabilizer_bodies+=bodies;stabilizer_wires+=wires
        halo=g.ring('halo',k['width']*19.05-.55,k['height']*19.05-.55,.6,15.5,.45,1.8,
                    mats[palette[min(2,int(k['x']/spec['widthU']*3))]],groups['GROUP_RGB'])
        for v in halo.data.vertices: v.co.x+=x; v.co.y+=y
        rgb.append(halo)
    g.merge('SWITCH_HOUSINGS',housings,groups['GROUP_SWITCHES'])
    g.merge('STABILIZER_HOUSINGS',stabilizer_bodies,groups['GROUP_SWITCHES'])
    g.merge('STABILIZER_WIRES',stabilizer_wires,groups['GROUP_SWITCHES'])
    g.merge('RGB_PER_KEY',rgb,groups['GROUP_RGB'])
    g.ring('RGB_UNDERGLOW',w-1,d-1,.8,9.65,.22,6,mats['MAT_RGB_EMISSIVE'],groups['GROUP_RGB'])
    cable=groups['OPTION_CABLE']; cable['defaultVisible']=False
    cx=-w*.32
    g.box('CONNECTOR_USB_C',(cx,d/2+1.4,12.4),(8.3,6,2.6),1,metal,cable,.2)
    g.box('CONNECTOR_HOUSING',(cx,d/2+8.5,12.4),(10.8,11,5.5),.7,rubber,cable,.3)
    strain=g.box('CABLE_STRAIN_RELIEF',(cx,d/2+12,12.4),(7,7,4.5),1.5,rubber,cable)
    points=[]
    for i in range(65):
        t=i/64
        points.append((cx+55*(1-math.cos(t*math.pi)),d/2+15+100*t,12.4-10*t))
    cord=g.tube('cord',points,2.1,rubber,cable,12)
    g.merge('CABLE_USB_C',[strain,cord],cable)
    mechanical.controls(spec,mats,root,case)
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH' and not obj.data.uv_layers:g.planar_uv(obj)
    g.bake_scene(d)
    return root
