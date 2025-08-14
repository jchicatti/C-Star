#!/usr/bin/env python3
# stdin: {"n":3,"lengths":[10,6,4],"angles":[30,45,-20],"units":"deg","out":"/tmp/out.png"}
# stdout: {"img":"...","ee":[x,y],"joints":[[0,0],[x1,y1],...,[xN,yN]],"params":{...}}
import sys, json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def main():
    try:
        params = json.loads(sys.stdin.read().strip() or "{}")
    except Exception as e:
        sys.stderr.write(f"EBADJSON: {e}\n"); sys.exit(2)

    try:
        n       = int(params.get("n", 2))
        lengths = list(params.get("lengths", []))
        angles  = list(params.get("angles", []))
        units   = (params.get("units") or "deg").lower()
        out     = params.get("out") or "armN.png"
    except Exception as e:
        sys.stderr.write(f"EBADPARAMS: {e}\n"); sys.exit(2)

    if not (2 <= n <= 6):
        sys.stderr.write("EBADPARAMS: n must be between 2 and 6\n"); sys.exit(2)
    if len(lengths) != n or len(angles) != n:
        sys.stderr.write("EBADPARAMS: lengths and angles must have length n\n"); sys.exit(2)
    if any(L <= 0 for L in lengths):
        sys.stderr.write("EBADPARAMS: all lengths must be > 0\n"); sys.exit(2)
    if units not in ("deg","rad"):
        sys.stderr.write("EBADPARAMS: units must be 'deg' or 'rad'\n"); sys.exit(2)

    # a radianes si procede
    if units == "deg":
        angles = [a*math.pi/180.0 for a in angles]

    # fk incremental
    x, y, th = 0.0, 0.0, 0.0
    joints = [(x, y)]
    for i in range(n):
        th += angles[i]
        x += lengths[i]*math.cos(th)
        y += lengths[i]*math.sin(th)
        joints.append((x, y))

    # plot
    plt.figure(figsize=(6,6))
    xs = [p[0] for p in joints]
    ys = [p[1] for p in joints]
    plt.plot(xs, ys, marker='o', linewidth=3)
    plt.scatter([xs[0]],[ys[0]], c='k')
    plt.text(xs[-1], ys[-1], f"  EE=({xs[-1]:.2f},{ys[-1]:.2f})", fontsize=10)
    r = sum(lengths); m = 0.1*r
    plt.xlim(-r-m, r+m); plt.ylim(-r-m, r+m)
    plt.gca().set_aspect('equal', adjustable='box')
    plt.grid(True, alpha=0.3)
    plt.title(f"{n}-DOF planar arm (FK)")
    plt.xlabel("x"); plt.ylabel("y")
    plt.tight_layout()
    plt.savefig(out, dpi=150)

    print(json.dumps({
        "img": out,
        "ee": [xs[-1], ys[-1]],
        "joints": [[float(a), float(b)] for a,b in joints],
        "params": {"n":n,"lengths":lengths,"angles":angles,"units":"rad" if units=="deg" else "rad"}
    }))
if __name__ == "__main__":
    main()