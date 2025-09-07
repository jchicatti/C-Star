#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
step_second_order.py
Simula un sistema de 2º orden con PID ante un escalón A.
Entrada: JSON por stdin con A, Kp, Ki, Kd, t, dt, zeta, wn.
Salida: JSON con {"img": <ruta_png>, "metrics": {...}}.
"""

import json, sys, os
import numpy as np
import matplotlib.pyplot as plt

def _safe_float(x, d=None):
    try:
        v = float(x)
        return v
    except:
        return d

def _metrics(t, y, A, band_rel=0.02, band_abs=0.02):
    t = np.asarray(t); y = np.asarray(y)
    target = A
    # tiempo de subida tr (10%→90% del objetivo con signo)
    tr = None
    if abs(target) > 1e-12:
        y10 = 0.1*target
        y90 = 0.9*target
        # indices donde cruza 10% y 90% en dirección al objetivo
        try:
            i10 = np.where((y - 0.0)*np.sign(target) >= y10*np.sign(target))[0][0]
            i90 = np.where((y - 0.0)*np.sign(target) >= y90*np.sign(target))[0][0]
            tr = float(t[i90] - t[i10])
        except:
            tr = None

    # sobreimpulso Mp (%)
    Mp = None
    if abs(target) > 1e-12:
        if target > 0:
            peak = float(np.max(y))
            Mp = max(0.0, (peak - target)/abs(target)*100.0)
        else:
            trough = float(np.min(y))
            Mp = max(0.0, (abs(trough) - abs(target))/abs(target)*100.0)

    # tiempo de establecimiento ts con banda ±2% y piso absoluto
    band = max(band_rel*abs(target), band_abs)
    low = target - band
    up  = target + band

    ts = None
    last_out = None
    for i in range(len(t)-1, -1, -1):
        if not (low <= y[i] <= up):
            last_out = i
            break
    if last_out is not None:
        j = last_out + 1
        if j < len(t):
            ts = float(t[j])

    # error estacionario como promedio en el último 10% del intervalo
    N = len(t)
    i0 = int(max(0, 0.9*N))
    ess = float(np.mean(target - y[i0:]))

    return dict(tr=tr, Mp=Mp, ts=ts, ess=ess)

def main():
    # leer json
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error":"EBADJSON","message":"invalid json"}))
        return

    # defaults
    A   = _safe_float(payload.get("A"),   1.0)
    Kp  = _safe_float(payload.get("Kp"),  1.0)
    Ki  = _safe_float(payload.get("Ki"),  0.0)
    Kd  = _safe_float(payload.get("Kd"),  0.0)
    T   = _safe_float(payload.get("t"),   8.0)
    dt  = _safe_float(payload.get("dt"),  0.01)
    z   = _safe_float(payload.get("zeta"), 0.5)
    wn  = _safe_float(payload.get("wn"),   2.0)

    # validaciones
    if T is None or T <= 0:
        print(json.dumps({"error":"STEP_BAD_T","message":"t must be > 0"})); return
    if dt is None or dt <= 0:
        print(json.dumps({"error":"STEP_BAD_DT","message":"dt must be > 0"})); return
    if z is None or z < 0:
        print(json.dumps({"error":"STEP_BAD_ZETA","message":"zeta must be >= 0"})); return
    if wn is None or wn <= 0:
        print(json.dumps({"error":"STEP_BAD_WN","message":"wn must be > 0"})); return

    steps = int(round(T/dt))
    if steps < 20 or steps > 2_000_000:
        print(json.dumps({"error":"STEP_TOO_MANY_STEPS","message":"steps out of bounds","meta":{"steps":steps,"t":T,"dt":dt}})); return

    # tiempo y referencia
    tvec = np.linspace(0.0, T, steps+1)
    r = np.ones_like(tvec) * A

    # integración (planta 2º orden en forma estándar con PID en lazo unitario)
    x = np.zeros_like(tvec)   # posición / salida
    xdot = 0.0
    integ = 0.0
    prev_e = 0.0
    u = np.zeros_like(tvec)

    for k in range(len(tvec)-1):
        e = r[k] - x[k]
        de = (e - prev_e)/dt
        prev_e = e

        # PID sin saturación en @step
        ui = integ + e*dt
        u[k] = Kp*e + Ki*ui + Kd*de
        integ = ui

        # planta: x'' + 2ζωn x' + ωn^2 x = ωn^2 u
        xdd = -2.0*z*wn*xdot - (wn**2)*x[k] + (wn**2)*u[k]
        xdot = xdot + dt*xdd
        x[k+1] = x[k] + dt*xdot

    u[-1] = u[-2]

    # métricas
    m = _metrics(tvec, x, A)
    metrics = dict(
        A=float(A), Kp=float(Kp), Ki=float(Ki), Kd=float(Kd),
        t=float(T), dt=float(dt), zeta=float(z), wn=float(wn),
        tr=(None if m["tr"] is None else float(m["tr"])),
        Mp=(None if m["Mp"] is None else float(m["Mp"])),
        ts=(None if m["ts"] is None else float(m["ts"])),
        ess=float(m["ess"]),
        y_final=float(x[-1]),
        u_peak=float(np.max(np.abs(u)))
    )

    # figura
    plt.figure(figsize=(10,6))
    plt.plot(tvec, r, 'k--', alpha=0.8, label='referencia A')
    plt.plot(tvec, x, label='salida (PID)')
    plt.title('respuesta al escalón · planta 2º orden + PID')
    plt.xlabel('tiempo [s]')
    plt.ylabel('salida')
    plt.grid(True); plt.legend()

    outdir = os.environ.get("STEP_OUTDIR","/mnt/data")
    os.makedirs(outdir, exist_ok=True)
    img_path = os.path.join(outdir, "step.png")
    plt.savefig(img_path, dpi=140, bbox_inches='tight')
    plt.close()

    print(json.dumps({"img": img_path, "metrics": metrics}))

if __name__ == "__main__":
    main()