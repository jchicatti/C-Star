#!/usr/bin/env python3
# stdin:  {"l1":10,"l2":6,"x":12,"y":4,"units":"deg","out":"/tmp/out.png"}
# stdout: {"img":"...","solutions":[[th1,th2],[th1b,th2b]],"units":"deg"}

import sys, json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def solve_ik_2link(l1, l2, x, y):
    r2 = x*x + y*y
    c2 = (r2 - l1*l1 - l2*l2) / (2.0*l1*l2)
    if c2 < -1.0 or c2 > 1.0:
        return None  # unreachable
    s2 = math.sqrt(max(0.0, 1.0 - c2*c2))
    th2_a = math.atan2(+s2, c2)  # codo arriba
    th2_b = math.atan2(-s2, c2)  # codo abajo

    def th1(th2):
        return math.atan2(y, x) - math.atan2(l2*math.sin(th2), l1 + l2*math.cos(th2))

    th1_a = th1(th2_a)
    th1_b = th1(th2_b)
    return (th1_a, th2_a), (th1_b, th2_b)

def to_deg(pair):
    return [math.degrees(pair[0]), math.degrees(pair[1])]

def fk(l1, l2, th1, th2):
    x1 = l1*math.cos(th1); y1 = l1*math.sin(th1)
    x2 = x1 + l2*math.cos(th1+th2); y2 = y1 + l2*math.sin(th1+th2)
    return (0.0,0.0),(x1,y1),(x2,y2)

def main():
    try:
        payload = json.loads(sys.stdin.read().strip() or "{}")
        l1 = float(payload.get("l1", 1.0))
        l2 = float(payload.get("l2", 1.0))
        x  = float(payload.get("x",  0.0))
        y  = float(payload.get("y",  0.0))
        units = (payload.get("units") or "deg").lower()
        out   = payload.get("out") or "ik2.png"
    except Exception as e:
        sys.stderr.write(f"EBADJSON: {e}\n"); sys.exit(2)
    r = math.hypot(x, y)
    rmax = l1 + l2
    rmin = abs(l1 - l2)
    if r > rmax + 1e-9:
        delta = r - rmax
        sys.stderr.write(f"EUNREACHABLE:OUT r={r:.6f} rmin={rmin:.6f} rmax={rmax:.6f} delta={delta:.6f}\n")
        sys.exit(2)
    if r < rmin - 1e-9:
        delta = rmin - r
        sys.stderr.write(f"EUNREACHABLE:IN r={r:.6f} rmin={rmin:.6f} rmax={rmax:.6f} delta={delta:.6f}\n")
        sys.exit(2)
    if l1 <= 0 or l2 <= 0:
        sys.stderr.write("EBADPARAMS: l1,l2 must be > 0\n"); sys.exit(2)
    if units not in ("deg","rad"):
        sys.stderr.write("EBADPARAMS: units must be 'deg' or 'rad'\n"); sys.exit(2)

    sols = solve_ik_2link(l1,l2,x,y)
    if sols is None:
        sys.stderr.write("EUNREACHABLE: target fuera de alcance\n"); sys.exit(2)

    (th1a, th2a), (th1b, th2b) = sols

    # dibuja ambas soluciones
    plt.figure(figsize=(6,6))
    j0,j1,j2 = fk(l1,l2,th1a,th2a)
    k0,k1,k2 = fk(l1,l2,th1b,th2b)
    plt.plot([j0[0],j1[0],j2[0]],[j0[1],j1[1],j2[1]], marker='o', linewidth=3, label='codo arriba')
    plt.plot([k0[0],k1[0],k2[0]],[k0[1],k1[1],k2[1]], marker='o', linewidth=3, label='codo abajo')
    plt.scatter([x],[y], marker='x')  # objetivo
    r_plot = rmax
    m = 0.1*r_plot
    plt.xlim(-r_plot-m, r_plot+m); plt.ylim(-r_plot-m, r_plot+m)
    plt.gca().set_aspect('equal', adjustable='box')
    plt.grid(True, alpha=0.3)
    plt.title("IK 2-DOF: codo arriba / codo abajo")
    plt.legend()
    plt.xlabel("x"); plt.ylabel("y")
    plt.tight_layout()
    plt.savefig(out, dpi=150)

    solutions = [[th1a, th2a], [th1b, th2b]]
    if units == "deg":
        solutions = [to_deg(s) for s in solutions]

    print(json.dumps({"img": out, "solutions": solutions, "units": units}))

if __name__ == "__main__":
    main()
