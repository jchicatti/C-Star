// scripts/scaraHandler.js
const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// parseo posicional: "@scara l1 l2 t1 t2 z [deg|rad]"
function parseScaraArgs(argsText) {
  const toks = (argsText || '').trim().split(/[\s,;]+/).filter(Boolean);
  if (toks.length < 5) return { ok: false, reason: 'missing' };

  const nums = toks.slice(0,5).map(Number);
  const [l1,l2,t1,t2,z] = nums;
  const units = (toks[5] || 'deg').toLowerCase();

  const okNums  = nums.every(n => Number.isFinite(n));
  if (!okNums)  return { ok:false, reason:'bad_numbers' };

  if (!(l1 > 0 && l2 > 0)) return { ok:false, reason:'bad_lens' };
  if (!['deg','rad'].includes(units)) return { ok:false, reason:'bad_units' };

  return { ok:true, params:{ l1,l2,t1,t2,z, units } };
}

function resolvePyScript() {
  const bundled = path.join(__dirname, 'scara_fk.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'scara_fk.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

// runner puro
function handleScaraCommand(params) {
  const outPng  = path.join(os.tmpdir(), `scara_${Date.now()}.png`);
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
    const to = setTimeout(() => { try { py.kill('SIGKILL'); } catch {} reject(Object.assign(new Error('timeout'), { code:'ETIMEDOUT' })); }, killAfterMs);

    py.on('close', (code) => {
      clearTimeout(to);
      if (code !== 0) {
        const e = new Error(err || `python exited ${code}`);
        if (/EBADPARAMS:LENS/i.test(err))   e.code = 'EBADPARAMS_LENS';
        else if (/EBADPARAMS:UNITS/i.test(err)) e.code = 'EBADPARAMS_UNITS';
        else if (/EBADPARAMS/i.test(err))   e.code = 'EBADPARAMS';
        else if (/EBADJSON/i.test(err))     e.code = 'EBADJSON';
        else e.code = 'EPY';
        return reject(e);
      }
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(Object.assign(e, { code: 'EBADJSON' }));
      }
    });

    try {
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    } catch (e) {
      clearTimeout(to);
      reject(Object.assign(e, { code:'EPIPE' }));
    }
  });
}

module.exports = { parseScaraArgs, handleScaraCommand };