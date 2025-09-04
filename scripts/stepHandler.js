// scripts/stepHandler.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Posicional: @step [A] [Kp Ki Kd] [t]  (zeta, wn como opcionales avanzados al final)
function parseStepArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  const nums = toks.map(s => Number(s));
  for (let i = 0; i < nums.length; i++) {
    if (!Number.isFinite(nums[i])) {
      return { ok: false, reason: 'bad_number', bad: toks[i] };
    }
  }

  // defaults
  let A = 1.0, Kp = 1.0, Ki = 0.0, Kd = 0.0, t = 8.0, zeta = 0.5, wn = 2.0;

  if (nums.length >= 1) A = nums[0];
  if (nums.length >= 2) Kp = nums[1];
  if (nums.length >= 3) Ki = nums[2];
  if (nums.length >= 4) Kd = nums[3];
  if (nums.length >= 5) t  = nums[4];
  if (nums.length >= 6) zeta = nums[5];     // avanzado (no documentado en noQuery)
  if (nums.length >= 7) wn   = nums[6];     // avanzado (no documentado en noQuery)

  return { ok: true, params: { A, Kp, Ki, Kd, t, zeta, wn } };
}

function resolvePyScript() {
  const bundled = path.join(__dirname, 'step_second_order.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'step_second_order.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

function handleStepCommand(params) {
  const outPng = path.join(os.tmpdir(), `step_${Date.now()}.png`);
  const payload = { ...params, out: outPng };
  const pyScript = resolvePyScript();

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [pyScript], { stdio: ['pipe','pipe','pipe'] });

    const CAP = 1_000_000;
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
        const mZ     = /EBADPARAMS:ZETA\s+zeta=(\S+)/i.exec(err || '');
        const mWn    = /EBADPARAMS:WN\s+wn=(\S+)/i.exec(err || '');
        const mJson  = /EBADJSON/i.test(err || '');

        if (mSteps) { e.code='STEP_TOO_MANY_STEPS'; e.meta={ steps:mSteps[1], t:mSteps[2], dt:mSteps[3] }; }
        else if (mT) { e.code='STEP_BAD_T'; e.meta={ t:mT[1] }; }
        else if (mDt){ e.code='STEP_BAD_DT'; e.meta={ dt:mDt[1] }; }
        else if (mZ) { e.code='STEP_BAD_ZETA'; e.meta={ zeta:mZ[1] }; }
        else if (mWn){ e.code='STEP_BAD_WN'; e.meta={ wn:mWn[1] }; }
        else if (mJson) { e.code='EBADJSON'; }
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

module.exports = { parseStepArgs, handleStepCommand };
