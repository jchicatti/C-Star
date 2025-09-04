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
import sys, json, math

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
except Exception as e:
    sys.stderr.write(f"EPY_MPL:{e}\n"); sys.exit(2)

DEFAULTS = {
    #            Umax,  K,   tau,   Kp,  Ki,   Kd,   t,   dt
    "arm":   { "Umax": 1.0, "K": 1.0, "tau": 0.5, "Kp": 1.2, "Ki": 0.6, "Kd": 0.0, "t": 6.0, "dt": 0.01 },
    "drive": { "Umax": 0.5, "K": 1.0, "tau": 0.6, "Kp": 1.0, "Ki": 0.5, "Kd": 0.0, "t": 8.0, "dt": 0.01 },
    "motor": { "Umax": 5.0, "K": 1.0, "tau": 0.5, "Kp": 1.0, "Ki": 0.4, "Kd": 0.0, "t": 6.0, "dt": 0.01 },
}

def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v

def parse_payload():
    try:
        raw = sys.stdin.read().strip()
        data = json.loads(raw or "{}")
        return data
    except Exception as e:
        sys.stderr.write(f"EBADJSON:{e}\n"); sys.exit(2)

def simulate(mode, ref, t=None, Umax=None, K=None, tau=None, Kp=None, Ki=None, Kd=None, dt=None, out_png=None):
    cfg  = DEFAULTS[mode]
    Umax = float(Umax if Umax is not None else cfg["Umax"])
    K    = float(K    if K    is not None else cfg["K"])
    tau  = float(tau  if tau  is not None else cfg["tau"])
    Kp   = float(Kp   if Kp   is not None else cfg["Kp"])
    Ki   = float(Ki   if Ki   is not None else cfg["Ki"])
    Kd   = float(Kd   if Kd   is not None else cfg["Kd"])
    T    = float(t    if t    is not None else cfg["t"])
    dt   = float(dt   if dt   is not None else cfg["dt"])

    if T <= 0:
        sys.stderr.write(f"EBADPARAMS:T_NONPOS t={T}\n"); sys.exit(2)
    if dt <= 0:
        sys.stderr.write(f"EBADPARAMS:DT_NONPOS dt={dt}\n"); sys.exit(2)

    steps = int(round(T / dt))
    if steps > 200_000:
        sys.stderr.write(f"ETOO_MANY_STEPS steps={steps} t={T} dt={dt}\n"); sys.exit(2)

    # Hacemos que el abierto empuje hacia el signo de la referencia
    sign_ref = 0.0
    if ref > 0: sign_ref = 1.0
    elif ref < 0: sign_ref = -1.0

    # Buffers
    tvec   = [0.0] * (steps + 1)
    x_open = [0.0] * (steps + 1)
    x_pid  = [0.0] * (steps + 1)

    # Estado del controlador (cerrado)
    ei = 0.0
    e_prev = ref - x_pid[0]
    sat_time = 0.0

    for k in range(steps):
        tk = k * dt
        tvec[k] = tk

        # --- Abierto (u = const) ---
        u_open = sign_ref * Umax
        xdot_o = (K * u_open - x_open[k]) / tau
        x_open[k+1] = x_open[k] + dt * xdot_o

        # --- Cerrado (PID) ---
        e = ref - x_pid[k]
        ei += e * dt
        ed = (e - e_prev) / dt
        e_prev = e
        u_cmd = Kp * e + Ki * ei + Kd * ed
        u_sat = clamp(u_cmd, -Umax, Umax)
        if abs(u_sat - u_cmd) > 1e-12:
            sat_time += dt
        xdot_c = (K * u_sat - x_pid[k]) / tau
        x_pid[k+1] = x_pid[k] + dt * xdot_c

    tvec[-1] = steps * dt

        # --- métricas ---
    xss_open = K * Umax * (1.0 if ref > 0 else -1.0 if ref < 0 else 0.0)
    xfinal   = x_pid[-1]
    # tiempo de establecimiento (2% relativo o 0.02 absoluto si ref≈0)
    band = max(0.02 * abs(ref), 0.02)
    ts = None
    for k in range(steps + 1):
        if all(abs(x_pid[j] - ref) <= band for j in range(k, steps + 1)):
            ts = k * dt
            break
    overshoot = None
    if abs(ref) > 1e-12:
        xmax = max(x_pid) if ref > 0 else min(x_pid)
        overshoot = 100.0 * ((xmax - ref) / abs(ref))

    # --- plot: abierto como línea horizontal + cerrado PID + referencia ---
    out = out_png or f"loop_{mode}.png"
    plt.figure(figsize=(6,4))
    # 1) lazo abierto (línea horizontal en x_ss_open)
    plt.axhline(xss_open, linestyle='--', linewidth=2, alpha=0.9,
                label=f"abierto (x_ss={xss_open:.2f})")
    # 2) lazo cerrado (PID)
    plt.plot(tvec, x_pid, linewidth=2, label="cerrado (PID)")
    # 3) referencia
    plt.axhline(ref, color='k', linewidth=1, alpha=0.35, label='referencia')
    # 4) límites de eje y con margen
    ymin = min(min(x_pid), xss_open, ref)
    ymax = max(max(x_pid), xss_open, ref)
    pad = max(0.05*(ymax - ymin), 0.05)
    plt.ylim(ymin - pad, ymax + pad)
    plt.grid(True, alpha=0.3)
    plt.xlabel("tiempo [s]")
    ylbl = {"arm":"θ [rad]", "drive":"v [m/s]", "motor":"ω [rad/s]"}[mode]
    plt.ylabel(ylbl)
    plt.title(f"lazo abierto vs cerrado · {mode}")
    plt.legend()
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()

    # --- diagnóstico de alcanzabilidad y paquete de métricas completo ---
    reachable = (abs(ref) <= abs(xss_open) + 1e-9)
    deficit = ref - xss_open  # positivo si “falta potencia” para llegar

    metrics = {
        "mode": str(mode),
        "ref": float(ref),
        "Umax": float(Umax), "K": float(K), "tau": float(tau),
        "Kp": float(Kp), "Ki": float(Ki), "Kd": float(Kd),
        "t": float(T), "dt": float(dt), "steps": int(steps),
        "x_ss_open": float(xss_open),
        "x_final_closed": float(xfinal),
        "ts": None if ts is None else float(ts),
        "overshoot_pct": None if overshoot is None else float(overshoot),
        "sat_time": float(sat_time),
        "reachable": bool(reachable),
        "deficit": float(deficit)
    }
    return out, metrics

def main():
    payload = parse_payload()
    mode = (payload.get("mode") or "").lower()
    if mode not in ("arm", "drive", "motor"):
        sys.stderr.write("EBADPARAMS:MODE mode must be arm|drive|motor\n"); sys.exit(2)

    try:
        ref = float(payload.get("ref"))
    except Exception:
        sys.stderr.write("EBADPARAMS:REF ref must be numeric\n"); sys.exit(2)

    # opcionales
    t    = payload.get("t", None)
    Umax = payload.get("Umax", None)
    K    = payload.get("K", None)
    tau  = payload.get("tau", None)
    Kp   = payload.get("Kp", None)
    Ki   = payload.get("Ki", None)
    Kd   = payload.get("Kd", None)
    dt   = payload.get("dt", None)
    out_png = payload.get("out") or None

    img, metrics = simulate(mode, ref, t, Umax, K, tau, Kp, Ki, Kd, dt, out_png)
    print(json.dumps({"img": img, "metrics": metrics}))

if __name__ == "__main__":
    main()