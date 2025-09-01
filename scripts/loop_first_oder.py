#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Simulación didáctica: lazo abierto vs. lazo cerrado (PI) en planta 1er orden
# Modelo: tau * x_dot + x = K * u,  |u| <= Umax
# Entradas por stdin (JSON): { "mode": "arm|drive|motor", "ref": <float>, "t": <float opcional>, "out": <png opcional> }
# Salida por stdout (JSON): { "img": <png>, "metrics": {...} }
# Errores por stderr (parseables):
#   EBADJSON:...
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
    #            Umax,  K,   tau,   Kp,  Ki,   t,   dt
    "arm":   { "Umax": 1.0, "K": 1.0, "tau": 0.5, "Kp": 1.2, "Ki": 0.6, "t": 6.0, "dt": 0.01 },
    "drive": { "Umax": 0.5, "K": 1.0, "tau": 0.6, "Kp": 1.0, "Ki": 0.5, "t": 8.0, "dt": 0.01 },
    "motor": { "Umax": 5.0, "K": 1.0, "tau": 0.5, "Kp": 1.0, "Ki": 0.4, "t": 6.0, "dt": 0.01 },
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

def simulate(mode, ref, t=None, out_png=None):
    cfg = DEFAULTS[mode]
    Umax = float(cfg["Umax"]); K = float(cfg["K"]); tau = float(cfg["tau"])
    Kp = float(cfg["Kp"]); Ki = float(cfg["Ki"])
    T  = float(t if (t is not None) else cfg["t"])
    dt = float(cfg["dt"])

    if T <= 0:
        sys.stderr.write(f"EBADPARAMS:T_NONPOS t={T}\n"); sys.exit(2)
    if dt <= 0:
        sys.stderr.write(f"EBADPARAMS:DT_NONPOS dt={dt}\n"); sys.exit(2)

    steps = int(round(T/dt))
    if steps > 200_000:
        sys.stderr.write(f"ETOO_MANY_STEPS steps={steps} t={T} dt={dt}\n"); sys.exit(2)

    # sign para que el abierto empuje en la dirección de la referencia
    sign_ref = 0.0
    if ref > 0: sign_ref = 1.0
    elif ref < 0: sign_ref = -1.0

    # Trayectorias
    tvec = [0.0]*(steps+1)
    x_open = [0.0]*(steps+1)
    x_clsd = [0.0]*(steps+1)

    # Control PI (cerrado)
    ei = 0.0
    sat_time = 0.0

    for k in range(steps):
        tk = k*dt
        tvec[k] = tk

        # --- abierto ---
        u_open = sign_ref * Umax
        # tau * xdot + x = K*u  =>  xdot = (K*u - x)/tau
        xdot_o = (K*u_open - x_open[k]) / tau
        x_open[k+1] = x_open[k] + dt*xdot_o

        # --- cerrado (PI + saturación) ---
        e = ref - x_clsd[k]
        ei += e*dt
        u_cmd = Kp*e + Ki*ei
        u_sat = clamp(u_cmd, -Umax, Umax)
        if abs(u_sat - u_cmd) > 1e-12:
            sat_time += dt
        xdot_c = (K*u_sat - x_clsd[k]) / tau
        x_clsd[k+1] = x_clsd[k] + dt*xdot_c

    tvec[-1] = steps*dt

    # Métricas
    xss_open = K*Umax*sign_ref
    xfinal   = x_clsd[-1]
    # tiempo de establecimiento (2% de la referencia o banda absoluta de 0.02 si ref≈0)
    band = max(0.02*abs(ref), 0.02)
    ts = None
    for k in range(steps+1):
        # requiere que desde k hasta el final permanezca dentro de banda
        if all(abs(x_clsd[j]-ref) <= band for j in range(k, steps+1)):
            ts = k*dt
            break
    # overshoot (porcentaje) relativo a ref si ref!=0
    overshoot = None
    if abs(ref) > 1e-12:
        xmax = max(x_clsd) if ref > 0 else min(x_clsd)
        overshoot = 100.0 * ( (xmax - ref)/abs(ref) )

    # Plot
    out = out_png or f"loop_{mode}.png"
    plt.figure(figsize=(6,4))
    plt.plot(tvec, x_open, label="abierto (u=const.)", linewidth=2)
    plt.plot(tvec, x_clsd, label="cerrado (PI)", linewidth=2)
    plt.grid(True, alpha=0.3)
    plt.xlabel("tiempo [s]")
    ylbl = {"arm":"θ [rad]", "drive":"v [m/s]", "motor":"ω [rad/s]"}[mode]
    plt.ylabel(ylbl)
    plt.title(f"lazo abierto vs cerrado · {mode}")
    plt.legend()
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()

    metrics = {
        "mode": mode, "ref": float(ref),
        "Umax": Umax, "K": K, "tau": tau, "Kp": Kp, "Ki": Ki,
        "t": T, "dt": dt, "steps": steps,
        "x_ss_open": float(xss_open),
        "x_final_closed": float(xfinal),
        "ts": None if ts is None else float(ts),
        "overshoot_pct": None if overshoot is None else float(overshoot),
        "sat_time": float(sat_time)
    }
    return out, metrics

def main():
    payload = parse_payload()
    mode = (payload.get("mode") or "").lower()
    if mode not in ("arm","drive","motor"):
        sys.stderr.write("EBADPARAMS:MODE mode must be arm|drive|motor\n"); sys.exit(2)

    try:
        ref = float(payload.get("ref"))
    except Exception:
        sys.stderr.write("EBADPARAMS:REF ref must be numeric\n"); sys.exit(2)

    t = payload.get("t", None)
    if t is not None:
        try:
            t = float(t)
        except Exception:
            sys.stderr.write("EBADPARAMS:T_NONNUMERIC t must be numeric\n"); sys.exit(2)

    out_png = payload.get("out") or None

    img, metrics = simulate(mode, ref, t, out_png)
    print(json.dumps({"img": img, "metrics": metrics}))

if __name__ == "__main__":
    main()
