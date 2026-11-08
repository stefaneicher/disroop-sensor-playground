import FreeCAD as App, Part, Mesh, MeshPart, Import
R=r"C:\Users\stefa\IdeaProjects\disroop-sensor-playground\devices\motion-one"
O=R+r"\mechanics\alt_win_r4"
d=App.openDocument(O+r"\motion-one_r4_win_baugruppe.FCStd")
for n,o in (("oberschale","Oberschale_r3"),("unterschale","Unterschale_r3")):
    obj=d.getObject(o)
    Import.export([obj],O+"\\"+n+".step")
    r=Part.read(O+"\\"+n+".step"); print("STEP",n,r.isValid(),len(r.Solids),round(sum(s.Volume for s in r.Solids),1),r.BoundBox)
    m=MeshPart.meshFromShape(Shape=obj.Shape.Solids[0],LinearDeflection=0.05,AngularDeflection=0.3,Relative=False)
    print("STL",n,m.isSolid(),m.hasNonManifolds(),m.hasSelfIntersections(),round(m.Volume,1),m.CountFacets)
    m.write(O+"\\"+n+".stl")
