// scripts/driveHandler.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// parser: exige v, w, t, dt presentes y numéricos
function parseDriveArgs(argsText) {
  const out = {};
  for (const tok of (argsText || '').split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^([a-zA-Z_]\w*)=([^\s]+)$/);
    if (m) {
      const k = m[1];
      const raw = m[2];
      const n = Number(raw);
      out[k] = Number.isFinite(n) ? n : NaN; // forzamos numérico
    }
  }
  const required = ['v','w','t','dt'];
  const missing = required.filter(k => !(k in out));
  const bad = Object.entries(out).filter(([k,v]) => (['v','w','t','dt','x0','y0','th0'].includes(k) && !Number.isFinite(v)))
                                .map(([k]) => k);

  if (missing.length || bad.length) {
    return { ok: false, reason: { missing, bad } };
  }
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
        e.code = /EBADPARAMS/.test(err) ? 'EBADPARAMS'
             : /EBADJSON/.test(err)   ? 'EBADJSON'
             : 'EPY';
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
