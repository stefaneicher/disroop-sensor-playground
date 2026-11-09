import trimesh,numpy as np,glob,json
out={}
D="devices/motion-one/mechanics/"
for f in [D+"print/oberschale.stl",D+"print/unterschale_glatt.stl",D+"print/tastenkappe.stl",D+"print/lichtleiter.stl"]+glob.glob(D+"assembly_stl/*.stl"):
    m=trimesh.load(f,process=False); m.merge_vertices()
    u,c=np.unique(m.edges_sorted,axis=0,return_counts=True)
    out[f]=dict(open=int((c==1).sum()),nonman=int((c>2).sum()),watertight=bool(m.is_watertight))
    print(f,out[f],flush=True)
json.dump(out,open("devices/motion-one/logs/stl_check_r4.json","w"),indent=1)
