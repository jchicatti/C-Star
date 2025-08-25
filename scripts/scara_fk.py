#!/usr/bin/env python3
import sys, json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def deg2rad(a): return a*math.pi/180.0

def fk_scara(l1,l2,t1,t2,z):
    x1 = l1*math.cos(t1); y1 = l1*math.sin(t1)
    x2 = x1 + l2*math.cos(t1+t2); y2 = y1 + l2*math.sin(t1+t2)
    theta = t1 + t2
    return (0.0,0.0),(x1,y1),(x2,y2),theta

def main():
    try:
        p = json.loads(sys.stdin.read().strip() or "{}")
        l1 = float(p.get("l1", 1.0))
        l2 = float(p.get("l2", 1.0))
        t1 = float(p.get("t1", 0.0))
        t2 = float(p.get("t2", 0.0))
        z  = float(p.get("z",  0.0))
        units = (p.get("units") or "deg").lower()
        out   = p.get("out") or "scara.png"
    except Exception as e:
        sys.stderr.write(f"EBADJSON: {e}\n"); sys.exit(2)

    if l1 <= 0 or l2 <= 0:
        sys.stderr.write("EBADPARAMS:LENS l1,l2 must be > 0\n"); sys.exit(2)
    if units not in ("deg","rad"):
        sys.stderr.write("EBADPARAMS:UNITS units must be 'deg' or 'rad'\n"); sys.exit(2)

    if units == "deg":
        t1 = deg2rad(t1); t2 = deg2rad(t2)

    j0,j1,j2,theta = fk_scara(l1,l2,t1,t2,z)

    plt.figure(figsize=(6,6))
    plt.plot([j0[0],j1[0],j2[0]],[j0[1],j1[1],j2[1]], marker='o', linewidth=3)
    plt.scatter([j2[0]],[j2[1]], marker='x')
    r = l1 + l2; m = 0.1*r
    plt.xlim(-r-m, r+m); plt.ylim(-r-m, r+m)
    plt.gca().set_aspect('equal', adjustable='box'); plt.grid(True, alpha=0.3)
    plt.title("SCARA FK (vista superior)")
    plt.xlabel("x"); plt.ylabel("y"); plt.text(j2[0], j2[1], f"  z={z:.3f}", fontsize=10)
    plt.tight_layout(); plt.savefig(out, dpi=150)

    print(json.dumps({
        "img": out,
        "ee": {"x": j2[0], "y": j2[1], "z": z, "theta": theta},
        "units": {"angles": ("rad" if units=="rad" else "deg"), "z": "m"}
    }))

if __name__ == "__main__":
    main()