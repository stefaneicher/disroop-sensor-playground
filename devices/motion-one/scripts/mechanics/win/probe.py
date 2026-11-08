import Part, FreeCAD as App
R=r"C:\Users\stefa\IdeaProjects\disroop-sensor-playground\devices\motion-one"
def L(n):
    s=Part.Shape(); s.read(R+"\\mechanics\\cad\\"+n); return s
up=L("oberschale.brep"); lo=L("unterschale_glatt.brep")
print("up",up.isValid(),up.Volume,up.BoundBox); print("lo",lo.isValid(),lo.Volume,lo.BoundBox)
V=App.Vector
def segs(sh,p,d):
    e=Part.makeLine(p,p+d*300); c=sh.common(e)
    return [(round(x.Vertexes[0].Point.x,2),round(x.Vertexes[0].Point.y,2),round(x.Vertexes[0].Point.z,2),round(x.Vertexes[-1].Point.y,2),round(x.Vertexes[-1].Point.z,2)) for x in c.Edges]
for x in (8,12,35,47,63.1,68):
    print("lo z x=",x,segs(lo,V(x,0,-50),V(0,0,1)), "y-side", segs(lo,V(x,-50,-5),V(0,1,0)))
    print("up y x=",x,segs(up,V(x,-50,1.2),V(0,1,0)),"lo y z1.2",segs(lo,V(x,-50,1.0),V(0,1,0)))
b=Part.read(R+"\\electronics\\kicad\\motion-one\\export\\motion-one-board.step")
print("board",b.BoundBox,len(b.Solids))
import Mesh
m=Mesh.Mesh(R+"\\mechanics\\assembly_stl\\pcb_r3.stl"); print("pcbr3",m.BoundBox)
