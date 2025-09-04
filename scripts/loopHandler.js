// scripts/loopHandler.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Parser posicional: @loop <mode> <ref> [t Umax K tau Kp Ki Kd]
function parseLoopArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  if (toks.length < 1) return { ok: false, reason: 'missing_all' };

  const mode = (toks[0] || '').toLowerCase();
  if (!['arm','drive','motor'].includes(mode)) {
    return { ok: false, reason: 'bad_mode', mode };
  }
  if (toks.length < 2) {
    return { ok: false, reason: 'missing_ref', mode };
  }

  const nums = toks.slice(1).map(s => Number(s));
  // al menos el primero (ref) numérico
  if (!Number.isFinite(nums[0])) {
    return { ok: false, reason: 'bad_number', mode, bad: toks[1] };
  }

  // mapea posicionales si existen
  const [ref, t, Umax, K, tau, Kp, Ki, Kd] = nums;

  // valida numéricos si fueron provistos
  const checkNum = (v) => (v === undefined || Number.isFinite(v));
  if (!checkNum(t) || !checkNum(Umax) || !checkNum(K) || !checkNum(tau) ||
      !checkNum(Kp) || !checkNum(Ki) || !checkNum(Kd)) {
    return { ok: false, reason: 'bad_number', mode };
  }

  return { ok: true, params: { mode, ref, t, Umax, K, tau, Kp, Ki, Kd } };
}

// Resuelve ruta del .py (compatible con pkg)
function resolvePyScript() {
  const bundled = path.join(__dirname, 'loop_first_order.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'loop_first_order.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

// Ejecuta el .py y retorna { img, metrics }
function handleLoopCommand(params) {
  const outPng = path.join(os.tmpdir(), `loop_${params.mode}_${Date.now()}.png`);
  const payload = { ...params, out: outPng };
  const pyScript = resolvePyScript();

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [pyScript], { stdio: ['pipe','pipe','pipe'] });

    const CAP = 1_000_000; // 1MB
    let out = '', err = '';
    py.stdout.on('data', d => { if (out.length < CAP) out += d; });
    py.stderr.on('data', d => { if (err.length < CAP) err += d; });
    py.on('error', e => reject(Object.assign(e, { code: 'ESPAWN' })));

    const killAfterMs = 15_000;
    const to = setTimeout(() => { try { py.kill('SIGKILL'); } catch {} reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })); }, killAfterMs);

    py.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) {
        const e = new Error(err || `python exited ${code}`);
        const mSteps = /ETOO_MANY_STEPS\s+steps=(\d+)\s+t=(\S+)\s+dt=(\S+)/i.exec(err || '');
        const mT     = /EBADPARAMS:T_NONPOS\s+t=(\S+)/i.exec(err || '');
        const mDt    = /EBADPARAMS:DT_NONPOS\s+dt=(\S+)/i.exec(err || '');
        const mMode  = /EBADPARAMS:MODE/i.test(err || '');
        const mRef   = /EBADPARAMS:REF/i.test(err || '');
        const mJson  = /EBADJSON/i.test(err || '');

        if (mSteps) { e.code='LOOP_TOO_MANY_STEPS'; e.meta={ steps:mSteps[1], t:mSteps[2], dt:mSteps[3] }; }
        else if (mT) { e.code='LOOP_BAD_T'; e.meta={ t:mT[1] }; }
        else if (mDt){ e.code='LOOP_BAD_DT'; e.meta={ dt:mDt[1] }; }
        else if (mMode || mRef){ e.code='EBADPARAMS'; }
        else if (mJson){ e.code='EBADJSON'; }
        else if (/EPY_MPL/i.test(err)) { e.code='EPY'; }
        else if (/EBADPARAMS/i.test(err)) { e.code='EBADPARAMS'; }
        else { e.code='EPY'; }
        return reject(e);
      }

      try {
        const res = JSON.parse(out); // { img, metrics }
        resolve(res);
      } catch (e) {
        reject(Object.assign(e, { code: 'EBADJSON' }));
      }
    });

    try {
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    } catch (e) {
      clearTimeout(to);
      reject(Object.assign(e, { code: 'EPIPE' }));
    }
  });
}

module.exports = { parseLoopArgs, handleLoopCommand };