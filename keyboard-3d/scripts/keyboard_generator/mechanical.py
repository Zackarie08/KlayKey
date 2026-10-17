"""Efficient construction details added to the existing component builder."""
import math
from . import geometry as g
from .layouts import key_center


def plate(spec,mats,parent):
    w=spec['caseWidthMM']-11; d=spec['caseDepthMM']-11
    holes=[(x-7.15,x+7.15,y-7.15,y+7.15) for x,y in [key_center(k,spec) for k in spec['keys']]]
    xs=sorted(set([-w/2,w/2]+[v for h in holes for v in h[:2]]))
    ys=sorted(set([-d/2,d/2]+[v for h in holes for v in h[2:]]))
    cells=set()
    for i in range(len(xs)-1):
        for j in range(len(ys)-1):
            x=(xs[i]+xs[i+1])/2; y=(ys[j]+ys[j+1])/2
            if not any(a<x<b and c<y<e for a,b,c,e in holes):cells.add((i,j))
    vertices=[];faces=[]
    for i,j in cells:
        a=len(vertices); x0,x1=xs[i:i+2]; y0,y1=ys[j:j+2]
        vertices += [(x0,y0,12.9),(x1,y0,12.9),(x1,y1,12.9),(x0,y1,12.9),
                     (x0,y0,14.4),(x1,y0,14.4),(x1,y1,14.4),(x0,y1,14.4)]
        faces += [(a+4,a+5,a+6,a+7),(a+3,a+2,a+1,a)]
        for neighbor,quad in [((i,j-1),(0,1,5,4)),((i+1,j),(1,2,6,5)),((i,j+1),(2,3,7,6)),((i-1,j),(3,0,4,7))]:
            if neighbor not in cells:faces.append(tuple(a+t for t in quad))
    g.mesh('PLATE_DECK',vertices,faces,mats['MAT_PLATE'],parent,False)
    g.box('PCB_LAYER',(0,0,10.9),(w-2,d-2,1.3),1,mats['MAT_PCB'],parent,.12)
    g.ring('ISOLATION_GASKET',w+1,d+1,1.3,12.5,1.1,2,mats['MAT_RUBBER'],parent)


def switch_parts(k,x,y,mats,static_parent,key_parent):
    lower=g.box('lower',(x,y,12.8),(13.8,13.8,3.5),.5,mats['MAT_SWITCH'],static_parent,.2)
    upper=g.loft('upper',[(14,14,.45,14.5),(13.5,13.5,.45,15),(10.3,10.3,.6,18.7),
                         (9.8,9.8,.6,19)],mats['MAT_SWITCH_UPPER'],static_parent,(x,y),n=3)
    tabs=[g.box('latch',(x+side*6.8,y,14.9),(1,4,1.8),.15,mats['MAT_SWITCH'],static_parent,.12) for side in (-1,1)]
    a=g.box('cross_x',(x,y,20.3),(4.1,1.25,5),.15,mats['MAT_SWITCH_STEM'],key_parent,.12)
    b=g.box('cross_y',(x,y,20.3),(1.25,4.1,5),.15,mats['MAT_SWITCH_STEM'],key_parent,.12)
    stem=g.merge('STEM_'+k['code'],[a,b],key_parent)
    return [lower,upper]+tabs,stem


def stabilizers(k,x,y,mats,parent):
    if max(k['width'],k['height'])<2:return [],[]
    vertical=k['height']>=2
    span=100 if k['width']>5 else 23.8
    # Long keys use paired plate-mounted housings and a recessed steel balance wire.
    bodies=[];wires=[]
    for side in (-1,1):
        dx,dy=(0,side*span/2) if vertical else (side*span/2,0)
        bodies.append(g.box('stabilizer',(x+dx,y+dy,16.1),(5.5,5.5,3.2),.5,mats['MAT_SWITCH'],parent,.18))
        bodies.append(g.box('stabilizer_slider',(x+dx,y+dy,19),(3.2,3.2,3),.35,mats['MAT_RUBBER'],parent,.15))
    points=[(x-3,y-span/2,14.9),(x-4,y-span/2,14.9),(x-4,y+span/2,14.9),(x-3,y+span/2,14.9)] if vertical else [(x-span/2,y-2,14.9),(x-span/2,y-4,14.9),(x+span/2,y-4,14.9),(x+span/2,y-2,14.9)]
    wires.append(g.tube('balance_wire',points,.55,mats['MAT_HARDWARE'],parent,8))
    return bodies,wires


def controls(spec,mats,root,case):
    bay=spec['bay']; x=(bay['x']-spec['widthU']/2)*19.05; y=(spec['heightU']/2-bay['y'])*19.05
    g.box('ACCESSORY_BAY',(x,y,15.5),(44,19,1.2),1.2,mats['MAT_PLATE'],case,.2)
    group=g.empty('CONTROL_MODULE',root)
    # Backward-compatible outer nodes, explicit v2 bindings inside.
    old=g.empty('OPTION_KNOB',group)
    option=g.empty('OPTION_VOLUME_KNOB',old); option['defaultVisible']=True
    base=g.cylinder('VOLUME_KNOB_BASE',(x,y,16.6),8.7,1.4,mats['MAT_HARDWARE'],option,64)
    pivot=g.empty('VOLUME_KNOB_ROOT',option); pivot['pivotMM']=[x,y,17.5]
    g.cylinder('VOLUME_KNOB_BODY',(x,y,22),8.1,9,mats['MAT_KNOB'],pivot,128,True)
    # Inset top disc, subtly lower than the perimeter rim.
    g.cylinder('VOLUME_KNOB_TOP',(x,y,26.1),6.8,.45,mats['MAT_KNOB'],pivot,64)
    g.box('VOLUME_KNOB_INDICATOR',(x,y+5.3,26.56),(.7,2.4,.14),.18,mats['MAT_KEYCAP_LEGEND'],pivot,.04)
    old_display=g.empty('OPTION_DISPLAY',group)
    option=g.empty('OPTION_MINI_DISPLAY',old_display);option['defaultVisible']=False
    display=g.empty('MINI_DISPLAY_ROOT',option)
    g.box('MINI_DISPLAY_FRAME',(x,y,18.2),(42,17,4.8),.9,mats['MAT_HARDWARE'],display,.25)
    g.box('DISPLAY_GLASS',(x,y,20.65),(40.3,15.3,.25),.7,mats['MAT_DISPLAY_GLASS'],display,.06)
    screen=g.mesh('MINI_DISPLAY_SCREEN',[(x-19.5,y-6.9,20.82),(x+19.5,y-6.9,20.82),
        (x+19.5,y+6.9,20.82),(x-19.5,y+6.9,20.82)],[(0,1,2,3)],mats['MAT_DISPLAY_EMISSIVE'],display,False)
    uv=screen.data.uv_layers.new(name='ScreenUV')
    for i,xy in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=xy
    return group
