// scripts/ikHandler.js
const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// parseo posicional: "@ik l1 l2 x y [deg|rad]"
function parseIKArgs(argsText) {
  const toks = (argsText || '').trim().split(/[\s,;]+/).filter(Boolean);
  if (toks.length < 4) return { ok: false, reason: 'missing' };

  const nums = toks.slice(0,4).map(Number);
  const [l1, l2, x, y] = nums;
  const units = (toks[4] || 'deg').toLowerCase();

  const okNums = nums.every(n => Number.isFinite(n));
  const okLens = Number.isFinite(l1) && l1 > 0 && Number.isFinite(l2) && l2 > 0;
  const okUnits = ['deg','rad'].includes(units);

  if (!okNums || !okLens || !okUnits) return { ok: false, reason: 'bad_params' };
  return { ok: true, params: { l1, l2, x, y, units } };
}

function resolvePyScript() {
  const bundled = path.join(__dirname, 'robot_ik2.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'robot_ik2.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

// runner puro: ejecuta python, timeout, caps, mapea errores
function handleIKCommand(params) {
  const outPng  = path.join(os.tmpdir(), `ik2_${Date.now()}.png`);
  const payload = { ...params, out: outPng };
  const pyScript = resolvePyScript();

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [pyScript], { stdio: ['pipe', 'pipe', 'pipe'] });

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
        if (/EUNREACHABLE/i.test(err)) e.code = 'EUNREACHABLE';
        else if (/EBADPARAMS/i.test(err)) e.code = 'EBADPARAMS';
        else if (/EBADJSON/i.test(err))   e.code = 'EBADJSON';
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
      reject(Object.assign(e, { code: 'EPIPE' }));
    }
  });
}

module.exports = { parseIKArgs, handleIKCommand };
