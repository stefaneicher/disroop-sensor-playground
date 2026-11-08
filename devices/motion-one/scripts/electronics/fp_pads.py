import sys, pcbnew as P
b=P.LoadBoard(sys.argv[1]); f=b.FindFootprintByReference(sys.argv[2])
for p in f.Pads(): print(p.GetNumber(), round(P.ToMM(p.GetPosition().x),2), round(P.ToMM(p.GetPosition().y),2), p.GetNetname())
