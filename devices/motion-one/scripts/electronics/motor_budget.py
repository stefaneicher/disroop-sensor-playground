"""BERECHNUNG Leistungsbudget mit Motor LCM0827A3038F (C2759981) + Worst-Case alle Verbraucher. Ausgabe electronics/analysis/motor_budget.json"""
import json
# QUELLE Datenblatt LCM0827A3038F (electronics/datasheets/): 3.0 V nenn, 2.7-3.3 V, I_nenn <= 80 mA, I_start <= 120 mA, R 30 Ohm +-15 %
R_min = 30 * 0.85
I_run, I_start = 80.0, 120.0
cap = 500 * 0.8                                  # mAh nutzbar (ANNAHME wie bisher)
base = {'nrf_mittel': 5.0, 'imu': 0.6, 'ldo_iq': 0.001, 'rgb_mittel': 1.0}   # mA, wie ANALYSE_V1 §1
buz_peak = 87.0                                  # mA Spitze (ANALYSE §8)
buz_mean_on = buz_peak * 0.5                     # PWM 50 % -> 43.5 mA waehrend Ton (ANNAHME)
buz_duty = 0.02                                  # ANNAHME 2 % Tonanteil
buz = buz_mean_on * buz_duty
sens = {}
for d in (0.05, 0.10, 0.20):
    mot = I_run * d                              # Motor per PWM auf 3.0 V Mittel begrenzt (Firmware)
    tot = sum(base.values()) + buz + mot
    sens[f'{int(d*100)}%'] = {'motor_mA': round(mot, 2), 'summe_mA': round(tot, 2), 'laufzeit_h': round(cap / tot, 1)}
# Worst Case gleichzeitig (Spitzen)
nrf_wc = 32.7 + 6.3                              # ANNAHME nRF52840 PS: TX +8 dBm LDO-Modus ~32.7 mA + CPU 64 MHz LDO ~6.3 mA
i3v3 = nrf_wc + 0.6 + 3 * 4.0 + buz_peak         # mA ueber LDO
wc = {}
for vb in (3.5, 3.3, 4.2):
    v3 = min(3.3, vb - 2.5 * i3v3 / 1000)        # R_DO 2.5 Ohm (ANNAHME ANALYSE §3)
    im = vb / R_min * 1000                       # Anlauf (Stillstand) ohne PWM, worst
    wc[str(vb)] = {'i_3v3_mA': round(i3v3, 1), 'v_3v3': round(v3, 3), 'i_motor_start_mA': round(im, 1), 'i_bat_mA': round(i3v3 + im, 1)}
dw_ocp = 0.15 / (2 * 0.028)                      # ANNAHME DW01A V_OCP 150 mV, FS8205A 2x28 mOhm @ VGS~3.5 V
vbus_vsys = 4.87                                 # SIMULATION powerpath
usb = {'charge_mA': 281, 'chrg_led_mA': 3, 'i_3v3_mA': round(i3v3, 1), 'motor_start_at_vsys_mA': round(vbus_vsys / R_min * 1000, 1),
       'motor_pwm3V_start_mA': I_start}
usb['vbus_worst_noPWM_mA'] = round(usb['charge_mA'] + 3 + i3v3 + usb['motor_start_at_vsys_mA'], 1)
usb['vbus_worst_PWM_mA'] = round(usb['charge_mA'] + 3 + i3v3 + I_start, 1)
usb['vbus_typ_mA'] = round(255 + 3 + 39 + 0.6 + 12 + buz_mean_on + I_run, 1)
out = {'sens': sens, 'buzzer_mA': round(buz, 2), 'base_mA': round(sum(base.values()), 3), 'worst': wc, 'dw01a_ocp_A': round(dw_ocp, 2), 'usb': usb}
json.dump(out, open('electronics/analysis/motor_budget.json', 'w'), indent=1); print(json.dumps(out, indent=1))
