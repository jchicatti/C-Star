// scripts/loopHandler.js
const { spawn } = require('child_process');
const path = require('path');
const PY = process.env.PYTHON_BIN || 'python3';
const SCRIPT = process.env.LOOP_SCRIPT || path.join(__dirname, 'loop_first_order.py');

// ----- helpers de formato -----
const f2 = (v) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(2));

// ----- parser mínimo (igual que tenías) -----
function parseLoopArgs(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ok:false, reason:'missing_all' };

  const mode = (parts[0]||'').toLowerCase();
  if (!['arm','drive','motor'].includes(mode)) return { ok:false, reason:'bad_mode' };
  if (parts.length === 1) return { ok:false, reason:'missing_ref', mode };

  const nums = parts.slice(1).map(n => Number(n));
  if (nums.some(v => Number.isNaN(v))) return { ok:false, reason:'bad_number' };

  const [ref, t, K, tau, Umax, Kp, Ki, Kd] = nums;
  const params = {
    mode, ref,
    t, K, tau, Umax, Kp, Ki, Kd
  };
  return { ok:true, params };
}

// ----- runner (igual que tenías) -----
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

// ----- captions corregidas -----
function buildCaption(metrics) {
  const mode = metrics.mode;
  const unit = (mode === 'arm') ? 'rad' : (mode === 'drive' ? 'm/s' : 'rad/s');
  const sym  = (mode === 'arm') ? 'θ'   : (mode === 'drive' ? 'v'   : 'ω');

  const head =
    (mode === 'arm')   ? 'Comparación lazo abierto vs cerrado (articulación).' :
    (mode === 'drive') ? 'Comparación lazo abierto vs cerrado (velocidad diferencial).' :
                         'Comparación lazo abierto vs cerrado (motor DC).';

  // helper seguro para números
  const f2s = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(2));
  const f1s = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(1));

  const lineOpen =
    `Abierto (respuesta natural): ${sym}_ss = ${f2s(metrics.x_ss_open)} ${unit} `
    + `(${sym}_ref = ${f2s(metrics.ref)}). Se traza la línea x_ss para ver potencia disponible.`;

  let lineClosed = '';
  if (!metrics.reachable) {
    const deficit = metrics.deficit; // ref - K·Umax (con signo)
    lineClosed =
      `Referencia NO alcanzable con Umax: falta Δ = ${f2s(deficit)} ${unit}. `
      + `Saturación acumulada ≈ ${f2s(metrics.sat_time)} s.`;
  } else {
    // ts legible (si no entró en banda ±2% durante T)
    let tsStr = '— (no entró en banda ±2% durante T)';
    if (metrics.ts != null && !Number.isNaN(Number(metrics.ts))) {
      tsStr = Number(metrics.ts).toFixed(2);
    }

    const e_final = (metrics.x_final_closed - metrics.ref);

    lineClosed =
      `Cerrado (PID): ts ≈ ${tsStr} s; `
      + `error final ≈ ${f2s(e_final)} ${unit}; `
      + `saturación ≈ ${f2s(metrics.sat_time)} s.`;

    // añade sobreimpulso solo si es significativo
    if (metrics.overshoot_pct != null && Number(metrics.overshoot_pct) > 0.5) {
      lineClosed += ` Sobreimpulso ≈ ${f1s(metrics.overshoot_pct)}%.`;
    }
  }

  return `${head}\n${lineOpen}\n${lineClosed}`;
}

async function handleLoopCommand(params) {
  const res = await runPython(params);
  // también devuelvo la caption para que el caller no la duplique
  return { img: res.img, metrics: res.metrics, caption: buildCaption(res.metrics) };
}

module.exports = {
  parseLoopArgs,
  handleLoopCommand,
  buildCaption,
};
