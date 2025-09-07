// scripts/sigHandler.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PY = process.env.PYTHON_BIN || 'python3';
const SCRIPT = process.env.SIG_SCRIPT || path.join(__dirname, 'sim_signals.py');

// helpers
const f2 = v => (v == null || Number.isNaN(Number(v))) ? '—' : Number(v).toFixed(2);
const f1 = v => (v == null || Number.isNaN(Number(v))) ? '—' : Number(v).toFixed(1);

// parser: @sig <plant> <input> <A> [t] [kp ki kd] [umax] [k tau | wn zeta] [noise] [delay] [dist dist_t] [showopen]
function parseSigArgs(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return { ok:false, reason:'missing_min' };

  const plant = parts[0].toLowerCase();
  const input = parts[1].toLowerCase();
  const A = Number(parts[2]); if (Number.isNaN(A)) return { ok:false, reason:'bad_number' };

  let i = 3;
  let T=null, kp=null, ki=null, kd=null, umax=null, k=null, tau=null, wn=null, zeta=null, noise=null, delay=null, dist=null, dist_t=null, show_open=false;

  // T (opcional)
  if (i < parts.length && !isNaN(Number(parts[i]))) { T = Number(parts[i]); i++; }

  // kp ki kd (opcionales)
  if (i+2 < parts.length && [parts[i],parts[i+1],parts[i+2]].every(x => !isNaN(Number(x)))) {
    kp = Number(parts[i]); ki = Number(parts[i+1]); kd = Number(parts[i+2]); i+=3;
  }

  // Umax (opcional)
  if (i < parts.length && !isNaN(Number(parts[i]))) { umax = Number(parts[i]); i++; }

  // planta params
  if (plant === '1' || plant === 'first' || plant === 'fo') {
    if (i+1 < parts.length && !isNaN(Number(parts[i])) && !isNaN(Number(parts[i+1]))) {
      k = Number(parts[i]); tau = Number(parts[i+1]); i+=2;
    }
  } else {
    if (i+1 < parts.length && !isNaN(Number(parts[i])) && !isNaN(Number(parts[i+1]))) {
      wn = Number(parts[i]); zeta = Number(parts[i+1]); i+=2;
    }
  }

  // noise, delay (opcionales)
  if (i < parts.length && !isNaN(Number(parts[i]))) { noise = Number(parts[i]); i++; }
  if (i < parts.length && !isNaN(Number(parts[i]))) { delay = Number(parts[i]); i++; }

  // dist, dist_t (opcionales)
  if (i < parts.length && !isNaN(Number(parts[i]))) { dist = Number(parts[i]); i++; }
  if (i < parts.length && !isNaN(Number(parts[i]))) { dist_t = Number(parts[i]); i++; }

  // showopen (flag textual)
  if (i < parts.length && /^showopen$/i.test(parts[i])) { show_open = true; i++; }

  // validar modo/entrada
  const plantNorm =
    (plant==='1'||plant==='first'||plant==='fo') ? 'first' :
    (plant==='2'||plant==='second'||plant==='so') ? 'second' : null;
  if (!plantNorm) return { ok:false, reason:'bad_plant' };

  const allowedInputs = ['step','ramp','sine','square','chirp'];
  if (!allowedInputs.includes(input)) return { ok:false, reason:'bad_input' };

  const params = {
    plant: plantNorm, input, A,
    T: T ?? undefined,
    Kp: kp ?? undefined, Ki: ki ?? undefined, Kd: kd ?? undefined,
    Umax: umax ?? undefined,
    K: k ?? undefined, tau: tau ?? undefined,
    wn: wn ?? undefined, zeta: zeta ?? undefined,
    noise: noise ?? undefined, delay: delay ?? undefined,
    dist: dist ?? undefined, dist_t: dist_t ?? undefined,
    show_open: show_open
  };
  return { ok:true, params };
}

function runPython(payload) {
  return new Promise((resolve, reject) => {
    const p = spawn(PY, [SCRIPT], { stdio: ['pipe','pipe','pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', () => {
      if (!out) return reject({ code:'EBADJSON', message:'no output', stderr:err });
      try {
        const parsed = JSON.parse(out);
        if (parsed.error) return reject(parsed);
        resolve(parsed);
      } catch (e) {
        reject({ code:'EBADJSON', message:e.message, raw:out, stderr:err });
      }
    });
    p.stdin.end(Buffer.from(JSON.stringify(payload)));
  });
}

function buildSigCaption(metrics) {
  const head = `pid con entrada ${metrics.input} sobre ${metrics.plant === 'first' ? 'planta de 1er orden' : 'planta de 2º orden'}.`;
  const pid  = `pid: Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}; Umax=${f2(metrics.Umax)}.`;
  const extras = [];
  if (metrics.noise && metrics.noise > 0) extras.push(`ruido=${f2(metrics.noise)}`);
  if (metrics.delay && metrics.delay > 0) extras.push(`retardo=${f2(metrics.delay)} s`);
  if (metrics.dist && metrics.dist !== 0) extras.push(`perturbación=${f2(metrics.dist)} (t=${f2(metrics.dist_t)} s)`);
  if (metrics.show_open) extras.push(`abierto mostrado`);

  const tsStr = (metrics.ts == null) ? '— (no entró en ±2% durante T)' : f2(metrics.ts);
  const mpStr = (metrics.Mp == null || Number(metrics.Mp) < 0.5) ? '—' : f1(metrics.Mp);

  const lines = [
    `${head} A=${f2(metrics.A)}; T=${f2(metrics.T)} s.`,
    pid + (extras.length ? ' ' + extras.join(', ') + '.' : ''),
    `métricas: tr≈${f2(metrics.tr)} s, Mp≈${mpStr} %, ts≈${tsStr} s, error final≈${f2(metrics.e_ss)}; ` +
    `saturación≈${f2(metrics.sat_time)} s (${f1(metrics.time_in_sat_pct)}%).`
  ];
  return lines.join('\n');
}

async function handleSigCommand(params) {
  const res = await runPython(params);
  return { img: res.img, metrics: res.metrics, caption: buildSigCaption(res.metrics) };
}

module.exports = {
  parseSigArgs,
  handleSigCommand,
  buildSigCaption,
};