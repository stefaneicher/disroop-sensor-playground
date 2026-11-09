# Beschriftet exploded_raw.png (Positionen per Auge aus Vorschau, Darstellung, ANNAHME)
from PIL import Image, ImageDraw, ImageFont
d='devices/motion-one/media/renders/'
im=Image.open(d+'exploded_raw.png').convert('RGBA'); S=3
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',72)
dr=ImageDraw.Draw(im)
L=[('1 Tastenkappe',(515,95),(1250,60)),('2 Oberschale (Service J4, USB-C)',(900,190),(1250,130)),
('3 Platine r4 (pcb_r4)',(470,300),(30,200)),('4 Akku 503040 (ANNAHME)',(455,395),(30,610)),
('5 Unterschale mit Clips',(800,520),(1250,560))]
for t,(x,y),(tx,ty) in L:
    w=dr.textlength(t,font=f); right=tx>=900
    ex=(tx*S-w-20) if right else (tx*S+w+20)
    dr.line([(x*S,y*S),(ex,ty*S+40)],fill=(20,20,20,255),width=6)
    dr.text((tx*S,ty*S),t,font=f,fill=(20,20,20,255),anchor='ra' if tx>=900 else 'la')
dr.text((100,2060),'Schieber SW1 und Motor: in Aufsicht ausserhalb/verdeckt, siehe top_open.png. Darstellung, Explosionsvektoren ANNAHME.',font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',48),fill=(20,20,20,255))
im.save(d+'exploded_labeled.png')
