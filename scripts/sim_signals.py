#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sim_signals.py
Simula un PID con distintas señales de entrada sobre una planta de 1er o 2º orden.
Lee JSON por stdin y devuelve {img, metrics} por stdout.

Payload esperado (claves principales):
{
  "plant": "first" | "second" | 1 | 2,
  "input": "step" | "ramp" | "sine" | "square" | "chirp",
  "A": 1.0,            # amplitud de la referencia
  "T": 8.0, "dt": 0.01,
  "Kp": 1.2, "Ki": 0.6, "Kd": 0.0,
  # planta 1er orden
  "K": 1.0, "tau": 0.6,
  # planta 2º orden (canónica)
  "wn": 2.0, "zeta": 0.4,
  # saturación, ruido, retardo y perturbación
  "Umax": 1.0, "noise": 0.0, "delay": 0.0,
  "dist": 0.0, "dist_t": 0.0,
  # extras
  "show_open": false   # si quieres mostrar también planta abierta al escalón (solo cuando input='step')
}
"""
import json, sys, os, math
import numpy as np
import matplotlib.pyplot as plt

def _safe_float(x, d=None):
    try: return float(x)
    except: return d

def _gen_ref(input_kind, A, t, T, extra=None):
    if input_kind == "step":
        return np.ones_like(t) * A
    if input_kind == "ramp":
        return np.clip((t / max(T, 1e-9)) * A * 2.0, -abs(A), abs(A))
    if input_kind == "sine":
        f = 0.5 if not extra else float(extra.get("f", 0.5))
        return A * np.sin(2*np.pi*f*t)
    if input_kind == "square":
        f = 0.5 if not extra else float(extra.get("f", 0.5))
        return A * np.sign(np.sin(2*np.pi*f*t))
    if input_kind == "chirp":
        f0 = 0.1; f1 = 1.0
        if extra:
            f0 = float(extra.get("f0", f0)); f1 = float(extra.get("f1", f1))
        k = (f1 - f0) / max(T,1e-9)
        phase = 2*np.pi*(f0*t + 0.5*k*t*t)
        return A * np.sin(phase)
    # fallback: step
    return np.ones_like(t) * A

def _metrics_basic(t, y, r, band=0.02):
    """tr (10-90%), ts (±2%), Mp (% respecto a amplitud A de step), e_ss (promedio final)."""
    t = np.asarray(t); y = np.asarray(y); r = np.asarray(r)
    # e_ss: promedio en última décima de la simulación
    N = len(t)
    idx0 = int(0.9*N)
    e_ss = float(np.mean(y[idx0:] - r[idx0:]))

    # si la referencia NO es step constante, tr/Mp/ts pierden sentido estricto; intentamos sobre el valor objetivo en T
    A = float(r[-1]) if np.allclose(r, r[0]) == False else float(r[-1])
    # rise time: 10-90% relativo al objetivo final (si A≈0, no calcular)
    tr = None
    if abs(A) > 1e-9:
        y10 = 0.1*A; y90 = 0.9*A
        try:
            t10 = t[np.where((y - 0.0*np.sign(A)) * np.sign(A) >= y10*np.sign(A))[0][0]]
            t90 = t[np.where((y - 0.0*np.sign(A)) * np.sign(A) >= y90*np.sign(A))[0][0]]
            tr = float(t90 - t10)
        except:
            tr = None

    # overshoot: pico relativo a A (solo si step)
    Mp = None
    if np.allclose(r, np.ones_like(r)*r[-1]):  # step puro
        if A != 0:
            if A > 0:
                Mp = max(0.0, (float(np.max(y)) - A) / abs(A) * 100.0)
            else:
                Mp = max(0.0, (abs(float(np.min(y))) - abs(A)) / abs(A) * 100.0)

    # ts: primera vez desde la cual y se queda dentro de ±band de r (si r es variable, usamos r[-1] como objetivo)
    ts = None
    target = float(r[-1])
    low, up = target*(1-band), target*(1+band)
    last_out = None
    for i in range(len(t)-1, -1, -1):
        if not (low <= y[i] <= up):
            last_out = i; break
    if last_out is not None:
        j = last_out + 1
        if j < len(t): ts = float(t[j])

    return dict(tr=tr, ts=ts, Mp=Mp, e_ss=e_ss)

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error":"EBADJSON","message":"invalid json"})); return

    plant = payload.get("plant", "first")
    if str(plant).lower() in ("1","first","fo"): plant = "first"
    elif str(plant).lower() in ("2","second","so"): plant = "second"
    else:
        print(json.dumps({"error":"EBADPARAMS","message":"plant must be first/second"})); return

    input_kind = str(payload.get("input","step")).lower()
    if input_kind not in ("step","ramp","sine","square","chirp"):
        input_kind = "step"

    # parámetros generales
    A   = _safe_float(payload.get("A"), 1.0)
    T   = _safe_float(payload.get("T"), 8.0)
    dt  = _safe_float(payload.get("dt"), 0.01)
    Kp  = _safe_float(payload.get("Kp"), 1.2)
    Ki  = _safe_float(payload.get("Ki"), 0.6)
    Kd  = _safe_float(payload.get("Kd"), 0.0)
    Umax= _safe_float(payload.get("Umax"), 1.0)
    noise = _safe_float(payload.get("noise"), 0.0)
    delay = _safe_float(payload.get("delay"), 0.0)
    dist  = _safe_float(payload.get("dist"), 0.0)
    dist_t= _safe_float(payload.get("dist_t"), 0.0)
    show_open = bool(payload.get("show_open", False))

    if dt is None or dt <= 0 or T is None or T <= 0:
        print(json.dumps({"error":"SIG_BAD_T","message":"T and dt must be > 0"})); return
    steps = int(round(T/dt))
    if steps < 20 or steps > 2_000_000:
        print(json.dumps({"error":"SIG_TOO_MANY_STEPS","message":"T/dt out of bounds","meta":{"steps":steps,"t":T,"dt":dt}})); return

    t = np.linspace(0.0, T, steps+1)
    # referencia
    ref = _gen_ref(input_kind, A, t, T, payload.get("input_params"))

    # buffers
    x = np.zeros_like(t)               # salida
    xdot = 0.0                         # solo para 2º orden
    u = np.zeros_like(t)               # control saturado
    integ = 0.0; prev_e = 0.0
    sat_mask = np.zeros_like(t, dtype=bool)

    # retardo en medición: cola circular
    dN = max(0, int(round(delay/dt)))
    xbuf = [0.0]*(dN+1)

    # planta
    if plant == "first":
        K = _safe_float(payload.get("K"), 1.0)
        tau = _safe_float(payload.get("tau"), 0.6)
        if tau is None or tau <= 0:
            print(json.dumps({"error":"SIG_BAD_TAU","message":"tau must be > 0"})); return
    else:
        wn = _safe_float(payload.get("wn"), 2.0)
        zeta = _safe_float(payload.get("zeta"), 0.4)
        if wn is None or wn <= 0:
            print(json.dumps({"error":"SIG_BAD_WN","message":"wn must be > 0"})); return
        if zeta is None:
            print(json.dumps({"error":"SIG_BAD_ZETA","message":"zeta must be provided"})); return

    # perturbación
    dist_vec = np.zeros_like(t)
    if abs(dist) > 0:
        k0 = min(len(t)-1, max(0, int(round(dist_t/dt))))
        dist_vec[k0:] = dist

    # sim euler
    for k in range(len(t)-1):
        # medición con retardo y ruido
        xbuf.pop(0); xbuf.append(x[k])
        xm = xbuf[0] if dN>0 else x[k]
        if noise > 0: xm = xm + np.random.normal(scale=noise)

        e = ref[k] - xm
        de = (e - prev_e)/dt; prev_e = e
        u_unsat = Kp*e + Ki*(integ + e*dt) + Kd*de

        # saturación
        u_sat = max(-Umax, min(Umax, u_unsat))
        sat_mask[k] = abs(u_unsat - u_sat) > 1e-12
        u[k] = u_sat

        # integral sin anti-windup (didáctico, simple)
        integ += e*dt

        # planta
        if plant == "first":
            xdot = -(1.0/tau)*x[k] + (K/tau)*(u[k] + dist_vec[k])
        else:
            # x = posición (salida), xdot = velocidad
            xddot = -2.0*zeta*wn*xdot - (wn**2)*x[k] + (wn**2)*(u[k] + dist_vec[k])  # G(s)=wn^2/(s^2+2ζwn s+wn^2)
            xdot = xdot + dt*xddot
            x[k+1] = x[k] + dt*xdot
            continue

        x[k+1] = x[k] + dt*xdot

    u[-1] = u[-2]; sat_mask[-1] = sat_mask[-2]

    # planta abierta (opcional, solo si step)
    y_open = None
    if show_open and input_kind == "step":
        if plant == "first":
            # respuesta natural de 1er orden a un escalón A (sin saturación en abierto)
            Ko = _safe_float(payload.get("K"), 1.0); tauo = _safe_float(payload.get("tau"), 0.6)
            y_open = (Ko*A)*(1.0 - np.exp(-t/max(tauo,1e-9)))
        else:
            # usar solución numérica simplificada
            # G(s)=wn^2/(s^2+2ζwn s+wn^2) * A (unidad de ganancia)
            xo = np.zeros_like(t); xdo = 0.0
            for k in range(len(t)-1):
                xdd = -2.0*zeta*wn*xdo - (wn**2)*xo[k] + (wn**2)*A
                xdo = xdo + dt*xdd
                xo[k+1] = xo[k] + dt*xdo
            y_open = xo

    # métricas
    m = _metrics_basic(t, x, ref)
    sat_time = float(np.sum(sat_mask)*dt)
    time_in_sat_pct = sat_time / T * 100.0
    u_peak = float(np.max(np.abs(u)))
    u_rms = float(np.sqrt(np.mean(u*u)))

    metrics = dict(
      plant=plant, input=input_kind, A=float(A), T=float(T), dt=float(dt),
      Kp=float(Kp), Ki=float(Ki), Kd=float(Kd),
      Umax=float(Umax), noise=float(noise), delay=float(delay),
      dist=float(dist), dist_t=float(dist_t),
      tr=(None if m["tr"] is None else float(m["tr"])),
      ts=(None if m["ts"] is None else float(m["ts"])),
      Mp=(None if m["Mp"] is None else float(m["Mp"])),
      e_ss=float(m["e_ss"]),
      sat_time=float(sat_time), time_in_sat_pct=float(time_in_sat_pct),
      u_peak=float(u_peak), u_rms=float(u_rms),
      show_open=bool(show_open)
    )
    if plant == "first":
        metrics.update(dict(K=float(_safe_float(payload.get("K"),1.0)),
                            tau=float(_safe_float(payload.get("tau"),0.6))))
    else:
        metrics.update(dict(wn=float(_safe_float(payload.get("wn"),2.0)),
                            zeta=float(_safe_float(payload.get("zeta"),0.4))))

    # figura
    plt.figure(figsize=(10,6))
    # referencia
    label_ref = f"referencia ({input_kind})"
    plt.plot(t, ref, 'k--', alpha=0.8, label=label_ref)
    # abierto (opcional)
    if y_open is not None:
        plt.plot(t, y_open, alpha=0.8, label='abierto (planta)')
    # cerrado
    plt.plot(t, x, label='cerrado (PID)')

    # sombrear saturación
    if np.any(sat_mask):
        y_min = min(np.min(ref), np.min(x)) ; y_max = max(np.max(ref), np.max(x))
        plt.fill_between(t, y_min, y_max, where=sat_mask, color='gray', alpha=0.08, step='pre', label='zona con saturación')

    title = f"pid sobre {'1er' if plant=='first' else '2º'} orden · entrada: {input_kind}"
    plt.title(title)
    ylabel = "salida"
    plt.xlabel("tiempo [s]"); plt.ylabel(ylabel)
    plt.grid(True); plt.legend()

    outdir = os.environ.get("SIG_OUTDIR","/mnt/data")
    os.makedirs(outdir, exist_ok=True)
    img = os.path.join(outdir, f"sig_{plant}_{input_kind}.png")
    plt.savefig(img, dpi=140, bbox_inches='tight'); plt.close()

    print(json.dumps({"img": img, "metrics": metrics}))

if __name__ == "__main__":
    main()
