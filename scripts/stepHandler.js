// scripts/stepHandler.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PY = process.env.PYTHON_BIN || 'python3';
const SCRIPT = process.env.STEP_SCRIPT || path.join(__dirname, 'step_second_order.py');

// helpers
const f2 = v => (v == null || Number.isNaN(Number(v))) ? '—' : Number(v).toFixed(2);
const f1 = v => (v == null || Number.isNaN(Number(v))) ? '—' : Number(v).toFixed(1);

// Posicional NUEVO: @step A Kp Ki Kd t dt zeta wn
// Compatibilidad:   @step A Kp Ki Kd t [zeta [wn]]   // si no dan dt, usamos dt=0.01
function parseStepArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return { ok:false, reason:'bad_number', bad:'' };

  const nums = toks.map(s => Number(s));
  for (let i = 0; i < nums.length; i++) {
    if (!Number.isFinite(nums[i])) return { ok:false, reason:'bad_number', bad: toks[i] };
  }

  // defaults
  let A=1.0, Kp=1.0, Ki=0.0, Kd=0.0;
  let t=8.0, dt=0.01, zeta=0.5, wn=2.0;

  if (nums.length >= 1) A  = nums[0];
  if (nums.length >= 2) Kp = nums[1];
  if (nums.length >= 3) Ki = nums[2];
  if (nums.length >= 4) Kd = nums[3];
  if (nums.length >= 5) t  = nums[4];

  const rest = nums.slice(5);
  if (rest.length === 0) {
    // nada: dejamos dt,zeta,wn por defecto
  } else if (rest.length === 1) {
    // compat vieja: sólo zeta
    zeta = rest[0];
  } else if (rest.length === 2) {
    // puede ser (dt,zeta) o (zeta,wn)
    const a = rest[0], b = rest[1];
    if (a <= 0.2) { // heurística: dt típico <= 0.2
      dt = a; zeta = b;
    } else {
      zeta = a; wn = b;
    }
  } else {
    // 3 o más → formato nuevo completo (dt, zeta, wn)
    dt   = rest[0];
    zeta = rest[1];
    wn   = rest[2];
  }

  if (!(t > 0))   return { ok:false, reason:'bad_t' };
  if (!(dt > 0))  return { ok:false, reason:'bad_dt' };
  if (!(zeta >= 0)) return { ok:false, reason:'bad_zeta' };
  if (!(wn > 0))  return { ok:false, reason:'bad_wn' };

  return { ok:true, params: { A, Kp, Ki, Kd, t, dt, zeta, wn } };
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

function buildStepCaption(metrics) {
  const tsStr = (metrics.ts == null) ? '— (no entró en banda ±2% durante T)' : f2(metrics.ts);
  const mpStr = (metrics.Mp == null) ? '—' : f1(metrics.Mp);
  return (
    `Respuesta al escalón (A=${f2(metrics.A)}). Planta 2º orden (ζ=${f2(metrics.zeta)}, ωₙ=${f2(metrics.wn)} rad/s). ` +
    `PID: Kp=${f2(metrics.Kp)}, Ki=${f2(metrics.Ki)}, Kd=${f2(metrics.Kd)}.\n` +
    `Métricas: tr≈${f2(metrics.tr)} s, Mp≈${mpStr} %, ts≈${tsStr} s, error final≈${f2(metrics.ess)}.`
  );
}

async function handleStepCommand(params) {
  const payload = {
    A: params.A, Kp: params.Kp, Ki: params.Ki, Kd: params.Kd,
    t: params.t, dt: params.dt, zeta: params.zeta, wn: params.wn
  };
  const res = await runPython(payload);
  return { img: res.img, metrics: res.metrics, caption: buildStepCaption(res.metrics) };
}

module.exports = {
  parseStepArgs,
  handleStepCommand,
  buildStepCaption,
};