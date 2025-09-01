#!/usr/bin/env python3
# Lee JSON por stdin: {"v":0.3,"w":0.2,"t":10,"dt":0.05,"x0":0,"y0":0,"th0":0,"out":"/ruta/out.png"}
# Genera PNG y escribe en stdout: {"img": "...", "final_pose": [x,y,theta], "samples": N, "params": {...}}

import sys, json, math
import numpy as np
import matplotlib.pyplot as plt

def simulate(v=0.3, w=0.2, t=10.0, dt=0.05, x0=0.0, y0=0.0, th0=0.0):
    n = max(1, int(round(t/dt)))
    xs = np.zeros(n+1); ys = np.zeros(n+1); th = np.zeros(n+1)
    xs[0], ys[0], th[0] = x0, y0, th0
    for k in range(n):
        th[k+1] = th[k] + w*dt
        xs[k+1] = xs[k] + v*math.cos(th[k])*dt
        ys[k+1] = ys[k] + v*math.sin(th[k])*dt
    return xs, ys, th

def main():
    try:
        incoming = sys.stdin.read().strip()
        params = json.loads(incoming) if incoming else {}
    except Exception as e:
        sys.stderr.write(f"EBADJSON: {e}\n"); sys.exit(2)

    def as_float(name, default):
        v = params.get(name, default)
        try:
            return float(v)
        except (TypeError, ValueError):
            sys.stderr.write(f"EBADPARAMS: {name} not numeric\n"); sys.exit(2)

    v   = as_float("v", 0.3)
    w   = as_float("w", 0.2)
    t   = as_float("t", 10.0)
    dt  = as_float("dt", 0.05)
    x0  = as_float("x0", 0.0)
    y0  = as_float("y0", 0.0)
    th0 = as_float("th0", 0.0)

    if t <= 0:
        sys.stderr.write(f"EBADPARAMS:T_NONPOS t={t}\n"); sys.exit(2)
    if dt <= 0:
        sys.stderr.write(f"EBADPARAMS:DT_NONPOS dt={dt}\n"); sys.exit(2)

    steps = int(math.ceil(t/dt))
    if steps > 2000:
        sys.stderr.write(f"ETOO_MANY_STEPS steps={steps} t={t} dt={dt}\n"); sys.exit(2)
    if abs(v) < 1e-12 and abs(w) < 1e-12:
        sys.stderr.write("ENOMOTION v=0 w=0\n"); sys.exit(2)

    out = params.get("out") or "drive_out.png"

    xs, ys, th = simulate(v,w,t,dt,x0,y0,th0)

    plt.figure(figsize=(6,6))
    plt.plot(xs, ys, linewidth=2)
    N = max(1, len(xs)//12)
    for k in range(0, len(xs), N):
        dx = 0.1*math.cos(th[k]); dy = 0.1*math.sin(th[k])
        plt.arrow(xs[k], ys[k], dx, dy, head_width=0.03, length_includes_head=True)
    plt.scatter([xs[0]],[ys[0]], marker='o')
    plt.scatter([xs[-1]],[ys[-1]], marker='x')
    plt.axis('equal'); plt.grid(True)
    plt.title("Differential drive trajectory")
    plt.xlabel("x [m]"); plt.ylabel("y [m]")
    plt.tight_layout(); plt.savefig(out, dpi=150)

    print(json.dumps({
        "img": out,
        "final_pose": [float(xs[-1]), float(ys[-1]), float(th[-1])],
        "samples": int(len(xs)),
        "params": {"v":v,"w":w,"t":t,"dt":dt,"x0":x0,"y0":y0,"th0":th0}
    }))

if __name__ == "__main__":
    main()
