// scripts/armHandler.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** Parser: @arm n L1..Ln t1..tn [deg|rad]  (2<=n<=6)
 *  - valida que haya suficientes números
 *  - n fuera de rango y argumentos faltantes → noQueryArm (desde index)
 *  - NO valida unidades ni longitudes (>0): eso lo hace Python para tener índice/valor
 */
function parseArmArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  if (toks.length < 1) return { ok: false, reason: 'missing' };

  const n = Number(toks[0]);
  if (!Number.isInteger(n)) return { ok: false, reason: 'bad_n' };
  if (n < 2 || n > 6) return { ok: false, reason: 'n_range', n };

  // necesitamos 1 (n) + n (L) + n (ang) = 1+2n, más opcional units
  if (toks.length < 1 + 2*n) return { ok: false, reason: 'missing_args' };

  const lens = toks.slice(1, 1+n).map(Number);
  const angs = toks.slice(1+n, 1+2*n).map(Number);

  if (lens.some(x => !Number.isFinite(x))) return { ok: false, reason: 'bad_number_lengths' };
  if (angs.some(x => !Number.isFinite(x))) return { ok: false, reason: 'bad_number_angles' };

  const units = (toks[1+2*n] || 'deg').toLowerCase(); // lo validará Python

  return { ok: true, params: { n, lengths: lens, angles: angs, units } };
}

function resolvePyScript() {
  const bundled = path.join(__dirname, 'arm_nd.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'arm_nd.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

function handleArmCommand(params) {
  const outPng = path.join(os.tmpdir(), `arm_${Date.now()}.png`);
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
        const first = String(err || '').split(/\r?\n/).map(s=>s.trim()).find(Boolean) || '';
        const e = new Error(first || `python exited ${code}`);

        // Específicos primero
        const mIdx = /EBADPARAMS:LENS_IDX\s+i=(\d+)\s+val=(\S+)/i.exec(first);
        const mUnits = /EBADPARAMS:UNITS/i.test(first);
        const mBadJSON = /EBADJSON/i.test(first);
        const mBadParams = /EBADPARAMS/i.test(first);

        if (mIdx) { e.code = 'ARM_BAD_L_AT'; e.meta = { i: mIdx[1], val: mIdx[2] }; }
        else if (mUnits) { e.code = 'ARM_BAD_UNITS'; }
        else if (mBadJSON) { e.code = 'EBADJSON'; }
        else if (mBadParams) { e.code = 'EBADPARAMS'; }
        else { e.code = 'EPY'; }

        return reject(e);
      }

      try {
        const res = JSON.parse(out); // { img, ee:[x,y], joints:[...], params:{...} }
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

module.exports = { parseArmArgs, handleArmCommand };