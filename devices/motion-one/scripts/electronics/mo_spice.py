"""ngspice-Simulationen Motion One V1: Netzliste -> Log -> CSV -> Plot + Kennzahlen (spice/results.json)."""
import os, subprocess, json, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
S = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../electronics/spice/')
MOD = """
.model PMOS_AO3401 PMOS (LEVEL=1 VTO=-0.9 KP=20 RD=0.02 RS=0.02 CGSO=1n CGDO=0.3n IS=1e-12)
.model NMOS_AO3400 NMOS (LEVEL=1 VTO=1.0 KP=30 RD=0.01 RS=0.01 CGSO=0.8n CGDO=0.2n)
.model DSCH D (IS=3e-6 RS=0.08 N=1.05 CJO=100p)   ; B5819W angenaehert (Vf ~0.35 V @ 200 mA)
.model DSIG D (IS=2.5e-9 RS=0.6 N=1.9 CJO=2p)     ; 1N4148W
.model DBODY D (IS=1e-10 RS=0.05 N=1.2)
"""
# LDO XC6206 als Verhaltensmodell: Vout=min(3.3, Vin-Rdo*I), Rdo aus Dropout 250 mV @100 mA (QUELLE Datenblatt C5446)
LDO = "B_LDO 3v3i 0 V = min(3.3, max(0, V(vsw) - 0.15 - 2.5*I(Vsense)))\nR_LDOo 3v3i 3v3s 0.05\nVsense 3v3s 3v3 0\n"
SIMS = {
 'powerpath': ("Power-Path: USB ein (1 ms) / aus (6 ms), Last 3V3 30 mA + Motor 80 mA ab 3 ms", f"""
VBUS vbus_src 0 PWL(0 0 1m 0 1.05m 5 6m 5 6.05m 0)
Rusb vbus_src vbus 0.2
R9 vbus 0 100k
C1 vbus 0 10u
D1 vbus vsys DSCH
* Q1 AO3401A: D=vbat S=vsys G=vbus, Body-Diode vbat->vsys
M1 vbat vbus vsys vsys PMOS_AO3401
DB1 vbat vsys DBODY
Vbat vbatc 0 3.7
Rbat vbatc vbat 0.15
C2 vbat 0 10u
C4 vsys 0 10u
* Q2 Ein/Aus (eingeschaltet, Gate auf GND)
M2 vsw 0 vsys vsys PMOS_AO3401
C5 vsw 0 4.7u
{LDO}C7 3v3 0 6u
Iload 3v3 0 30m
Rmot vsw motd 25
Smot motd 0 mctl 0 SW1
Vmc mctl 0 PWL(0 0 3m 0 3.001m 1)
.model SW1 SW(VT=0.5 RON=0.1 ROFF=1e8)
.tran 2u 9m
.control
run
wrdata {S}powerpath.csv v(vbus) v(vsys) v(vbat) v(3v3) i(Vbat)
meas tran vsys_min_unplug MIN v(vsys) from=6m to=9m
meas tran v3_min_unplug MIN v(3v3) from=6m to=9m
meas tran vsys_usb AVG v(vsys) from=2m to=2.9m
meas tran vsys_bat AVG v(vsys) from=0.5m to=0.9m
meas tran ibat_usb AVG i(Vbat) from=4m to=5.9m
meas tran v3_min_motor MIN v(3v3) from=3m to=4m
.endc
.end"""),
 'inrush': ("Einschaltstrom: SW1 schaltet Gate Q2 auf GND bei 0.1 ms (Gate R10 1M + Cgs)", f"""
Vbat vbatc 0 4.2
Rbat vbatc vsys 0.15
C4 vsys 0 10u IC=4.2
R10 vsys g 1Meg
Sg g 0 sctl 0 SW1
Vsc sctl 0 PWL(0 0 0.1m 0 0.1001m 1)
.model SW1 SW(VT=0.5 RON=50 ROFF=1e9)
M2 vsw g vsys vsys PMOS_AO3401
C5 vsw 0 4.7u
{LDO}C7 3v3 0 16.8u
Iload 3v3 0 10m
.tran 0.2u 1m UIC
.control
run
wrdata {S}inrush.csv v(vsw) v(3v3) i(Vbat)
meas tran i_peak MIN i(Vbat) from=0.1m to=1m
meas tran t_3v3 WHEN v(3v3)=3.0 RISE=1
.endc
.end"""),
 'buzzer_motor': ("Summer 2.7 kHz PWM ab 0.5 ms, Motor (25 ohm, 30 uH) ein bei 2 ms, aus bei 4 ms; Batterie 3.5 V", f"""
Vbat vbatc 0 3.5
Rbat vbatc vsw 0.25
C5 vsw 0 4.7u
{LDO}C7 3v3 0 16.8u
Iload 3v3 0 15m
* Summer: 3V3 -> L/R (MLT-5020 ~16 ohm, ANNAHME 0.1 mH) -> R15 22 -> Q6
Lbz 3v3 bzm 100u
Rbz bzm buzn 16
D2 buzn 3v3 DSIG
R15 buzn buzd 22
M6 buzd pwm 0 0 NMOS_AO3400
Vpwm pwm 0 PULSE(0 3.3 0.5m 20n 20n 185u 370u)
* Motor an VSW
Lm vsw m1 30u
Rm m1 motn 25
D3 motn vsw DSIG
M7 motn men 0 0 NMOS_AO3400
Vmen men 0 PWL(0 0 2m 0 2.001m 3.3 4m 3.3 4.001m 0)
.tran 0.5u 5m
.control
run
wrdata {S}buzzer_motor.csv v(vsw) v(3v3) v(motn) v(buzn)
meas tran v3_min MIN v(3v3) from=0.4m to=5m
meas tran vsw_min MIN v(vsw) from=0.4m to=5m
meas tran motn_max MAX v(motn) from=3.9m to=5m
meas tran buzn_max MAX v(buzn) from=0.4m to=2m
.endc
.end"""),
 'vbat_div': ("Batteriemessteiler: VBAT_EN 0->3.3 V bei 1 ms, aus bei 36 ms, Ausgang Teiler + 100 nF, SAADC-Last", f"""
Vbat vbat 0 4.2
R11 vbat g 1Meg
M4 top g vbat vbat PMOS_AO3401
M5 g en 0 0 NMOS_AO3400
Ven en 0 PWL(0 0 1m 0 1.001m 3.3 36m 3.3 36.001m 0)
R13 top adc 100k
R14 adc 0 100k
C13 adc 0 100n
.tran 10u 45m
.control
run
wrdata {S}vbat_div.csv v(adc) i(Vbat)
meas tran vadc_settled AVG v(adc) from=33m to=35.9m
meas tran t_settle WHEN v(adc)=2.079 RISE=1
meas tran ioff AVG i(Vbat) from=0.2m to=0.9m
meas tran ion AVG i(Vbat) from=33m to=35.9m
.endc
.end"""),
}
res = {}
for k, (title, body) in SIMS.items():
    net = S + k + '.cir'; open(net, 'w').write(f'* {title}\n' + MOD + body + '\n')
    out = subprocess.run(['ngspice', '-b', net], capture_output=True, text=True)
    open(S + k + '.log', 'w').write(out.stdout + out.stderr)
    m = {}
    for l in out.stdout.splitlines():
        p = l.split()
        if len(p) >= 3 and p[1] == '=' and p[0] in body:
            try: m[p[0]] = float(p[2])
            except ValueError: pass
    res[k] = m
    d = np.loadtxt(S + k + '.csv'); n = d.shape[1] // 2
    fig, ax = plt.subplots(n, 1, figsize=(8, 2 * n), sharex=True)
    names = body.split('wrdata')[1].split('\n')[0].split()[1:]
    for i in range(n):
        ax[i].plot(d[:, 0] * 1e3, d[:, 2 * i + 1]); ax[i].set_ylabel(names[i], fontsize=8); ax[i].grid(alpha=.3)
    ax[-1].set_xlabel('t [ms]'); fig.suptitle(title, fontsize=9); fig.tight_layout(); fig.savefig(S + k + '.png', dpi=90); plt.close(fig)
json.dump(res, open(S + 'results.json', 'w'), indent=1)
print(json.dumps(res, indent=1))
