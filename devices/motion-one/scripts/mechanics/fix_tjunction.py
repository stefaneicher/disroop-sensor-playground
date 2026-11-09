"""Schliesst das 4-Kanten-Loch an der Lippe (T-Verbindung) der Unterschale durch zwei Dreiecke; Abbruch wenn nicht dicht."""
import trimesh,numpy as np,itertools
for d in ['print','assembly_stl']:
    p='devices/motion-one/mechanics/%s/unterschale_glatt.stl'%d
    m=trimesh.load(p);V,F=m.vertices,m.faces
    u,c=np.unique(m.edges_sorted,axis=0,return_counts=True);bad=u[c!=2]
    vs=sorted(set(bad.ravel()),key=lambda i:(V[i][1],V[i][0]))
    ok=False
    for perm in itertools.permutations(vs,4):
        a,b,c_,d_=perm
        for tri in ([[a,b,c_],[a,c_,d_]],[[a,c_,b],[a,d_,c_]]):
            m2=trimesh.Trimesh(V,np.vstack([F,tri]),process=False)
            if m2.is_watertight and m2.is_winding_consistent and m2.volume>0:
                m2.export(p);print(d,'dicht',round(m2.volume,1));ok=True;break
        if ok:break
    if not ok:print(d,'nicht repariert')
