// scripts/driveHandler.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// parser: exige v, w, t, dt presentes y numéricos
function parseDriveArgs(argsText) {
  const toks = (argsText || '').trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return { ok: false, reason: 'missing' };

  const out = {};
  const num = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:e[+\-]?\d+)?`;
  const reEq   = new RegExp(`^([a-zA-Z_][\\w]*)=(${num})$`, 'i');
  const reNoEq = new RegExp(`^([a-zA-Z]+)(${num})$`, 'i');
  const allowNoEq = new Set(['v','w','t','dt']);

  for (const tok of toks) {
    let m = reEq.exec(tok);
    if (!m) {
      const m2 = reNoEq.exec(tok);
      if (!m2) return { ok: false, reason: 'bad_token', tok };
      const k2 = m2[1].toLowerCase();
      if (!allowNoEq.has(k2)) return { ok: false, reason: 'bad_noeq_key', tok };
      m = [tok, m2[1], m2[2]];
    }
    const k = m[1].toLowerCase();
    const v = Number(m[2]);
    if (!Number.isFinite(v)) return { ok: false, reason: 'nan', k, val: m[2] };
    out[k] = v;
  }
  for (const k of ['v','w','t','dt']) if (!(k in out)) return { ok: false, reason: 'missing_key', k };
  out.x0  = ('x0'  in out) ? out.x0  : 0;
  out.y0  = ('y0'  in out) ? out.y0  : 0;
  out.th0 = ('th0' in out) ? out.th0 : 0;

  return { ok: true, params: out };
}

// resuelve ruta del .py y la copia a tmp cuando corre con pkg
function resolvePyScript() {
  const bundled = path.join(__dirname, 'robot_drive.py');
  if (process.pkg) {
    const tmp = path.join(os.tmpdir(), 'robot_drive.py');
    if (!fs.existsSync(tmp)) fs.copyFileSync(bundled, tmp);
    return tmp;
  }
  return bundled;
}

// ejecutor: corre el .py y devuelve datos crudos; sin replies ni mensajes
function handleDriveCommand(params) {
  const outPng = path.join(os.tmpdir(), `drive_${Date.now()}.png`);
  const payload = { ...params, out: outPng };
  const pyScript = resolvePyScript();

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [pyScript], { stdio: ['pipe', 'pipe', 'pipe'] });

    const CAP = 1_000_000; // 1 MB
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
		const mT = /EBADPARAMS:T_NONPOS\s+t=(\S+)/i.exec(err || '');
		const mDt= /EBADPARAMS:DT_NONPOS\s+dt=(\S+)/i.exec(err || '');
		if (mSteps) { e.code='DRIVE_TOO_MANY_STEPS'; e.meta={ steps:mSteps[1], t:mSteps[2], dt:mSteps[3] }; }
		else if (mT) { e.code='DRIVE_BAD_T'; e.meta={ t:mT[1] }; }
		else if (mDt){ e.code='DRIVE_BAD_DT'; e.meta={ dt:mDt[1] }; }
		else if (/ENOMOTION/i.test(err)) e.code='DRIVE_NOMOTION';
		else if (/EBADJSON/i.test(err))  e.code='EBADJSON';
		else if (/EBADPARAMS/i.test(err))e.code='EBADPARAMS';
		else e.code='EPY';
		return reject(e);
      }
      try {
        const res = JSON.parse(out);
        resolve({
          img: res.img,
          final_pose: (res.final_pose || []).map(Number),
          samples: Number(res.samples),
          params: res.params
        });
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

module.exports = { parseDriveArgs, handleDriveCommand };
