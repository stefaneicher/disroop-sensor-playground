import sys, numpy as np, trimesh
for f in sys.argv[1:]:
    m=trimesh.load(f,process=False); m.merge_vertices()
    u,c=np.unique(m.edges_sorted,axis=0,return_counts=True)
    for tag,sel in (("open",c==1),("nonman",c>2)):
        v=m.vertices[u[sel].ravel()].reshape(-1,2,3).mean(1)
        if len(v)==0: print(f,tag,0); continue
        print(f,tag,len(v),"min",v.min(0).round(1),"max",v.max(0).round(1),"xhist",np.histogram(v[:,0],bins=17,range=(0,170))[0].tolist())
