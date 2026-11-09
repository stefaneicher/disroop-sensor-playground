#!/usr/bin/env python3
"""Selected r4 hierarchical schematic, explicit hand coordinates, no router.

Electrical source of truth: frozen baseline pin groups. Symbol electrical data,
properties and footprints are copied from the original schematics. C-prefixed
presentation symbols regroup pins without changing numbers, names or types.
Run inside ./project hw run, from repository root.
"""
import copy
import json
import math
import sys
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SCRIPT_DIR=Path(__file__).resolve().parent
ELECTRONICS=ROOT/'devices/motion-one/electronics'
PROJECT_DIRS={p:ELECTRONICS/'kicad'/p for p in ['motion-one','motion-one-ui']}
sys.dont_write_bytecode = True
SNAPS=SCRIPT_DIR/'hier_r4_inputs/source'
sys.path.insert(0, str(SCRIPT_DIR))
from sexpr import parse, dump, find, Q

BASE=SCRIPT_DIR/'hier_r4_inputs/baseline'
NS = uuid.uuid5(uuid.NAMESPACE_URL, 'disroop-motion-one-competitor-c-r4')
def uid(s):
    return Q(str(uuid.uuid5(NS, s)))
def eff(size=1.5, *justify):
    return ['effects', ['font', ['size', size, size]]] + ([['justify', *justify]] if justify else [])
def prop(k, v, x, y, hide=False):
    e = eff()
    if hide:
        e.append(['hide', 'yes'])
    return ['property', Q(k), Q(v), ['at', x, y, 0], e]
def node(key, *args):
    return [key, *args]
def num(x):
    return round(x, 4)

SOURCES = {}
for project in ('motion-one', 'motion-one-ui'):
    path = SNAPS/(project+'.kicad_sch')
    sch = parse(path.read_text())
    libs = {s[1]: s for s in find(find(sch, 'lib_symbols')[0], 'symbol')}
    inst = {next(p[2] for p in find(s, 'property') if p[1] == 'Reference'): s for s in find(sch, 'symbol')}
    xml = ET.parse(BASE / (project + '.netlist.xml'))
    nets = {(n.attrib['name'].split('/')[-1] if n.attrib['name'].startswith('/') else n.attrib['name']): [(p.attrib['ref'], p.attrib['pin']) for p in n.findall('node')]
            for n in xml.findall('.//nets/net')}
    SOURCES[project] = (libs, inst, nets)

# Additional supply assertions concern passive external rails only; excluded
# power symbols never enter the exported component set.
SOURCES['motion-one'][1]['#FLG06']=copy.deepcopy(SOURCES['motion-one'][1]['#FLG01'])
for flag in ['#FLG01','#FLG02']:
    source=SOURCES['motion-one'][1][flag]
    SOURCES['motion-one-ui'][1][flag]=copy.deepcopy(source)
    SOURCES['motion-one-ui'][0]['power:PWR_FLAG']=copy.deepcopy(SOURCES['motion-one'][0]['power:PWR_FLAG'])

def allpins(s):
    return [p for sub in find(s, 'symbol') for p in find(sub, 'pin')]

LIBRARY = {}
class Sheet:
    def __init__(self, project, name, title, root=None, sheetid=None, paper='A4'):
        self.project, self.name, self.title = project, name, title
        self.id = uid(project + ':' + name)
        self.root, self.sheetid = root or self.id, sheetid
        self.items, self.libs, self.pos, self.angles = [], {}, {}, {}
        self.paper = paper
        self.nets = SOURCES[project][2]
        self.membernet = {m:n for n,ms in self.nets.items() for m in ms}
        self.external = {}
        self.wirecount = 0
        self.junctions = set()
    def text(self, text, x, y, size=1.5):
        self.items.append(['text', Q(text), ['at', x,y,0], eff(size,'left','bottom'), ['uuid',uid(self.name+':text:'+text)]])
    def part(self, ref, x, y, angle=0, groups=None, width=30.48, pitch=5.08, valuepos=None):
        libs, insts, _ = SOURCES[self.project]
        inst = copy.deepcopy(insts[ref])
        oldid = find(inst,'lib_id')[0][1]
        lib = copy.deepcopy(libs[oldid])
        lid = 'C:' + oldid.replace(':','_') + ('_'+self.name+'_'+ref if groups else '')
        if groups:
            pins = {find(p,'number')[0][1]:copy.deepcopy(p) for p in allpins(lib)}
            for setting in find(lib,'pin_names'):
                setting[:]=['pin_names',['offset',1.016]]
            lib=[c for c in lib if not(isinstance(c,list) and c[0]=='pin_numbers')]
            # Fully explicit electrical grouping; each list defines a side.
            maxrows = max(len(groups.get('L',[])),len(groups.get('R',[])),2)
            height = (maxrows+1)*pitch
            body = ['symbol', Q(lid.split(':')[1]+'_0_1'),
                    ['rectangle',['start',-width/2,height/2],['end',width/2,-height/2],
                     ['stroke',['width',0.254],['type','default']],['fill',['type','background']]]]
            unit = ['symbol', Q(lid.split(':')[1]+'_1_1')]
            used = set()
            for side, numbers in groups.items():
                for i, pn in enumerate(numbers):
                    if pn is None: continue
                    pn = str(pn); used.add(pn); pin=pins[pn]
                    pin[:]=[c for c in pin if c!='hide' and not(isinstance(c,list) and c[0]=='hide')]
                    if side in ('L','R'):
                        px = (-1 if side=='L' else 1)*(width/2+5.08)
                        py = height/2-(i+1)*pitch
                        a = 0 if side=='L' else 180
                    else:
                        px = (i-(len(numbers)-1)/2)*7.62
                        py = (1 if side=='T' else -1)*(height/2+5.08)
                        a = 270 if side=='T' else 90
                    find(pin,'at')[0][1:] = [num(px),num(py),a]
                    find(pin,'length')[0][1] = 5.08
                    for child in find(pin,'name')+find(pin,'number'):
                        child[-1] = eff(1.27)
                    unit.append(pin)
            assert used == set(pins), (ref,used^set(pins))
            lib = [c for c in lib if not (isinstance(c,list) and c[0] in ('symbol','extends'))]
            lib += [body,unit]
            lib[1]=Q(lid)
            for p in find(lib,'property'):
                if p[1]=='Reference': find(p,'at')[0][1:] = [0,height/2+2.54,0]
                if p[1]=='Value': find(p,'at')[0][1:] = [0,-height/2-2.54,0]
        else:
            oldname=lib[1].split(':')[-1]
            for sub in find(lib,'symbol'):
                sub[1]=Q(lid.split(':')[1]+sub[1][len(oldname):])
            lib[1]=Q(lid)
        self.libs[lid]=lib
        LIBRARY[lid]=lib
        # Rebuild properties with modest, horizontal, deliberately placed text.
        original={p[1]:p[2] for p in find(inst,'property')}
        inst=[c for c in inst if not(isinstance(c,list) and c[0] in ('at','uuid','instances','property','pin','lib_id'))]
        inst += [['lib_id',Q(lid)],['at',x,y,angle],['uuid',uid(self.name+':'+ref)]]
        localpins=allpins(lib)
        a=math.radians(angle)
        def transform(px,py):
            return (num(x+px*math.cos(a)+py*math.sin(a)),num(y+py*math.cos(a)-px*math.sin(a)))
        # Library Y axis points up, schematic Y points down.
        pts=[]
        for p in localpins:
            at=find(p,'at')[0]; pn=str(find(p,'number')[0][1])
            px,py=float(at[1]),-float(at[2])
            self.pos[(ref,pn)] = transform(px,py)
            self.angles[(ref,pn)]=(float(at[3])+angle)%360
            pts.append(self.pos[(ref,pn)])
            inst.append(['pin',Q(pn),['uuid',uid(self.name+':'+ref+':'+pn)]])
        if groups:
            ry=y-height/2-3.81; vy=y+height/2+(27.94 if groups.get('B') else 5.08)
            rx=x-width/2+3.81; vx=x
        elif ref.startswith(('R','C','TH')):
            if angle%180 == 0:
                rx=vx=x+8.89; ry=y-1.9; vy=y+1.9
            else:
                rx=vx=x; ry=y-5.0; vy=y+5.0
        elif ref.startswith('#'):
            rx=vx=x; ry=vy=y-4
        else:
            rx=vx=x; ry=y-7.5; vy=y+8
        if not groups and ref.startswith('Q'):
            rx=vx=x+12.7;ry=y-7.62;vy=y+7.62
        if not groups and ref.startswith('D') and angle%180:
            rx=vx=x+10.16;ry=y-3.81;vy=y+3.81
        if not groups and ref.startswith('TP'):
            rx=vx=x+10.16;ry=y-2.54;vy=y+2.54
        if valuepos:
            rx,ry,vx,vy=valuepos
        for k,v in original.items():
            if k=='Reference': inst.append(prop(k,ref,rx,ry,ref.startswith('#')))
            elif k=='Value': inst.append(prop(k,v,vx,vy,ref.startswith('#')))
            elif not k.startswith(('ki_','Sim.')): inst.append(prop(k,v,x,y,True))
        # KiCad stores field orientation relative to the symbol orientation.
        # Counter-rotate fields so references/values remain horizontal on paper.
        for field in find(inst,'property'):
            find(field,'at')[0][3]=angle%180
        path='/'+str(self.root)+(('/'+str(self.sheetid)) if self.sheetid else '')
        inst.append(['instances',['project',Q(self.project),
                                ['path',Q(path),['reference',Q(ref)],['unit',1]]]])
        self.items.append(inst)
        return inst
    def p(self, ref, pin):
        return self.pos[(ref,str(pin))]
    def wire(self,*points):
        points=[self.p(*p) if isinstance(p[0],str) else (num(p[0]),num(p[1])) for p in points]
        for p,q in zip(points,points[1:]):
            if p==q: continue
            if p[0]!=q[0] and p[1]!=q[1]:
                # Explicit two-segment drafting primitive; not a placement/router.
                self.wire(p,(q[0],p[1]),q)
                continue
            self.wirecount+=1
            self.items.append(['wire',['pts',['xy',*p],['xy',*q]],
                               ['stroke',['width',0],['type','default']],
                               ['uuid',uid(self.name+':wire:'+str(self.wirecount))]])
    def join(self,*points):
        for point in points:
            p=self.p(*point) if isinstance(point[0],str) else point
            p=tuple(p)
            if p not in self.junctions:
                self.junctions.add(p)
                self.items.append(['junction',['at',*p],['diameter',0],['color',0,0,0,0],
                                   ['uuid',uid(self.name+':junction:'+str(p))]])
    def chain(self,*members):
        """Only for deliberately collinear pin chains."""
        self.wire(*members)
    def h(self, net, point, side='L'):
        self.external[net]=point
        self.items.append(['hierarchical_label',Q(net),['shape','bidirectional'],
                           ['at',*point,0 if side=='L' else 180],eff(1.5,'left' if side=='L' else 'right','bottom'),
                           ['uuid',uid(self.name+':h:'+net)]])
    def port(self,ref,pin,net=None,length=15.24):
        m=(ref,str(pin)); x,y=self.p(*m); a=math.radians(self.angles[m])
        end=(num(x-length*math.cos(a)),num(y+length*math.sin(a)))
        self.wire(m,end)
        self.h(net or self.membernet[m],end,'L' if math.cos(a)>0 else 'R')
    def power(self,net,point,down=False):
        # Genuine KiCad power symbols, not global labels.
        key='power:GND' if net=='GND' else ('power:+3V3' if net=='3V3' else 'power:VCC')
        libfile=ROOT # library comes from installed KiCad
        libroot=parse(Path('/usr/share/kicad/symbols/power.kicad_sym').read_text())
        name=key.split(':')[1]
        lib=copy.deepcopy(next(s for s in find(libroot,'symbol') if s[1]==name))
        lid='C:POWER_'+net
        for p in find(lib,'property'):
            if p[1]=='Value': p[2]=Q(net)
        for p in allpins(lib):
            find(p,'name')[0][1]=Q(net)
        for sub in find(lib,'symbol'):
            sub[1]=Q('POWER_'+net+sub[1][len(name):])
        lib[1]=Q(lid); self.libs[lid]=lib; LIBRARY[lid]=lib
        i=sum(1 for s in self.items if isinstance(s,list) and s[0]=='symbol' and any(p[1]=='Reference' and str(p[2]).startswith('#PWR') for p in find(s,'property')))+1
        ref='#PWR'+str(list(SHEETS).index(self.name)+1 if self.name in SHEETS else 0)+f'{i:03}'
        x,y=point
        inst=['symbol',['lib_id',Q(lid)],['at',x,y,0],['unit',1],['in_bom','no'],['on_board','yes'],
              ['dnp','no'],['uuid',uid(self.name+':power:'+ref)],prop('Reference',ref,x,y,True),
              prop('Value',net,x,y+(5.08 if net=='GND' else -3.81)),
              ['instances',['project',Q(self.project),
                ['path',Q('/'+str(self.root)+(('/'+str(self.sheetid)) if self.sheetid else '')),['reference',Q(ref)],['unit',1]]]]]
        self.items.append(inst)
    def rail(self,ref,pin,net,length=5.08):
        m=(ref,str(pin)); x,y=self.p(*m); a=math.radians(self.angles[m])
        end=(num(x-length*math.cos(a)),num(y+length*math.sin(a)))
        self.wire(m,end); self.power(net,end)
    def nc(self,ref,pin):
        self.items.append(['no_connect',['at',*self.p(ref,pin)],['uuid',uid(self.name+':nc:'+ref+str(pin))]])
    def finish_nc(self):
        for (ref,pin) in self.pos:
            net=self.membernet.get((ref,pin))
            if net and net.startswith('unconnected-'): self.nc(ref,pin)
    def save(self):
        s=['kicad_sch',['version',20250114],['generator',Q('eeschema')],['generator_version',Q('10.0')],
           ['uuid',self.id],['paper',Q(self.paper)],
           ['title_block',['title',Q(self.title)],['date',Q('2026-11-09')],['rev',Q('r4-C')],['company',Q('Disroop')]],
           ['lib_symbols',*self.libs.values()],*self.items]
        if self.root==self.id:
            s.append(['sheet_instances',['path',Q('/'),['page',Q('1')]]])
        (PROJECT_DIRS[self.project]/(self.name+'.kicad_sch')).write_text(dump(s)+'\n')

SHEETS={}
root=Sheet('motion-one','motion-one','Motion One - hierarchische Funktionsarchitektur (Fassung C)',paper='A2')
def child(name,title,paper='A4'):
    s=Sheet('motion-one',name,title,root.id,uid('sheet:'+name),paper)
    SHEETS[name]=s
    return s

# 1: USB input. D+/D- remain continuous wires through the ESD array.
s=child('usb_io','01 / USB-C und ESD')
s.part('J1',45.72,91.44,groups={'L':['A8','B8'], 'R':['A4','A9','B4','B9','A5','B5','A7','B7','A6','B6'],
                              'B':['A1','A12','B1','B12','SH']},width=35.56,pitch=5.08)
s.part('U2',172.72,106.68,groups={'L':['1','3'],'R':['6','4'],'T':['5'],'B':['2']},width=25.4)
s.part('R1',101.6,76.2); s.part('R2',121.92,83.82)
s.part('C1',101.6,40.64); s.part('TP5',149.86,30.48)
# USB duplicate VBUS terminals are intentionally combined outside the box.
for pn in ['A4','A9','B4','B9']:
    x,y=s.p('J1',pn); s.wire(('J1',pn),(83.82,y))
s.wire((83.82,68.58),(83.82,83.82))
s.wire((83.82,68.58),(83.82,30.48),(101.6,30.48),(149.86,30.48))
s.wire(('C1','1'),(101.6,30.48));s.join((101.6,30.48),(83.82,68.58),(83.82,73.66),(83.82,78.74))
s.power('VBUS',(101.6,30.48));s.rail('C1','2','GND')
s.h('VBUS',(149.86,30.48),'R')
for pn,r in [('A5','R1'),('B5','R2')]:
    x,y=s.p('J1',pn); rx,ry=s.p(r,1)
    s.wire(('J1',pn),(rx,y),(rx,ry));s.rail(r,2,'GND')
for pins,esd,channel in [(['A7','B7'],'1',144.78),(['A6','B6'],'3',152.4)]:
    for pn in pins:
        x,y=s.p('J1',pn);s.wire(('J1',pn),(channel-15.24,y))
    y1=s.p('J1',pins[0])[1];y2=s.p('J1',pins[1])[1]
    ex,ey=s.p('U2',esd)
    s.wire((channel-15.24,y1),(channel-15.24,y2),(channel-15.24,ey),(ex,ey))
    s.join((channel-15.24,y2))
for a,b,lane,yb in [('1','6',144.78,83.82),('3','4',147.32,139.7)]:
    ax,ay=s.p('U2',a);bx,by=s.p('U2',b)
    right=200.66 if b=='6' else 205.74
    s.wire(('U2',a),(lane,ay),(lane,yb),(right,yb),(right,by),('U2',b))
    s.wire((right,by),(right+15.24,by));s.h('USB_DM' if b=='6' else 'USB_DP',(right+15.24,by),'R')
s.rail('U2','5','VBUS');s.rail('U2','2','GND')
for pn in ['A1','A12','B1','B12','SH']: s.rail('J1',pn,'GND',7.62)
s.part('#FLG01',228.6,30.48);s.rail('#FLG01',1,'VBUS',0)
s.part('#FLG02',251.46,30.48);s.rail('#FLG02',1,'GND',0)
s.finish_nc()

# 2: TP4056 typical application: VIN above, battery right, set resistors below.
s=child('power_charge','02 / Li-Ion-Lader und Temperaturfreigabe')
s.part('U3',114.3,83.82,groups={'L':['8','7','6'],'R':['5','1','2'],'T':['4'],'B':['3','9']},width=35.56)
s.part('J2',243.84,66.04,groups={'L':['1','2'],'B':['MP']},width=20.32)
s.part('C2',205.74,50.8);s.part('R3',154.94,114.3)
s.part('TH1',180.34,111.76);s.part('R5',180.34,78.74);s.part('R4',180.34,53.34)
s.part('D5',63.5,83.82,angle=90);s.part('R6',63.5,58.42)
s.rail('U3',4,'VBUS',10.16);s.rail('U3',8,'VBUS',10.16)
s.wire(('U3','7'),(63.5,83.82),(63.5,87.63))
s.wire(('D5','2'),('R6','2'));s.rail('R6',1,'VBUS',7.62)
bx,by=s.p('U3',5)
s.wire(('U3','5'),(160.02,by),(160.02,35.56),(205.74,35.56))
s.wire(('C2','1'),(205.74,35.56));s.power('VBAT',(205.74,35.56))
jx,jy=s.p('J2',1);s.wire((160.02,by),(jx,by),(jx,jy));s.join((160.02,by))
s.rail('J2',2,'BATN',10.16);s.rail('C2',2,'GND')
s.h('VBAT',(205.74,35.56),'R')
s.rail('R4',1,'VBUS',5.08);s.wire(('R4','2'),('R5','1'))
tx,ty=s.p('U3',1)
s.wire(('U3','1'),(180.34,ty),('TH1','1'))
s.wire(('R5','2'),(180.34,ty));s.join((180.34,ty))
px,py=s.p('U3',2);s.wire(('U3','2'),(154.94,py),('R3','1'))
for r,pn in [('TH1',2),('R3',2),('U3',3),('U3',9)]:s.rail(r,pn,'GND',7.62)
s.finish_nc()

# 3: cell protection, intentionally separate from charger.
s=child('cell_protection','03 / DW01A und Rueckleiter-Schutz')
s.part('U4',101.6,73.66,groups={'L':['5','6'],'R':['2','4'],'B':['1','3']},width=30.48)
s.part('Q3',139.7,124.46,groups={'L':['6','1','2'],'R':['4','3','5']},width=25.4)
s.part('R7',48.26,68.58,angle=90);s.part('C3',71.12,83.82);s.part('R8',167.64,68.58,angle=90)
s.rail('R7',1,'VBAT',10.16)
s.wire(('R7','2'),('U4','5'));s.wire(('C3','1'),(71.12,68.58));s.join((71.12,68.58))
s.rail('C3',2,'BATN');s.rail('U4',6,'BATN',10.16)
s.wire(('U4','2'),('R8','1'));s.rail('R8',2,'GND',7.62)
x,y=s.p('U4',1);qx,qy=s.p('Q3',6);s.wire(('U4',1),(x,104.14),(qx,104.14),('Q3',6))
x,y=s.p('U4',3);qx,qy=s.p('Q3',4);s.wire(('U4',3),(x,99.06),(qx+10.16,99.06),(qx+10.16,qy),('Q3',4))
s.rail('Q3',1,'BATN',10.16);s.rail('Q3',3,'GND',10.16)
x,y=s.p('Q3',2);xx,yy=s.p('Q3',5)
s.wire(('Q3',2),(x-7.62,y),(x-7.62,147.32),(xx+7.62,147.32),(xx+7.62,yy),('Q3',5))
s.part('#FLG03',48.26,152.4);s.rail('#FLG03',1,'BATN',0)
s.part('#FLG04',71.12,68.58);s.join((71.12,68.58))
s.finish_nc()

# 4: USB/battery OR, load switch and LDO in left-to-right power flow.
s=child('regulator','04 / Power-Path, Hauptschalter und 3V3-Regler',paper='A3')
s.part('D1',55.88,55.88,angle=180)
s.part('Q1',93.98,81.28,angle=90)
s.part('Q2',175.26,81.28,angle=90)
s.part('U5',269.24,76.2,valuepos=(269.24,68.58,287.02,88.9))
s.part('C4',137.16,99.06);s.part('C5',233.68,99.06);s.part('C6',302.26,99.06)
s.part('C7',330.2,99.06);s.part('C8',358.14,99.06)
s.part('R9',93.98,132.08);s.part('R10',175.26,132.08)
s.part('SW1',220.98,172.72)
s.part('TP2',137.16,55.88);s.part('TP6',233.68,55.88)
s.rail('D1',2,'VBUS',12.7)
x,y=s.p('Q1',1);s.wire(('Q1',1),(x,111.76),('R9',1));s.power('VBUS',(x,111.76));s.rail('R9',2,'GND',7.62)
s.rail('Q1',3,'VBAT',12.7)
x,y=s.p('Q1',2);xx,yy=s.p('Q2',2)
s.wire(('Q1',2),(137.16,y),(137.16,55.88),('D1',1))
s.wire((137.16,y),('Q2',2));s.join((137.16,y))
s.wire(('C4',1),(137.16,y));s.rail('C4',2,'GND',7.62);s.power('VSYS',(137.16,55.88))
s.part('#FLG06',137.16,55.88)
s.wire(('R10',1),(175.26,111.76),(xx-12.7,111.76),(xx-12.7,yy),('Q2',2))
x,y=s.p('Q2',1);s.wire(('Q2',1),('R10',2))
sx,sy=s.p('SW1',2);s.wire(('R10',2),(175.26,172.72),('SW1',2))
s.rail('SW1',1,'GND',7.62)
x,y=s.p('Q2',3);s.wire(('Q2',3),(233.68,y),(233.68,55.88));s.power('VSW',(233.68,55.88))
s.wire(('C5',1),(233.68,y));s.join((233.68,y))
ux,uy=s.p('U5',3);s.wire((233.68,y),(246.38,y),(246.38,uy),('U5',3))
s.rail('C5',2,'GND',7.62);s.rail('U5',1,'GND',7.62)
x,y=s.p('U5',2)
s.wire(('U5',2),(302.26,y),(330.2,y),(358.14,y))
for r in ['C6','C7','C8']:
    rx,ry=s.p(r,1);s.wire((rx,y),(rx,ry));s.join((rx,y));s.rail(r,2,'GND',7.62)
s.power('3V3',(358.14,y))
s.part('#FLG05',233.68,55.88);s.join((233.68,55.88))
s.h('VBUS',(30.48,35.56));s.power('VBUS',(30.48,35.56))
s.h('VBAT',(93.98,35.56));s.power('VBAT',(93.98,35.56))
s.h('3V3',(358.14,y),'R');s.h('VSW',(233.68,55.88),'R')
s.finish_nc()

# 5: MCU pin grouping is explicit, preserving every source pin number/name/type.
s=child('mcu','05 / nRF52840, 32-kHz-Quarz, Reset und SWD',paper='A3')
s.part('U1',195.58,116.84,groups={
    'L':['29','31',None,'8','10','9','3','1',None,'28','30','2',None,'6','7','4'],
    'R':['20','14','16','17','22','12',None,'15','18',None,'26','37','39','11','13',
         None,'25','32','33','34','35','36','38','40','41','42','43'],
    'T':['19','23','27'],'B':['5','21','24']},
    width=55.88,pitch=5.08,valuepos=(154.94,40.64,195.58,218.44))
s.part('Y1',294.64,172.72)
s.part('C9',279.4,190.5);s.part('C10',309.88,190.5)
s.part('C14',101.6,40.64);s.rail('C14',2,'GND',7.62)
x,y=s.p('U1',19)
s.wire(('U1',19),(x,25.4),(101.6,25.4),('C14',1));s.power('3V3',(101.6,25.4))
s.part('J4',325.12,111.76,groups={'L':['3','2','4','6'],'T':['1'],'B':['5']},width=30.48)
s.part('SW2',114.3,157.48)
for pn in ['29','31','8','10','9','3','1','28','30','2','6','7','20','14','16','17','22','12','15','18']:
    s.port('U1',pn,length=25.4)
for pn in [19,23]:s.rail('U1',pn,'3V3',7.62)
s.rail('U1',27,'VBUS',7.62)
for pn in [5,21,24]:s.rail('U1',pn,'GND',7.62)
for up,jp in [('26','3'),('37','2'),('39','4')]:
    x,y=s.p('U1',up);xx,yy=s.p('J4',jp)
    lane={'26':269.24,'37':274.32,'39':279.4}[up]
    s.wire(('U1',up),(lane,y),(lane,yy),('J4',jp))
s.rail('J4',1,'3V3',7.62);s.rail('J4',5,'GND',7.62)
for up,yp,cap,lane in [('11','1','C9',279.4),('13','2','C10',309.88)]:
    x,y=s.p('U1',up);cx,cy=s.p(cap,1);yx,yy=s.p('Y1',yp)
    s.wire(('U1',up),(lane,y),(lane,172.72),(yx,yy))
    s.wire((lane,172.72),(cx,cy));s.join((lane,172.72));s.rail(cap,2,'GND',7.62)
x,y=s.p('U1',4);sx,sy=s.p('SW2',1)
s.wire(('U1',4),(99.06,y),(99.06,157.48),('SW2',1));s.rail('SW2',2,'GND',7.62)
s.h('3V3',(101.6,35.56));s.power('3V3',(101.6,35.56))
s.h('VBUS',(124.46,35.56));s.power('VBUS',(124.46,35.56))
s.finish_nc()

# 6: battery ADC divider, gate enable and filter in physical circuit order.
s=child('battery_sense','06 / Geschalteter Akku-Messpfad')
s.part('Q4',101.6,60.96)
s.part('Q5',55.88,96.52)
s.part('R11',78.74,60.96);s.part('R12',30.48,116.84)
s.part('R13',104.14,91.44);s.part('R14',104.14,119.38);s.part('C13',142.24,119.38)
s.part('TP1',104.14,35.56)
s.wire(('Q4',2),(104.14,35.56));s.power('VBAT',(104.14,35.56))
s.rail('R11',1,'VBAT',7.62)
gx,gy=s.p('Q4',1);s.wire(('Q4',1),(88.9,gy),(88.9,73.66),(58.42,73.66),('Q5',3))
s.wire(('R11',2),(78.74,73.66));s.join((78.74,73.66))
s.wire(('Q4',3),('R13',1))
s.wire(('R13',2),('R14',1))
s.wire((104.14,104.14),(142.24,104.14),('C13',1));s.join((104.14,104.14))
s.h('VBAT_ADC',(177.8,104.14),'R');s.wire((142.24,104.14),(177.8,104.14));s.join((142.24,104.14))
s.wire(('Q5',1),(30.48,96.52),('R12',1));s.join((30.48,96.52))
s.h('VBAT_EN',(15.24,96.52));s.wire((15.24,96.52),(30.48,96.52))
for r,p in [('Q5',2),('R12',2),('R14',2),('C13',2)]:s.rail(r,p,'GND',7.62)
s.h('VBAT',(104.14,35.56));s.finish_nc()

# 7: IMU, only six digital interfaces, decoupling directly above supply pins.
s=child('imu','07 / ICM-45686 SPI und Abblockung')
s.part('U6',129.54,83.82,groups={'L':['12','13','14','1'],'R':['4','9','11'],
   'T':['8','5'],'B':['6','2','3','7','10']},width=40.64,pitch=7.62)
s.part('C11',101.6,40.64);s.part('C12',157.48,40.64)
for pn,c in [('8','C11'),('5','C12')]:
    x,y=s.p('U6',pn);cx,cy=s.p(c,1)
    s.wire(('U6',pn),(x,25.4),(cx,25.4),('C'+('11' if pn=='8' else '12'),1))
    s.power('3V3',(cx,25.4));s.rail(c,2,'GND',5.08)
for pn in [12,13,14,1,4,9]:s.port('U6',pn,length=20.32)
for pn in [6,2,3,7,10]:s.rail('U6',pn,'GND',7.62)
s.h('3V3',(210.82,25.4));s.power('3V3',(210.82,25.4));s.finish_nc()

# 8: two low-side drivers, vertically drawn load/diode/transistor loops.
s=child('haptic','08 / Motor- und Summer-Treiber',paper='A3')
for base,load,q,d,pull,net,rail in [(0,'J3','Q7','D3','R17','MOT_EN','VSW'),
                                    (170.18,'BZ1','Q6','D2','R16','BUZ_PWM','3V3')]:
    cx=96.52+base
    s.part(load,cx+20.32,58.42)
    s.part(d,cx-17.78,58.42,angle=270)
    s.part(q,cx,121.92)
    s.part(pull,cx-30.48,142.24)
    a,b=s.p(load,1),s.p(load,2)
    s.wire((cx-17.78,54.61),(cx-17.78,38.1),(a[0]-7.62,38.1),(a[0]-7.62,a[1]),(a[0],a[1]))
    s.power(rail,(cx-17.78,38.1))
    s.wire((cx-17.78,62.23),(cx-17.78,86.36),(b[0]-7.62,86.36),(b[0]-7.62,b[1]),(b[0],b[1]))
    if q=='Q6':
        s.part('R15',cx+2.54,99.06)
        s.wire((cx-17.78,86.36),(cx+2.54,86.36),('R15',1));s.wire(('R15',2),('Q6',3))
    else:
        s.wire((cx-17.78,86.36),(cx+2.54,86.36),(cx+2.54,116.84))
    s.join((cx-17.78,86.36))
    s.wire((cx-30.48,121.92),s.p(q,1));s.wire((cx-30.48,121.92),s.p(pull,1))
    s.wire((cx-50.8,121.92),(cx-30.48,121.92));s.join((cx-30.48,121.92))
    s.h(net,(cx-50.8,121.92))
    s.rail(q,2,'GND',12.7);s.rail(pull,2,'GND',7.62)
s.h('VSW',(30.48,25.4));s.power('VSW',(30.48,25.4))
s.h('3V3',(200.66,25.4));s.power('3V3',(200.66,25.4));s.finish_nc()

# 9: RGB current limiting and extension connector.
s=child('ui_io','09 / RGB-LED und UI-Erweiterungsstecker')
s.part('D4',116.84,63.5,valuepos=(116.84,45.72,116.84,83.82))
for r,pn,yy in [('R18','1',50.8),('R19','3',63.5),('R20','4',76.2)]:
    s.part(r,60.96,yy,angle=90)
    px,py=s.p('D4',pn)
    s.wire((64.77,yy),(99.06,yy),(99.06,py),(px,py));s.port(r,1,length=15.24)
s.rail('D4',2,'3V3',10.16)
s.part('J5',177.8,116.84,groups={'L':['2','3','4','5','6','7'],'T':['1'],'B':['8','MP']},width=35.56,pitch=5.08)
for p in [2,3,4,5,6]:s.port('J5',p,length=30.48)
s.rail('J5',1,'3V3',7.62)
for p in [8,'MP']:s.rail('J5',p,'GND',7.62)
s.part('H1',233.68,60.96);s.part('H2',233.68,91.44)
s.h('3V3',(218.44,30.48));s.power('3V3',(218.44,30.48));s.finish_nc()

# Root architecture. Each group uses a dedicated parallel wire corridor.
root.text('ENERGIE: USB / Akku -> Laden und Schutz -> Regler -> MCU -> Sensorik / Bedienung',25.4,20.32,2.1)
root.text('Jeder Kasten oeffnet ein voll verdrahtetes Funktionsblatt. Versorgungssymbole sind echte Power-Symbole.',25.4,28.0,1.5)

def box(name,x,y,w,h,ports):
    s=SHEETS[name]; sid=s.sheetid
    item=['sheet',['at',x,y],['size',w,h],['fields_autoplaced','yes'],
          ['stroke',['width',0.254],['type','default']],['fill',['color',0,0,0,0]],['uuid',sid],
          prop('Sheetname',name,x+2.54,y-3.81),prop('Sheetfile',name+'.kicad_sch',x,y+h+2.54,True)]
    find(find(item,'property')[0],'effects')[0][1]=['font',['size',2.0,2.0]]
    find(find(item,'property')[0],'effects')[0].append(['justify','left','bottom'])
    coords={}
    for side,net,offset in ports:
        px=x if side=='L' else x+w
        py=y+offset
        item.append(['pin',Q(net),'bidirectional',['at',px,py,180 if side=='L' else 0],
                     eff(1.75,'left' if side=='L' else 'right','bottom'),['uuid',uid('sheetpin:'+name+':'+net)]])
        coords[net]=(px,py)
    missing=set(s.external)-set(coords)
    assert not missing,(name,missing)
    item.append(['instances',['project',Q('motion-one'),['path',Q('/'+str(root.id)),['page',Q(str(list(SHEETS).index(name)+2))]]]])
    root.items.append(item)
    return coords

usb=box('usb_io',25.4,55.88,50.8,45.72,[('R','VBUS',10.16),('R','USB_DM',25.4),('R','USB_DP',33.02)])
chg=box('power_charge',106.68,55.88,55.88,45.72,[('R','VBAT',22.86)])
# Charger VBUS is a real hierarchical terminal, connected to the same supply symbol.
SHEETS['power_charge'].h('VBUS',(30.48,25.4));SHEETS['power_charge'].power('VBUS',(30.48,25.4))
# Add matching root pin to already emitted sheet.
chitem=next(i for i in root.items if i[0]=='sheet' and find(i,'uuid')[0][1]==SHEETS['power_charge'].sheetid)
chitem.append(['pin',Q('VBUS'),'bidirectional',['at',106.68,66.04,180],eff(1.75,'left','bottom'),['uuid',uid('sheetpin:charge:VBUS')]])
chg['VBUS']=(106.68,66.04)
reg=box('regulator',208.28,55.88,55.88,50.8,[('L','VBUS',10.16),('L','VBAT',22.86),('R','3V3',10.16),('R','VSW',33.02)])
mcuports=[('L','3V3',10.16),('L','VBUS',20.32),('L','USB_DM',30.48),('L','USB_DP',38.1),
          ('L','VBAT_EN',68.58),('L','VBAT_ADC',76.2)]
rightnets=['IMU_CS','IMU_SCK','IMU_MOSI','IMU_MISO','IMU_INT1','IMU_INT2',
           'MOT_EN','BUZ_PWM','LED_R','LED_G','LED_B','EXT1','EXT2','EXT3','EXT4','EXT5']
mcuports += [('R',n,10.16+i*7.62) for i,n in enumerate(rightnets)]
mc=box('mcu',335.28,55.88,66.04,152.4,mcuports)
imu=box('imu',477.52,55.88,81.28,60.96,[('L',n,10.16+i*7.62) for i,n in enumerate(rightnets[:6])]+[('R','3V3',10.16)])
hap=box('haptic',477.52,137.16,81.28,50.8,[('L','MOT_EN',10.16),('L','BUZ_PWM',17.78),('R','3V3',10.16),('R','VSW',25.4)])
uio=box('ui_io',477.52,208.28,81.28,88.9,[('L',n,10.16+i*7.62) for i,n in enumerate(rightnets[8:])]+[('R','3V3',10.16)])
sense=box('battery_sense',208.28,167.64,55.88,50.8,[('L','VBAT',10.16),('R','VBAT_EN',10.16),('R','VBAT_ADC',17.78)])
prot=box('cell_protection',106.68,132.08,55.88,40.64,[])
SHEETS['cell_protection'].h('VBAT',(30.48,25.4));SHEETS['cell_protection'].power('VBAT',(30.48,25.4))
it=next(i for i in root.items if i[0]=='sheet' and find(i,'uuid')[0][1]==SHEETS['cell_protection'].sheetid)
it.append(['pin',Q('VBAT'),'bidirectional',['at',162.56,142.24,0],eff(1.75,'right','bottom'),['uuid',uid('sheetpin:protect:VBAT')]])
prot['VBAT']=(162.56,142.24)
for block in ['power_charge','cell_protection']:
    SHEETS[block].h('BATN',(30.48,43.18))
    SHEETS[block].power('BATN',(30.48,43.18))
for block,px,py,angle in [('power_charge',162.56,88.9,0),('cell_protection',106.68,142.24,180)]:
    it=next(i for i in root.items if i[0]=='sheet' and find(i,'uuid')[0][1]==SHEETS[block].sheetid)
    it.append(['pin',Q('BATN'),'bidirectional',['at',px,py,angle],eff(1.75,'left' if angle==180 else 'right','bottom'),['uuid',uid('sheetpin:'+block+':BATN')]])
root.wire((162.56,88.9),(172.72,88.9),(172.72,111.76),(99.06,111.76),(99.06,142.24),(106.68,142.24))
root.wire(usb['VBUS'],chg['VBUS'])
root.wire(chg['VBUS'],(91.44,66.04),(91.44,43.18),(187.96,43.18),(187.96,66.04),reg['VBUS'])
root.join((91.44,66.04))
root.wire(chg['VBAT'],(182.88,78.74),reg['VBAT'])
root.wire((182.88,78.74),(182.88,119.38));root.join((182.88,78.74))
root.wire(prot['VBAT'],(182.88,142.24),(182.88,119.38));root.join((182.88,119.38))
root.wire(sense['VBAT'],(182.88,177.8),(182.88,142.24));root.join((182.88,142.24))
root.wire(reg['3V3'],mc['3V3'])
root.wire(mc['VBUS'],(309.88,76.2),(309.88,38.1),(91.44,38.1),(91.44,43.18));root.join((91.44,43.18))
for net,yy in [('USB_DM',238.76),('USB_DP',246.38)]:
    root.wire(usb[net],(81.28 if net=='USB_DM' else 86.36,usb[net][1]),
              (81.28 if net=='USB_DM' else 86.36,yy),(320.04 if net=='USB_DM' else 325.12,yy),
              (320.04 if net=='USB_DM' else 325.12,mc[net][1]),mc[net])
for n in ['VBAT_EN','VBAT_ADC']:
    root.wire(sense[n],(294.64 if n=='VBAT_EN' else 302.26,sense[n][1]),
              (294.64 if n=='VBAT_EN' else 302.26,mc[n][1]),mc[n])
for n in rightnets[:6]:root.wire(mc[n],imu[n])
for i,n in enumerate(rightnets[6:8]):
    lane=459.74+i*6.35
    root.wire(mc[n],(lane,mc[n][1]),(lane,hap[n][1]),hap[n])
for i,n in enumerate(rightnets[8:]):
    lane=414.02+i*6.35
    root.wire(mc[n],(lane,mc[n][1]),(lane,uio[n][1]),uio[n])
# Explicit peripheral supply bus, fed from the LDO output corridor.
root.wire((284.48,66.04),(284.48,30.48),(574.04,30.48),(574.04,218.44))
root.join((284.48,66.04));root.power('3V3',(574.04,30.48))
for ports in [imu,hap,uio]:
    p=ports['3V3'];root.wire(p,(574.04,p[1]));root.join((574.04,p[1]))
root.wire(reg['VSW'],(279.4,88.9),(279.4,309.88),(579.12,309.88),(579.12,162.56),hap['VSW'])
root.text('Schutz liegt im Akku-Rueckleiter (BATN). Detail siehe cell_protection.',25.4,279.4)
root.text('Kein PCB-Redesign: identische Referenzen und elektrische Pin-Gruppen gegen r4-Baseline.',25.4,287.02)

# Independent UI project, all connections drawn in one compact application sheet.
ui=Sheet('motion-one-ui','motion-one-ui','Motion One - optionale UI-Platine (Fassung C)',paper='A3')
s=ui
s.part('SW1',76.2,101.6,groups={'R':['2','5','a','c'],'T':['3','4'],
       'B':['1','6','7','8','9','10','b','d']},width=35.56,pitch=12.7)
s.part('J1',330.2,86.36,groups={'L':['2','3','5','6','4','7'],'T':['1'],'B':['8','MP']},width=30.48,pitch=10.16)
s.part('U2',218.44,170.18,groups={'L':['1','3'],'R':['4','6'],'T':['5'],'B':['2']},width=30.48,pitch=7.62)
for r,pn,yy in [('R1',2,82.55),('R2',5,95.25),('R3','a',107.95)]:
    # Actual source pin rows are computed from the explicit grouped symbol.
    y=s.p('SW1',pn)[1]
    s.part(r,144.78,y,angle=90);s.wire(('SW1',pn),s.p(r,2))
    jp={'R1':2,'R2':3,'R3':5}[r];jx,jy=s.p('J1',jp)
    lane={'R1':251.46,'R2':259.08,'R3':266.7}[r]
    s.wire(s.p(r,1),(lane,y),(lane,jy),('J1',jp))
    ep={'R1':1,'R2':3,'R3':4}[r];ex,ey=s.p('U2',ep)
    # ESD taps occupy separate wiring channels below the signal rows.
    if ep in [1,3]:
        bx=180.34 if ep==1 else 187.96
        s.wire((bx,y),(bx,ey),('U2',ep));s.join((bx,y))
    else:
        s.wire((lane,y),(lane,ey),('U2',ep));s.join((lane,y))
x,y=s.p('SW1','c');ax,ay=s.p('SW1','a')
s.wire(('SW1','c'),(116.84,y),(116.84,ay),('SW1','a'));s.join((116.84,ay))
s.part('U1',96.52,240.03,groups={'L':['3'],'R':['1'],'T':['5'],'B':['2','4','6']},width=30.48,pitch=7.62)
s.part('R4',167.64,236.22,angle=90);s.part('R5',45.72,236.22,angle=90)
s.part('C1',139.7,203.2);s.part('E1',20.32,236.22,groups={'R':['1']},width=10.16,pitch=7.62)
s.wire(('E1',1),('R5',1));s.wire(('R5',2),('U1',3));s.wire(('U1',1),('R4',2))
x,y=s.p('J1',6);s.wire(('R4',1),(284.48,236.22),(284.48,y),('J1',6))
ex,ey=s.p('U2',6);s.wire(('U2',6),(284.48,ey));s.join((284.48,ey))
for pn in [3,4]:s.rail('SW1',pn,'3V3',7.62)
for pn in [1,6,7,8,9,10,'b','d']:s.rail('SW1',pn,'GND',7.62)
s.wire(('U1',5),(96.52,187.96),(139.7,187.96),('C1',1))
s.power('3V3',(139.7,187.96));s.rail('C1',2,'GND',7.62)
for pn in [2,4,6]:s.rail('U1',pn,'GND',7.62)
s.rail('U2',5,'3V3',7.62);s.rail('U2',2,'GND',7.62)
s.rail('J1',1,'3V3',7.62)
for pn in [8,'MP']:s.rail('J1',pn,'GND',7.62)
s.part('H1',365.76,198.12);s.part('H2',365.76,223.52)
s.part('#FLG01',350.52,38.1);s.rail('#FLG01',1,'3V3',0)
s.part('#FLG02',373.38,38.1);s.rail('#FLG02',1,'GND',0)
s.finish_nc()
s.text('Optionale Erweiterungsplatine (J5), nicht Teil des Geräts r4',25.4,17.78,2.54)
s.text('UI / Joystick, Taster und Touch mit ESD',25.4,25.4,2.1)
for caption,yy in [('STICK_X -> EXT1',77.47),('STICK_Y -> EXT2',90.17),
                   ('BUTTON -> EXT4',102.87),('TOUCH -> EXT5',231.14)]:
    s.text(caption,193.04,yy,1.5)

for s in [root,*SHEETS.values(),ui]:
    if s not in [root,ui]:
        s.text(s.title,15.24,15.24,2.0)
    s.save()
    print(s.name,'parts',len(s.pos),'wires',s.wirecount,'hlabels',len(s.external))

# A self-contained symbol library: no dependence on the concurrently edited source.
libitems=[]
for lid,lib in LIBRARY.items():
    lib=copy.deepcopy(lib);lib[1]=Q(lid.split(':')[1]);libitems.append(lib)
for project,directory in PROJECT_DIRS.items():
    (directory/'motion-one-hier.kicad_sym').write_text(dump(['kicad_symbol_lib',['version',20241209],['generator',Q('kicad_symbol_editor')],*libitems])+'\n')
    table_path=directory/'sym-lib-table'
    table=parse(table_path.read_text())
    table[:]=[entry for entry in table if not(isinstance(entry,list) and entry[0]=='lib'
              and find(entry,'name')[0][1]=='C')]
    table.append(['lib',['name',Q('C')],['type',Q('KiCad')],
                  ['uri',Q('${KIPRJMOD}/motion-one-hier.kicad_sym')],['options',Q('')],
                  ['descr',Q('Selected r4 hierarchical presentation symbols')]])
    table_path.write_text(dump(table)+'\n')
# Existing project files, footprint tables, DRC rules and boards are deliberately
# NOT regenerated here. Board namespace migration is a separately logged step.
