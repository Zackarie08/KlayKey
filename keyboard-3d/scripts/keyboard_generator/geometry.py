"""Mesh builders use millimetres. Finalization bakes scale and typing slope.

Rounded-rectangle ring lofts provide controlled highlights without hundreds of
context-dependent bevel operators. Winding is CCW as seen from above.
"""
import math
import bpy
import bmesh
from mathutils import Matrix, Vector


def empty(name, parent=None):
    obj = bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def mesh(name, verts, faces, mat, parent=None, smooth=True):
    data = bpy.data.meshes.new(name+'_MESH')
    data.from_pydata(verts,[],faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for face in data.polygons:
        face.use_smooth = smooth and len(face.vertices)==4
    data.set_sharp_from_angle(angle=math.radians(38))
    return obj


def outline(w,d,r,n=6):
    r = min(r,w/2-.001,d/2-.001)
    pts=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),
                         (-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for i in range(n+1):
            a=math.radians(start+i*90/n)
            pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    return pts


def loft(name, rings, mat, parent=None, center=(0,0), caps=True, n=6):
    vertices=[]
    for w,d,r,z in rings:
        vertices += [(x+center[0],y+center[1],z) for x,y in outline(w,d,r,n)]
    size=4*(n+1)
    faces=[]
    for ring in range(len(rings)-1):
        for j in range(size):
            a=ring*size+j; b=ring*size+(j+1)%size
            faces.append((a,b,b+size,a+size))
    if caps:
        faces += [tuple(reversed(range(size))),tuple(range((len(rings)-1)*size,len(rings)*size))]
    return mesh(name,vertices,faces,mat,parent)


def box(name, center, size, radius, mat, parent=None, bevel=.35):
    x,y,z=center; w,d,h=size
    b=min(bevel,h/3,w/4,d/4)
    return loft(name,[(w-2*b,d-2*b,max(.1,radius-b),z-h/2),
                      (w,d,radius,z-h/2+b),(w,d,radius,z+h/2-b),
                      (w-2*b,d-2*b,max(.1,radius-b),z+h/2)],mat,parent,(x,y))


def ring(name, w,d,wall,z,h,r,mat,parent=None):
    # Close the cross-section by repeating the outer lower edge: true open center.
    b=min(.25,h/3,wall/3)
    return loft(name,[(w-2*b,d-2*b,r-b,z),(w,d,r,z+b),(w,d,r,z+h-b),
                      (w-2*b,d-2*b,r-b,z+h),(w-2*wall,d-2*wall,max(.7,r-wall),z+h),
                      (w-2*wall,d-2*wall,max(.7,r-wall),z),
                      (w-2*b,d-2*b,r-b,z)],mat,parent,caps=False)


def cylinder(name, center, radius, height, mat, parent=None, segments=48, knurl=False):
    x,y,z=center; vs=[]
    for r,zz in [(radius-.4,z-height/2),(radius,z-height/2+.4),
                 (radius,z+height/2-.4),(radius-.4,z+height/2)]:
        for i in range(segments):
            a=2*math.pi*i/segments
            rr=r-(.32 if knurl and i%2 else 0)
            vs.append((x+rr*math.cos(a),y+rr*math.sin(a),zz))
    fs=[tuple(reversed(range(segments))),tuple(range(3*segments,4*segments))]
    for k in range(3):
        for i in range(segments):
            a=k*segments+i; b=k*segments+(i+1)%segments
            fs.append((a,b,b+segments,a+segments))
    return mesh(name,vs,fs,mat,parent)


def keycap(name,x,y,w,h,profile,mat,parent):
    width=w*19.05-1.3; depth=h*19.05-1.3
    top=28+[1.8,.8,0,.45,1.3][profile]
    tw,td=width-3.0,depth-3.0
    rings=[(width-2.6,depth-2.6,.35,20), # hollow lower rim, 1.3 mm walls
        (width-.4,depth-.4,.6,20),(width,depth,.8,20.3),
        (tw+.25,td+.25,.65,top-.3),(tw,td,.65,top)]
    obj=loft(name,rings,mat,parent,(x,y),caps=False,n=5)
    # Structured cylindrical dish avoids the old concentric-ring triangle artifacts.
    # Radial perimeter + many X/Y samples tessellate the manufactured top surface.
    nx=max(8,int(tw/2)); ny=16; vertices=[]; faces=[]
    for j in range(ny+1):
        yy=-td/2+td*j/ny
        inset=.65-math.sqrt(max(0,.65**2-max(0,abs(yy)-(td/2-.65))**2))
        for i in range(nx+1):
            xx=(-tw/2+inset)+(tw-2*inset)*i/nx
            dish=(.40 if w>5 else -.65)*(1-(yy/(td/2))**2)
            vertices.append((x+xx,y+yy,top+dish))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    surface=mesh(name+'_DISH',vertices,faces,mat,parent)
    # Join the shaped dish perimeter to the loft shoulder to prevent side gaps.
    boundary=[i for i in range(nx+1)]+[j*(nx+1)+nx for j in range(1,ny+1)]+[ny*(nx+1)+i for i in range(nx-1,-1,-1)]+[j*(nx+1) for j in range(ny-1,0,-1)]
    vv=[];ff=[]
    for index in boundary:
        px,py,pz=vertices[index];vv.extend([(px,py,top),(px,py,pz)])
    for i in range(len(boundary)):
        a=2*i;b=2*((i+1)%len(boundary))
        if abs(vv[a][2]-vv[a+1][2])+abs(vv[b][2]-vv[b+1][2])>1e-7:ff.append((a,b,b+1,a+1))
    # Bottom ceiling is intentionally recessed: the cap has visible wall thickness.
    skirt=mesh(name+'_DISH_EDGE',vv,ff,mat,parent)
    inner=loft(name+'_INNER',[(width-2.6,depth-2.6,.35,20),
        (tw-2.4,td-2.4,.35,top-1.3)],mat,parent,(x,y),caps=False,n=5)
    # Reverse interior wall normals so a view from beneath sees real cap thickness.
    for poly in inner.data.polygons:poly.flip()
    underside=mesh(name+'_ROOF_INNER',[(px,py,pz-1.3) for px,py,pz in vertices],
        [tuple(reversed(face)) for face in faces],mat,parent)
    obj=merge(name,[obj,surface,skirt,inner,underside],parent)
    obj['topMM']=top
    return obj


def text_mesh(name,body,x,y,z,size,mat,parent):
    curve=bpy.data.curves.new(name+'_FONT','FONT')
    curve.body=body; curve.size=size; curve.align_x='CENTER'; curve.align_y='CENTER'
    curve.resolution_u=2; curve.extrude=0
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj)
    obj.location=(x,y,z); obj.parent=parent; curve.materials.append(mat)
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    data=bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    data.transform(obj.matrix_local)
    bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.curves.remove(curve)
    result=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(result)
    result.parent=parent
    return result


def merge(name, objects, parent):
    """Concatenate static meshes, preserving each material; no bpy.ops join."""
    verts=[]; faces=[]; indices=[]; smooth=[]; mats=[]
    for obj in objects:
        offset=len(verts)
        verts += [tuple(obj.matrix_local @ v.co) for v in obj.data.vertices]
        for poly in obj.data.polygons:
            faces.append(tuple(offset+i for i in poly.vertices))
            mat=obj.data.materials[poly.material_index]
            if mat not in mats: mats.append(mat)
            indices.append(mats.index(mat)); smooth.append(poly.use_smooth)
    data=bpy.data.meshes.new(name+'_MESH'); data.from_pydata(verts,[],faces)
    for mat in mats: data.materials.append(mat)
    for p,i,s in zip(data.polygons,indices,smooth): p.material_index=i; p.use_smooth=s
    for obj in objects:
        old=obj.data; bpy.data.objects.remove(obj,do_unlink=True)
        if old.users==0: bpy.data.meshes.remove(old)
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.parent=parent
    return obj


def tube(name, points, radius, mat, parent, segments=10):
    vs=[]; fs=[]
    for i,point in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize(); side=tangent.cross(Vector((0,0,1))).normalized()
        up=side.cross(tangent).normalized()
        for j in range(segments):
            a=j*2*math.pi/segments
            vs.append(tuple(Vector(point)+radius*(math.cos(a)*side+math.sin(a)*up)))
    for i in range(len(points)-1):
        for j in range(segments):
            a=i*segments+j; b=i*segments+(j+1)%segments
            fs.append((a,b,b+segments,a+segments))
    fs.extend([tuple(reversed(range(segments))),tuple(range(len(vs)-segments,len(vs)))])
    return mesh(name,vs,fs,mat,parent)


def bake_scene(depth):
    """Bake mm->m and 6 degree typing slope, keeping identity object transforms."""
    slope=math.tan(math.radians(6))
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH': continue
        for v in obj.data.vertices:
            x,y,z=v.co
            v.co=(x*.001,y*.001,(z+(y+depth/2)*slope)*.001)
        obj.data.update()
        # Blender cannot export tangent frames for n-gons; triangulate just those
        # caps before export, preserving the structured quad surfaces elsewhere.
        bm=bmesh.new();bm.from_mesh(obj.data)
        ngons=[f for f in bm.faces if len(f.verts)>4]
        if ngons:bmesh.ops.triangulate(bm,faces=ngons)
        bmesh.ops.dissolve_degenerate(bm,dist=1e-9,edges=list(bm.edges))
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    # A local knob pivot with the correct sloped deck normal, independent of case.
    pivots=[o for o in bpy.context.scene.objects if o.type=='EMPTY' and 'pivotMM' in o]
    for knob in pivots:
        pivot=Vector(knob['pivotMM']); pivot.z+=(pivot.y+depth/2)*slope; pivot*=.001
        m=Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(6),4,'X')
        for child in knob.children:
            child.data.transform(m.inverted())
        knob.matrix_local=m


def planar_uv(obj, scale=12):
    """Object-space planar UVs for small tiled, embedded surface-detail maps."""
    uv=obj.data.uv_layers.new(name='SurfaceUV')
    for poly in obj.data.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i])); axes=[i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]]/scale,v[axes[1]]/scale)
