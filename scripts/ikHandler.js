// scripts/ikHandler.js
const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

/** Parser: @ik L1 L2 x y [deg|rad] */
function parseIKArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  if (toks.length < 4) return { ok: false, reason: 'missing' };

  // primeros 4 deben ser numéricos
  const nums = toks.slice(0, 4).map(Number);
  if (nums.some(n => !Number.isFinite(n))) {
    // identifica cuál falló para depurar (no lo usamos en mensaje)
    const badIdx = nums.findIndex(n => !Number.isFinite(n));
    return { ok: false, reason: 'nan', idx: badIdx };
  }

  const [l1, l2, x, y] = nums;
  // unidad opcional: la valida Python (así mantenemos una sola fuente de verdad)
  const units = (toks[4] || 'deg').toLowerCase();

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

/** Ejecuta el .py y mapea errores con meta para mensajes */
function handleIKCommand(params) {
  const outPng  = path.join(os.tmpdir(), `ik2_${Date.now()}.png`);
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
    const to = setTimeout(() => {
      try { py.kill('SIGKILL'); } catch {}
      reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    }, killAfterMs);

    py.on('close', (code) => {
      clearTimeout(to);

      if (code !== 0) {
        // toma una sola línea significativa de stderr para evitar ambigüedad
        const firstLine = String(err || '')
          .split(/\r?\n/)
          .map(s => s.trim())
          .find(s => s.length) || '';

        const e = new Error(firstLine || `python exited ${code}`);

        // matches específicos primero
        const mOut   = /EUNREACHABLE:OUT\s+r=(\S+)\s+rmin=(\S+)\s+rmax=(\S+)\s+delta=(\S+)/i.exec(firstLine);
        const mIn    = /EUNREACHABLE:IN\s+r=(\S+)\s+rmin=(\S+)\s+rmax=(\S+)\s+delta=(\S+)/i.exec(firstLine);
        const mLens  = /EBADPARAMS:LENS\s+(.+)/i.exec(firstLine);
        const mUnits = /EBADPARAMS:UNITS\s+units=(\S+)/i.exec(firstLine);
        const mBadJSON = /EBADJSON/i.test(firstLine);
        const mBadParams = /EBADPARAMS/i.test(firstLine);

        if (mOut) {
          e.code = 'IK_UNREACH_OUT';
          e.meta = { r: mOut[1], rmin: mOut[2], rmax: mOut[3], delta: mOut[4] };
        } else if (mIn) {
          e.code = 'IK_UNREACH_IN';
          e.meta = { r: mIn[1], rmin: mIn[2], rmax: mIn[3], delta: mIn[4] };
        } else if (mLens) {
          const dict = {};
          mLens[1].trim().split(/\s+/).forEach(p => {
            const mm = /^(\w+)=(\S+)$/.exec(p);
            if (mm) dict[mm[1]] = mm[2];
          });
          e.code = 'IK_BAD_LENGTHS';
          e.meta = dict; // p. ej., { l1: "-5.0" }
        } else if (mUnits) {
          e.code = 'IK_BAD_UNITS';
          e.meta = { units: mUnits[1] };
        } else if (mBadJSON) {
          e.code = 'EBADJSON';
        } else if (mBadParams) {
          e.code = 'EBADPARAMS';
        } else {
          e.code = 'EPY';
        }

        return reject(e);
      }

      try {
        const res = JSON.parse(out); // { img, solutions, units }
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

module.exports = { parseIKArgs, handleIKCommand };
