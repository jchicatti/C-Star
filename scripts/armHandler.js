// scripts/armHandler.js
const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// -------- parsing & validation (posicional) --------
// argsText: "N l1 .. lN t1 .. tN [deg|rad]"
function parseArmArgs(argsText) {
  const toks = (argsText || '').trim().split(/[\s,;]+/).filter(Boolean);
  if (toks.length < 1) return { ok: false, reason: 'missing_n' };

  const n = Number(toks[0]);
  if (!Number.isFinite(n) || n % 1 !== 0 || n < 2 || n > 6) {
    return { ok: false, reason: 'bad_n' };
  }
  const need = 1 + 2*n; // N + N lengths + N angles
  if (toks.length < need) return { ok: false, reason: 'too_few_tokens' };

  const lengths = toks.slice(1, 1+n).map(Number);
  const angles  = toks.slice(1+n, 1+2*n).map(Number);
  const units   = (toks[need] || 'deg').toLowerCase();

  const goodLengths = lengths.length === n && lengths.every(x => Number.isFinite(x) && x > 0);
  const goodAngles  = angles.length  === n && angles.every(x => Number.isFinite(x));
  const unitsOk     = ['deg','rad'].includes(units);

  if (!goodLengths || !goodAngles || !unitsOk) {
    return { ok: false, reason: 'bad_params' };
  }
  return { ok: true, params: { n, lengths, angles, units } };
}

// -------- runner (puro, sin side-effects de WhatsApp) --------
function resolvePyScript() {
  const bundled = path.join(__dirname, 'arm_nd.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'arm_nd.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

/**
 * ejecuta arm_nd.py con { n, lengths, angles, units } y devuelve:
 * { img, ee:[x,y], joints:[[x0,y0],...,[xN,yN]], params }
 */
function handleArmCommand(params) {
  const outPng  = path.join(os.tmpdir(), `arm_${Date.now()}.png`);
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
        e.code = /EBADPARAMS/.test(err) ? 'EBADPARAMS'
             : /EBADJSON/.test(err)   ? 'EBADJSON'
             : 'EPY';
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

module.exports = { parseArmArgs, handleArmCommand };