#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Respuesta al escalón de un sistema de segundo orden con PID (lazo unitario)
# Planta canónica: G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2)
#
# ENTRADA (stdin JSON, todos opcionales):
# {
#   "A":   float   amplitud del escalón (default 1.0)
#   "Kp":  float   (default 1.0)
#   "Ki":  float   (default 0.0)
#   "Kd":  float   (default 0.0)
#   "t":   float   duración simulación en s (default 8.0)  (must > 0)
#   "dt":  float   paso en s (default 0.01)                (must > 0)
#   "zeta":float   amortiguamiento (default 0.5)           (must >= 0)
#   "wn":  float   frecuencia natural rad/s (default 2.0)  (must > 0)
#   "out": string  ruta del PNG a guardar
# }
#
# SALIDA (stdout JSON):
# {
#   "img": "<ruta_png>",
#   "metrics": {
#     "A":..., "Kp":..., "Ki":..., "Kd":..., "zeta":..., "wn":...,
#     "t":..., "dt":..., "steps":...,
#     "tr": <tiempo de subida 10-90%> | null,
#     "Mp": <sobreimpulso %> | null,
#     "ts": <tiempo establecimiento 2%> | null,
#     "ess": <error estacionario A - y_final>,
#     "y_final":..., "u_peak":...
#   }
# }
#
# ERRORES (stderr):
#   EBADJSON:...
#   EBADPARAMS:T_NONPOS t=...
#   EBADPARAMS:DT_NONPOS dt=...
#   EBADPARAMS:ZETA zeta=...
#   EBADPARAMS:WN wn=...
#   ETOO_MANY_STEPS steps=... t=... dt=...
#
import sys, json, math

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
except Exception as e:
    sys.stderr.write(f"EPY_MPL:{e}\n"); sys.exit(2)

def read_payload():
    try:
        raw = sys.stdin.read().strip()
        return json.loads(raw or "{}")
    except Exception as e:
        sys.stderr.write(f"EBADJSON:{e}\n"); sys.exit(2)

def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v

def simulate(A, Kp, Ki, Kd, t, dt, zeta, wn, out_png=None):
    if t <= 0:
        sys.stderr.write(f"EBADPARAMS:T_NONPOS t={t}\n"); sys.exit(2)
    if dt <= 0:
        sys.stderr.write(f"EBADPARAMS:DT_NONPOS dt={dt}\n"); sys.exit(2)
    if zeta < 0:
        sys.stderr.write(f"EBADPARAMS:ZETA zeta={zeta}\n"); sys.exit(2)
    if wn <= 0:
        sys.stderr.write(f"EBADPARAMS:WN wn={wn}\n"); sys.exit(2)

    steps = int(round(t / dt))
    if steps > 200_000:
        sys.stderr.write(f"ETOO_MANY_STEPS steps={steps} t={t} dt={dt}\n"); sys.exit(2)

    # estado de la planta: y, y_dot  (y'' = wn^2*(u - y) - 2 zeta wn y')
    y = 0.0; ydot = 0.0

    # controlador PID (forma paralela)
    ei = 0.0
    # derivada numérica del error (backward)
    e_prev = A - y

    tvec  = [0.0]*(steps+1)
    yvec  = [0.0]*(steps+1)
    uvec  = [0.0]*(steps+1)
    yvec[0] = y; uvec[0] = 0.0

    for k in range(steps):
        tnow = k*dt
        tvec[k] = tnow

        e = A - y
        ei += e*dt
        ed = (e - e_prev)/dt
        e_prev = e

        u = Kp*e + Ki*ei + Kd*ed
        uvec[k] = u

        # integrar planta
        yddot = (wn*wn)*(u - y) - 2.0*zeta*wn*ydot
        ydot  = ydot + dt*yddot
        y     = y + dt*ydot
        yvec[k+1] = y

    tvec[-1] = steps*dt
    uvec[-1] = uvec[-2] if steps >= 1 else 0.0

    # métricas
    y_final = yvec[-1]
    ess = A - y_final

    # tiempo de subida (10-90%)
    tr = None
    if abs(A) > 1e-12:
        y10 = 0.1*A; y90 = 0.9*A
        t10 = None; t90 = None
        # asume A>0; si A<0, invierte los umbrales
        if A < 0:
            y10, y90 = 0.9*A, 0.1*A
        for k, yk in enumerate(yvec):
            if t10 is None and ((A>0 and yk >= y10) or (A<0 and yk <= y10)):
                t10 = tvec[k]
            if t90 is None and ((A>0 and yk >= y90) or (A<0 and yk <= y90)):
                t90 = tvec[k]
                break
        if t10 is not None and t90 is not None:
            tr = t90 - t10

    # sobreimpulso %
    Mp = None
    if abs(A) > 1e-12:
        if A > 0:
            ymax = max(yvec)
            Mp = 100.0 * max(0.0, (ymax - A)/abs(A))
        else:
            ymin = min(yvec)
            Mp = 100.0 * max(0.0, (A - ymin)/abs(A))

    # tiempo de establecimiento 2%
    band = max(0.02*abs(A), 0.02)  # banda absoluta mínima 0.02
    ts = None
    for k in range(steps+1):
        if all(abs(yvec[j] - A) <= band for j in range(k, steps+1)):
            ts = tvec[k]
            break

    u_peak = max(abs(uv) for uv in uvec)

    # gráfico
    out = out_png or "step_out.png"
    plt.figure(figsize=(6,4))
    plt.plot(tvec, yvec, linewidth=2, label="salida y(t)")
    plt.axhline(A, color='k', linewidth=1, alpha=0.35, label='referencia')
    # ejes
    ymin = min(min(yvec), A); ymax = max(max(yvec), A)
    pad = max(0.05*(ymax - ymin), 0.05)
    plt.ylim(ymin - pad, ymax + pad)
    plt.xlabel("tiempo [s]"); plt.ylabel("salida")
    plt.title("respuesta al escalón · planta 2º orden + PID")
    plt.grid(True, alpha=0.3); plt.legend(); plt.tight_layout()
    plt.savefig(out, dpi=150); plt.close()

    metrics = {
        "A": float(A), "Kp": float(Kp), "Ki": float(Ki), "Kd": float(Kd),
        "zeta": float(zeta), "wn": float(wn),
        "t": float(t), "dt": float(dt), "steps": int(steps),
        "tr": None if tr is None else float(tr),
        "Mp": None if Mp is None else float(Mp),
        "ts": None if ts is None else float(ts),
        "ess": float(ess), "y_final": float(y_final),
        "u_peak": float(u_peak)
    }
    return out, metrics

def main():
    p = read_payload()
    # defaults didácticos
    A    = float(p.get("A", 1.0))
    Kp   = float(p.get("Kp", 1.0))
    Ki   = float(p.get("Ki", 0.0))
    Kd   = float(p.get("Kd", 0.0))
    t    = float(p.get("t", 8.0))
    dt   = float(p.get("dt", 0.01))
    zeta = float(p.get("zeta", 0.5))
    wn   = float(p.get("wn", 2.0))
    out  = p.get("out") or None

    img, metrics = simulate(A, Kp, Ki, Kd, t, dt, zeta, wn, out)
    print(json.dumps({"img": img, "metrics": metrics}))

if __name__ == "__main__":
    main()