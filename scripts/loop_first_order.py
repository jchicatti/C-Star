#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Simulación didáctica: lazo abierto vs. lazo cerrado (PI/PID) en planta de 1er orden
# Modelo: tau * x_dot + x = K * u,  |u| <= Umax
#
# ENTRADA (stdin, JSON):
# {
#   "mode": "arm" | "drive" | "motor",
#   "ref": <float>,
#   "t": <float opcional>,
#   "Umax": <float opcional>, "K": <float opcional>, "tau": <float opcional>,
#   "Kp": <float opcional>, "Ki": <float opcional>, "Kd": <float opcional>,
#   "dt": <float opcional>,
#   "out": <ruta opcional para PNG>
# }
#
# SALIDA (stdout, JSON):
# { "img": "<png>", "metrics": {...} }
#
# ERRORES (stderr, parseables por JS):
#   EBADJSON:...
#   EBADPARAMS:MODE
#   EBADPARAMS:REF
#   EBADPARAMS:T_NONPOS t=...
#   EBADPARAMS:DT_NONPOS dt=...
#   ETOO_MANY_STEPS steps=... t=... dt=...
#
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
loop_first_order.py  — v1.1
Cambios:
- Lazo abierto ahora muestra la RESPUESTA NATURAL de primer orden al escalón (no una línea constante).
- El escalón abierto se satura por ±Umax: u_open = clip(ref, ±Umax).
- Se reporta 'reachable' y 'deficit' (si ref supera K·Umax en magnitud).
- Mantiene interfaz I/O previa: lee JSON por stdin, devuelve {img, metrics}.
"""

import json, sys, os, math
import numpy as np
import matplotlib.pyplot as plt

def safe_float(x, default=None):
    try:
        return float(x)
    except Exception:
        return default

def step_metrics(t, y, ref, tol=0.02):
    """Métricas básicas para escalón."""
    y = np.asarray(y); t = np.asarray(t)
    y_final = float(y[-1])
    e_ss = y_final - ref
    e_rel_pct = (e_ss/ref*100.0) if ref not in (0, 0.0) else None
    y_max = float(np.max(y))
    # sobreimpulso relativo a ref (si ref=0, usar 0)
    overshoot_pct = 0.0
    if ref != 0:
        overshoot_pct = max(0.0, (y_max - ref) / abs(ref) * 100.0)
    # tiempo de establecimiento 2%
    lower, upper = ref*(1-tol), ref*(1+tol)
    ts = None
    for i in range(len(y)-1, -1, -1):
        if not (lower <= y[i] <= upper):
            j = i+1
            ts = float(t[j]) if j < len(t) else None
            break
    return {
        "y_final": y_final,
        "e_ss": float(e_ss),
        "e_rel_pct": (None if e_rel_pct is None else float(e_rel_pct)),
        "overshoot_pct": float(overshoot_pct),
        "ts": ts
    }

def main():
    # -------- leer payload --------
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error":"EBADJSON","message":"invalid json"}))
        return

    # defaults (mantengo tus nombres)
    mode = payload.get("mode","arm")                 # 'arm'|'drive'|'motor'
    ref  = safe_float(payload.get("ref"), 1.0)
    Umax = safe_float(payload.get("Umax"), 1.0)
    K    = safe_float(payload.get("K"),   1.0)
    tau  = safe_float(payload.get("tau"), 0.6)
    Kp   = safe_float(payload.get("Kp"),  1.0)
    Ki   = safe_float(payload.get("Ki"),  0.4)
    Kd   = safe_float(payload.get("Kd"),  0.0)
    T    = safe_float(payload.get("t"),   6.0)
    dt   = safe_float(payload.get("dt"),  0.01)

    # validaciones mínimas (conservar códigos que usas)
    if tau is None or tau <= 0 or dt is None or dt <= 0:
        print(json.dumps({"error":"LOOP_BAD_T","message":"tau and dt must be > 0"}))
        return
    steps = int(round(T/dt))
    if steps < 20 or steps > 2000000:
        print(json.dumps({"error":"LOOP_TOO_MANY_STEPS","message":"T/dt out of practical bounds"}))
        return

    # -------- simulación cerrada (PID sencillo con saturación) --------
    t = np.linspace(0.0, T, steps+1)
    x = np.zeros_like(t)
    u = np.zeros_like(t)
    integ = 0.0
    prev_e = 0.0

    for k in range(len(t)-1):
        e = ref - x[k]
        de = (e - prev_e)/dt
        prev_e = e
        # control sin saturar
        u_unsat = Kp*e + Ki*integ + Kd*de
        # saturación
        u[k] = max(-Umax, min(Umax, u_unsat))
        # integral (sin anti-windup — comportamiento original)
        integ += e*dt
        # planta: tau xdot + x = K u
        xdot = -(1.0/tau)*x[k] + (K/tau)*u[k]
        x[k+1] = x[k] + dt*xdot
    u[-1] = u[-2]

    # -------- lazo abierto: RESPUESTA NATURAL --------
    # entrada de lazo abierto: un escalón limitado por ±Umax
    u_open = max(-Umax, min(Umax, ref))
    x_open = (K*u_open) * (1.0 - np.exp(-t/tau))   # curva natural 1er orden
    x_ss_open = float(K * u_open)

    # -------- métricas --------
    m_closed = step_metrics(t, x, ref)
    sat_time = float(np.sum(np.abs(u) >= Umax - 1e-12) * dt)

    # alcanzabilidad (según potencia disponible abierta)
    reachable = (abs(ref) <= abs(K*Umax))
    deficit = float(ref - K*Umax) if ref >= 0 else float(ref + K*Umax)

    metrics = {
        "mode": mode,
        "ref": float(ref),
        "Umax": float(Umax),
        "K": float(K),
        "tau": float(tau),
        "Kp": float(Kp),
        "Ki": float(Ki),
        "Kd": float(Kd),
        # abierto (natural)
        "x_ss_open": float(x_ss_open),
        "reachable": bool(reachable),
        "deficit": float(deficit),
        # cerrado
        "x_final_closed": float(m_closed["y_final"]),
        "ts": (None if m_closed["ts"] is None else float(m_closed["ts"])),
        "overshoot_pct": float(m_closed["overshoot_pct"]),
        "sat_time": float(sat_time)
    }

    # -------- figura --------
    sym = "θ" if mode=="arm" else ("v" if mode=="drive" else "ω")
    unit = "rad" if mode=="arm" else ("m/s" if mode=="drive" else "rad/s")

    plt.figure(figsize=(9,6))
    plt.plot(t, np.ones_like(t)*ref, 'k--', label='referencia')
    plt.plot(t, x_open, label='abierto (respuesta natural)')
    plt.plot(t, x, label='cerrado (PID)')
    plt.title(f"lazo abierto vs cerrado · {mode}")
    plt.xlabel("tiempo [s]"); plt.ylabel(f"{sym} [{unit}]")
    # línea horizontal en x_ss (potencia abierta)
    plt.axhline(y=x_ss_open, linestyle=':', linewidth=1.8, label=f'x_ss = K·Umax = {x_ss_open:.2f}')

    # opcional: sombrear déficit si no alcanzable (ref por encima de x_ss_open)
    if not reachable:
        y1, y2 = (x_ss_open, ref) if ref > x_ss_open else (ref, x_ss_open)
        plt.fill_between(t, y1, y2, alpha=0.07, step='pre', label='déficit vs referencia')
    plt.grid(True); plt.legend()
    outdir = os.environ.get("LOOP_OUTDIR","/mnt/data")
    os.makedirs(outdir, exist_ok=True)
    img = os.path.join(outdir, f"loop_{mode}.png")
    plt.savefig(img, dpi=140, bbox_inches='tight')
    plt.close()

    print(json.dumps({"img": img, "metrics": metrics}))

if __name__ == "__main__":
    main()