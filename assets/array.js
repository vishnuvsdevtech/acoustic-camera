/* Acoustic camera — array response, computed honestly.
 *
 * For N mics spaced d, steered to φ while the source is at θ:
 *     R(φ) = |Σ_n exp(j·k·d·n·(sinθ − sinφ))| / N,   k = 2πf/c
 * That is delay-and-sum in the frequency domain. The beam points at θ by
 * construction; the interesting part is what else it points at — grating lobes
 * when d > λ/2, and a beam that widens until it resolves nothing as the
 * aperture falls below a wavelength.
 */
(() => {
  const C = 343;                     // speed of sound, m/s
  const scene = document.getElementById('scene');
  const resp = document.getElementById('resp');
  const sctx = scene.getContext('2d');
  const rctx = resp.getContext('2d');

  const S = { n: 8, d: 0.080, f: 2000, srcDeg: 32, peak: 0 };

  const el = (id) => document.getElementById(id);
  const rad = (x) => (x * Math.PI) / 180;
  const deg = (x) => (x * 180) / Math.PI;

  /* ---------------------------------------------------------- physics */
  function response(phiDeg) {
    const k = (2 * Math.PI * S.f) / C;
    const st = Math.sin(rad(S.srcDeg));
    const sp = Math.sin(rad(phiDeg));
    let re = 0, im = 0;
    for (let n = 0; n < S.n; n++) {
      const ph = k * S.d * n * (st - sp);
      re += Math.cos(ph);
      im += Math.sin(ph);
    }
    return Math.hypot(re, im) / S.n;      // 0..1
  }

  function scan() {
    const out = [];
    for (let a = -90; a <= 90; a += 0.5) out.push([a, response(a)]);
    return out;
  }

  const peakOf = (curve) => curve.reduce((b, p) => (p[1] > b[1] ? p : b), curve[0]);

  function beamwidthDeg() {
    const lambda = C / S.f;
    const x = lambda / (S.n * S.d);
    if (x >= 1) return 180;
    return 2 * deg(Math.asin(x));
  }

  /* ------------------------------------------------------------ scene */
  function drawScene() {
    const W = scene.width, H = scene.height;
    const cx = W / 2, cy = H - 46;
    const wallY = 96;

    sctx.clearRect(0, 0, W, H);

    // room
    const g = sctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070d11');
    g.addColorStop(1, '#04070a');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, W, H);

    // pipework, so it reads as a plant room rather than an empty box
    sctx.strokeStyle = 'rgba(120,170,185,.14)';
    sctx.lineWidth = 10;
    sctx.beginPath();
    sctx.moveTo(60, wallY + 14); sctx.lineTo(W - 60, wallY + 14);
    sctx.moveTo(200, wallY + 14); sctx.lineTo(200, H - 120);
    sctx.moveTo(W - 300, wallY + 14); sctx.lineTo(W - 300, H - 120);
    sctx.stroke();
    sctx.lineWidth = 1;
    sctx.strokeStyle = 'rgba(190,235,245,.10)';
    sctx.beginPath(); sctx.moveTo(0, wallY); sctx.lineTo(W, wallY); sctx.stroke();

    // source position from the angle
    const sy = wallY + 60;
    const sx = cx + Math.tan(rad(S.srcDeg)) * (cy - sy);

    const curve = scan();
    const pk = peakOf(curve);
    S.peak = pk[0];

    // beam wedge from the array to the estimated bearing
    const bw = rad(Math.max(1.5, beamwidthDeg() / 2));
    const beamA = -Math.PI / 2 + rad(pk[0]);      // 0 deg = straight up, +ve = right
    sctx.save();
    sctx.translate(cx, cy);
    const grad = sctx.createRadialGradient(0, 0, 8, 0, 0, cy - wallY);
    grad.addColorStop(0, 'rgba(67,224,208,.30)');
    grad.addColorStop(1, 'rgba(67,224,208,0)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.moveTo(0, 0);
    sctx.arc(0, 0, cy - wallY + 40, beamA - bw, beamA + bw);
    sctx.closePath();
    sctx.fill();
    sctx.restore();

    // true source
    sctx.save();
    sctx.shadowColor = 'rgba(232,178,92,.9)';
    sctx.shadowBlur = 26;
    sctx.fillStyle = '#e8b25c';
    sctx.beginPath(); sctx.arc(sx, sy, 7, 0, Math.PI * 2); sctx.fill();
    sctx.restore();
    sctx.font = '600 11px ui-monospace, monospace';
    sctx.fillStyle = 'rgba(232,178,92,.85)';
    sctx.fillText('SOURCE  ' + S.srcDeg + '°', sx + 14, sy + 4);

    // array
    const span = (S.n - 1) * 34;
    const x0 = cx - span / 2;
    sctx.fillStyle = '#0b1519';
    sctx.strokeStyle = 'rgba(190,235,245,.22)';
    sctx.lineWidth = 1;
    sctx.beginPath();
    sctx.roundRect ? sctx.roundRect(x0 - 22, cy - 12, span + 44, 26, 8) : sctx.rect(x0 - 22, cy - 12, span + 44, 26);
    sctx.fill(); sctx.stroke();
    for (let i = 0; i < S.n; i++) {
      const x = x0 + i * 34;
      sctx.fillStyle = '#43e0d0';
      sctx.beginPath(); sctx.arc(x, cy, 4, 0, Math.PI * 2); sctx.fill();
      // wavefronts: the whole point is the arrival-time difference
      sctx.strokeStyle = 'rgba(67,224,208,.18)';
      sctx.beginPath(); sctx.arc(x, cy, 9 + ((S.f / 8) % 12), 0, Math.PI * 2); sctx.stroke();
    }
    sctx.fillStyle = 'rgba(108,135,146,.9)';
    sctx.font = '10px ui-monospace, monospace';
    sctx.fillText(`${S.n} MICS · ${Math.round(S.d * 1000)} mm · ${Math.round((S.n - 1) * S.d * 100) / 100} m aperture`, x0 - 20, cy + 34);
  }

  /* --------------------------------------------------------- response */
  function drawResp() {
    const W = resp.width, H = resp.height;
    const pad = 26;
    const curve = scan();
    rctx.clearRect(0, 0, W, H);

    // grid
    rctx.strokeStyle = 'rgba(190,235,245,.08)';
    rctx.lineWidth = 1;
    for (let a = -90; a <= 90; a += 30) {
      const x = pad + ((a + 90) / 180) * (W - pad * 2);
      rctx.beginPath(); rctx.moveTo(x, 12); rctx.lineTo(x, H - 18); rctx.stroke();
    }

    // curve, coloured red where a side lobe exceeds 0.5 — those are the ghosts
    const yOf = (v) => H - 18 - v * (H - 40);
    rctx.beginPath();
    curve.forEach(([a, v], i) => {
      const x = pad + ((a + 90) / 180) * (W - pad * 2);
      i ? rctx.lineTo(x, yOf(v)) : rctx.moveTo(x, yOf(v));
    });
    rctx.strokeStyle = '#43e0d0';
    rctx.lineWidth = 2;
    rctx.stroke();

    // fill under
    rctx.lineTo(W - pad, H - 18);
    rctx.lineTo(pad, H - 18);
    rctx.closePath();
    rctx.fillStyle = 'rgba(67,224,208,.10)';
    rctx.fill();

    // true angle marker
    const xt = pad + ((S.srcDeg + 90) / 180) * (W - pad * 2);
    rctx.strokeStyle = 'rgba(232,178,92,.8)';
    rctx.setLineDash([4, 4]);
    rctx.beginPath(); rctx.moveTo(xt, 10); rctx.lineTo(xt, H - 18); rctx.stroke();
    rctx.setLineDash([]);

    // peak marker
    const pk = peakOf(curve);
    const xp = pad + ((pk[0] + 90) / 180) * (W - pad * 2);
    rctx.fillStyle = '#43e0d0';
    rctx.beginPath(); rctx.arc(xp, yOf(pk[1]), 4, 0, Math.PI * 2); rctx.fill();

    // label the biggest aliased lobe if there is one
    const lambda = C / S.f;
    if (S.d > lambda / 2) {
      rctx.fillStyle = 'rgba(239,122,122,.9)';
      rctx.font = '600 11px ui-monospace, monospace';
      rctx.fillText('GRATING LOBES — d > λ/2', pad + 4, 22);
    }
  }

  /* ---------------------------------------------------------- readouts */
  function readouts() {
    const lambda = C / S.f;
    const bw = beamwidthDeg();
    const ratio = S.d / (lambda / 2);
    const alias = ratio > 1;
    el('nVal').textContent = S.n;
    el('dVal').textContent = Math.round(S.d * 1000) + ' mm';
    el('fVal').textContent = Math.round(S.f) + ' Hz';
    el('aVal').textContent = S.srcDeg + '°';
    el('spN').textContent = S.n + ' mics';
    el('spD').textContent = Math.round(S.d * 1000) + ' mm';
    el('spF').textContent = (S.f / 1000).toFixed(1) + ' kHz';
    el('spRes').textContent = bw > 90 ? 'no resolution' : bw.toFixed(1) + '° beam';

    const w = el('warning');
    w.className = 'badge ' + (alias ? 'bad' : 'ok');
    w.textContent = alias
      ? `ALIASED · d = ${ratio.toFixed(2)} × λ/2`
      : `CLEAN · d = ${ratio.toFixed(2)} × λ/2`;

    el('readout').innerHTML =
      `<span>true <b>${S.srcDeg}°</b></span>` +
      `<span>detected <b>${S.peak.toFixed(1)}°</b></span>` +
      `<span>error <b>${Math.abs(S.peak - S.srcDeg).toFixed(1)}°</b></span>` +
      `<span>beamwidth <b>${bw > 90 ? '—' : bw.toFixed(1) + '°'}</b></span>` +
      `<span>aperture <b>${((S.n - 1) * S.d).toFixed(2)} m</b></span>` +
      `<span>λ/2 <b>${(lambda / 2 * 1000).toFixed(1)} mm</b></span>`;
  }

  function render() { drawScene(); drawResp(); readouts(); }

  /* ----------------------------------------------------------- inputs */
  const bind = (id, key, scale) => {
    const input = el(id);
    input.addEventListener('input', () => {
      S[key] = parseFloat(input.value) * (scale || 1);
      render();
    });
  };
  bind('n', 'n');
  bind('d', 'd', 0.001);
  bind('f', 'f');
  bind('a', 'srcDeg');

  scene.addEventListener('pointerdown', (ev) => {
    const r = scene.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * scene.width;
    const cx = scene.width / 2;
    const cy = scene.height - 46;
    const sy = 96 + 60;
    S.srcDeg = Math.max(-80, Math.min(80, Math.round(deg(Math.atan2(x - cx, cy - sy)))));
    el('a').value = String(S.srcDeg);
    render();
  });
  scene.style.cursor = 'crosshair';

  render();
})();
