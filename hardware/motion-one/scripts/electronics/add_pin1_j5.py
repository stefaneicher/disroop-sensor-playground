import pcbnew as P
for path,ref in (('hardware/motion-one/electronics/kicad/motion-one/motion-one.kicad_pcb','J5'),('hardware/motion-one/electronics/kicad/motion-one-ui/motion-one-ui.kicad_pcb','J1')):
    b=P.LoadBoard(path)
    if any(d.GetText()=='J5-1' for d in b.GetDrawings() if hasattr(d,'GetText')): continue
    fp=b.FindFootprintByReference(ref)
    p=[q for q in fp.Pads() if q.GetNumber()=='1'][0]
    t=P.PCB_TEXT(b); t.SetText('J5-1'); t.SetLayer(P.F_Fab); t.SetTextSize(P.VECTOR2I(P.FromMM(0.8),P.FromMM(0.8)))
    c=p.GetPosition(); t.SetPosition(P.VECTOR2I(c.x,c.y-P.FromMM(2.2))); b.Add(t)
    P.SaveBoard(path,b); print(path,'pin1 at',P.ToMM(c.x),P.ToMM(c.y))
