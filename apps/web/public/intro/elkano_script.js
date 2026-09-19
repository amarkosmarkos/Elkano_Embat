(function(){
  const scene = document.getElementById('scene');
  const back = document.getElementById('back'), front = document.getElementById('front');
  const shipEl = document.getElementById('ship');
  const bctx = back.getContext('2d'), fctx = front.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- data ----------
  const N = MONTHLY.length;
  const norm = (arr) => { const mn = Math.min(...arr), mx = Math.max(...arr); return arr.map(v => (v - mn) / (mx - mn || 1) - 0.5); };
  const inflow = norm(MONTHLY.map(r => r[1]));
  const outflow = norm(MONTHLY.map(r => r[2]));
  const comps = norm(MONTHLY.map(r => r[4]));
  const netRaw = MONTHLY.map(r => r[1] - r[2]);
  const net = norm(netRaw);
  const MONTH_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const label = (m) => { const [y, mo] = m.split('-'); return MONTH_ES[+mo - 1] + ' ' + y.slice(2); };

  // cosine interpolation across a looping series, u in months (float)
  function sample(series, u){
    const L = series.length;
    let i = Math.floor(u); let f = u - i;
    i = ((i % L) + L) % L; const j = (i + 1) % L;
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return series[i] * (1 - s) + series[j] * s;
  }

  // ---------- layers ----------
  // off: offset below horizon; data: which series; damp: data amplitude; rip: ripple amp; par: parallax (0 far .. 1 near)
  const LAYERS = [
    { off: 0.00, data: comps,   damp: 18, rip: 3,  par: 0.25, col: [26, 52, 110], a: 0.95, font: 9,  ta: 0.22, n: 60 },
    { off: 0.09, data: inflow,  damp: 34, rip: 5,  par: 0.45, col: [22, 64, 132], a: 0.94, font: 10, ta: 0.32, n: 60 },
    { off: 0.20, data: net,     damp: 46, rip: 7,  par: 0.70, col: [24, 88, 150], a: 0.94, font: 12, ta: 0.42, n: 56 },
    { off: 0.36, data: outflow, damp: 58, rip: 9,  par: 1.00, col: [30, 118, 160], a: 0.90, font: 13, ta: 0.40, n: 30 },
  ];
  const SHIP_LAYER = 2;

  let W = 0, H = 0, dpr = 1, horizon = 0, pxPerMonth = 170, shipX = 0, shipW = 340;
  let scroll = 0;            // world px scrolled
  let t0 = performance.now();
  let mouse = 0;             // -1..1
  let stars = [];
  let rngSeed = 7;
  const rand = () => { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; };

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = scene.clientWidth; H = scene.clientHeight;
    for (const c of [back, front]) { c.width = W * dpr; c.height = H * dpr; }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    horizon = H * 0.50;
    pxPerMonth = Math.max(120, Math.min(200, W / 8));
    shipW = Math.max(190, Math.min(360, W * 0.30));
    shipX = W * (W < 640 ? 0.50 : 0.46);
    const svg = shipEl.querySelector('svg');
    svg.setAttribute('width', shipW); svg.setAttribute('height', shipW * 270 / 340);
    rngSeed = 7; stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: rand() * W, y: rand() * horizon * 0.9, r: rand() * 1.1 + 0.2, a: rand() * 0.6 + 0.2, p: rand() * 6.28 });
    seedParticles();
  }

  // surface y for layer at screen x, given scroll
  function surfY(L, x, time){
    const lay = LAYERS[L];
    const wx = x + scroll * lay.par;                 // world x
    const u = wx / pxPerMonth;
    const d = sample(lay.data, u) * -lay.damp;      // higher value => higher surface (negative y)
    const r = Math.sin(wx * 0.020 + time * 0.9) * lay.rip + Math.sin(wx * 0.047 - time * 1.4) * lay.rip * 0.45;
    return horizon + lay.off * H + d + r;
  }

  // ---------- particles (data in the water) ----------
  const particles = [];
  function money(s){ return s; }
  function makeText(L){
    const k = rand();
    if (k < 0.42) { const f = FRAGS[Math.floor(rand() * FRAGS.length)]; return { kind: 'tx', a: f[1], b: f[2], c: f[0] }; }
    if (k < 0.66) { const v = INV[Math.floor(rand() * INV.length)]; return { kind: 'inv', a: v[1], b: v[3], c: v[2] }; }
    if (k < 0.80) { const m = MONTHLY[Math.floor(rand() * N)]; return { kind: 'row', a: label(m[0]), b: m[1].toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' M', c: m[2].toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' M' }; }
    if (k < 0.90) { return { kind: 'spark', pts: Array.from({ length: 9 }, () => rand()) }; }
    return { kind: 'table', rows: 2 + Math.floor(rand() * 3) };
  }
  function seedParticles(){
    particles.length = 0; rngSeed = 99;
    LAYERS.forEach((lay, L) => {
      for (let i = 0; i < lay.n; i++) {
        particles.push({ L, wx: rand() * (W + 800) - 400, dy: L === 0 ? rand() * 24 + 6 : rand() * 70 + 8, t: makeText(L), ph: rand() * 6.28, gold: rand() < 0.14 });
      }
    });
  }

  function drawParticle(ctx, p, time){
    const lay = LAYERS[p.L];
    let x = p.wx - scroll * lay.par;
    const span = W + 800;
    x = ((x + 400) % span + span) % span - 400;          // wrap
    if (x < -260 || x > W + 60) return;
    const y = surfY(p.L, x, time) + p.dy + Math.sin(time * 0.7 + p.ph) * 1.5;
    const edge = Math.min(1, Math.max(0, (x + 200) / 200)) * Math.min(1, Math.max(0, (W + 40 - x) / 200));
    const alpha = lay.ta * edge * (0.75 + 0.25 * Math.sin(time * 0.5 + p.ph));
    ctx.globalAlpha = alpha;
    const col = p.gold ? '#d9a94b' : '#bfe3ea';
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.font = `300 ${lay.font}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
    ctx.textBaseline = 'middle';
    const t = p.t;
    if (t.kind === 'tx') {
      ctx.fillText(t.a, x, y);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillText(t.b, x + lay.font * 0.62 * (t.a.length + 2), y);
    } else if (t.kind === 'inv') {
      ctx.fillText(t.a + '   vto ' + t.b, x, y);
      ctx.globalAlpha = alpha * (t.c === 'overdue' ? 1 : 0.6);
      if (t.c === 'overdue') ctx.fillStyle = '#d9a94b';
      ctx.fillText(t.c === 'overdue' ? 'vencida' : (t.c === 'paid' ? 'pagada' : 'pendiente'), x + lay.font * 0.62 * (t.a.length + 10), y);
    } else if (t.kind === 'row') {
      ctx.fillText(t.a, x, y);
      ctx.fillText(t.b, x + lay.font * 5.2, y);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillText(t.c, x + lay.font * 10.4, y);
    } else if (t.kind === 'spark') {
      const w = lay.font * 9, h = lay.font * 1.6;
      ctx.beginPath();
      t.pts.forEach((v, i) => { const px = x + i / 8 * w, py = y + h / 2 - v * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w, y + h / 2 - t.pts[8] * h, 1.6, 0, 6.28); ctx.fill();
    } else if (t.kind === 'table') {
      const cw = lay.font * 2.6, rh = lay.font * 0.95;
      ctx.globalAlpha = alpha * 0.8;
      for (let r = 0; r < t.rows; r++) for (let c = 0; c < 4; c++) {
        const w = cw * (0.45 + ((r * 3 + c * 7) % 5) / 9);
        ctx.fillRect(x + c * cw, y + r * rh, w, 1);
      }
      ctx.fillRect(x, y - rh * 0.7, cw * 4 - 4, 1.2);
    }
    ctx.globalAlpha = 1;
  }

  function fillLayer(ctx, L, time){
    const lay = LAYERS[L];
    ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 4) ctx.lineTo(x, surfY(L, x, time));
    ctx.lineTo(W + 10, H + 10); ctx.closePath();
    const top = horizon + lay.off * H - 60;
    const g = ctx.createLinearGradient(0, top, 0, H);
    const [r, gg, b] = lay.col;
    g.addColorStop(0, `rgba(${r},${gg},${b},${lay.a})`);
    g.addColorStop(0.35, `rgba(${Math.round(r * 0.55)},${Math.round(gg * 0.55)},${Math.round(b * 0.6)},${lay.a})`);
    g.addColorStop(1, `rgba(6,10,20,${lay.a})`);
    ctx.fillStyle = g; ctx.fill();
    // crest highlight
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 4) { const y = surfY(L, x, time); x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = `rgba(143,214,220,${0.10 + L * 0.06})`; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawSky(ctx, time){
    const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    g.addColorStop(0, '#05070f'); g.addColorStop(0.55, '#0a1428'); g.addColorStop(1, '#173463');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars
    const px = mouse * 6;
    for (const s of stars) {
      const a = s.a * (0.6 + 0.4 * Math.sin(time * 0.8 + s.p));
      ctx.globalAlpha = a; ctx.fillStyle = '#efe3c6';
      ctx.beginPath(); ctx.arc(s.x + px * (s.r), s.y, s.r, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // rhumb lines from a compass point in the sky
    const cx = W * 0.78 + px * 2, cy = horizon * 0.42;
    ctx.strokeStyle = 'rgba(217,169,75,0.10)'; ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * W * 1.4, cy + Math.sin(a) * W * 1.4); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(217,169,75,0.22)';
    for (const r of [22, 46]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.stroke(); }
    ctx.fillStyle = 'rgba(217,169,75,0.9)';
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46); ctx.lineTo(cx + Math.cos(a + 0.4) * 10, cy + Math.sin(a + 0.4) * 10); ctx.lineTo(cx + Math.cos(a - 0.4) * 10, cy + Math.sin(a - 0.4) * 10); ctx.closePath(); ctx.fill(); }
    // horizon haze
    const hz = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 30);
    hz.addColorStop(0, 'rgba(23,52,99,0)'); hz.addColorStop(1, 'rgba(40,90,140,0.55)');
    ctx.fillStyle = hz; ctx.fillRect(0, horizon - 60, W, 90);
  }

  function drawWake(ctx, time){
    // trajectory behind the ship, along the ship layer surface
    const y0 = surfY(SHIP_LAYER, shipX, time);
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(0, 0, shipX, 0);
    g.addColorStop(0, 'rgba(217,169,75,0)'); g.addColorStop(1, 'rgba(217,169,75,0.85)');
    ctx.strokeStyle = g; ctx.beginPath();
    for (let x = 0; x <= shipX; x += 4) { const y = surfY(SHIP_LAYER, x, time) + 3; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // foam
    for (let x = shipX - 8; x > shipX - 260; x -= 22) {
      const a = (x - (shipX - 260)) / 260; ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = '#efe3c6'; ctx.beginPath(); ctx.arc(x, surfY(SHIP_LAYER, x, time) + 4 + Math.sin(x * 0.3 + time) * 2, 1.2, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // course ahead: dashed
    ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(217,169,75,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = shipX + shipW * 0.5; x <= W; x += 4) { const y = surfY(SHIP_LAYER, x, time) + 3; x === shipX + shipW * 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawRuler(ctx){
    // month ruler along the bottom, scrolling with the ship layer
    const y = H - 30, par = LAYERS[SHIP_LAYER].par;
    ctx.font = '300 10px "IBM Plex Mono", ui-monospace, Menlo, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(239,227,198,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const first = Math.floor((scroll * par) / pxPerMonth) - 1;
    for (let i = first; i < first + Math.ceil(W / pxPerMonth) + 3; i++) {
      const x = i * pxPerMonth - scroll * par;
      const idx = ((i % N) + N) % N;
      const isShip = Math.abs(x - shipX) < pxPerMonth / 2;
      ctx.strokeStyle = isShip ? '#d9a94b' : 'rgba(239,227,198,0.5)';
      ctx.beginPath(); ctx.moveTo(x, y - (isShip ? 9 : 5)); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = isShip ? '#d9a94b' : 'rgba(239,227,198,0.55)';
      ctx.fillText(label(MONTHLY[idx][0]), x, y + 6);
    }
    ctx.textAlign = 'left';
    // current month readout at the ruler's right
    const ui = ((Math.round((shipX + scroll * par) / pxPerMonth) % N) + N) % N;
    const m = MONTHLY[ui];
    const txt = `entradas ${m[1].toLocaleString('es-ES', { maximumFractionDigits: 0 })} M   salidas ${m[2].toLocaleString('es-ES', { maximumFractionDigits: 0 })} M   ${m[4]} empresas activas`;
    ctx.font = '300 10.5px "IBM Plex Mono", ui-monospace, Menlo, monospace'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(239,227,198,0.7)';
    if (W > 640) { const tw = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(6,10,20,0.55)'; ctx.fillRect(W - 32 - tw, y - 30, tw + 16, 20); ctx.fillStyle = 'rgba(239,227,198,0.75)'; ctx.textAlign = 'right'; ctx.fillText(txt, W - 24, y - 16); ctx.textAlign = 'left'; }
  }

  let sy = null, sa = 0;
  function placeShip(time){
    const x0 = shipX - 40, x1 = shipX + 40;
    const yA = surfY(SHIP_LAYER, x0, time), yB = surfY(SHIP_LAYER, x1, time);
    const y = (yA + yB) / 2, ang = Math.atan2(yB - yA, x1 - x0) * 0.8;
    if (sy === null) { sy = y; sa = ang; } else { sy += (y - sy) * 0.08; sa += (ang - sa) * 0.08; }
    const h = shipW * 270 / 340, wl = h * (196 / 270);
    shipEl.style.transformOrigin = `${shipW * 0.5}px ${wl}px`;
    shipEl.style.transform = `translate(${shipX - shipW * 0.5}px, ${sy - wl}px) rotate(${sa}rad)`;
  }

  function frame(now){
    const time = (now - t0) / 1000;
    if (!reduced) scroll = time * 22;
    bctx.clearRect(0, 0, W, H); fctx.clearRect(0, 0, W, H);
    drawSky(bctx, time);
    for (let L = 0; L < LAYERS.length; L++) {
      const ctx = L === LAYERS.length - 1 ? fctx : bctx;
      fillLayer(ctx, L, time);
      if (L === SHIP_LAYER) drawWake(ctx, time);
      for (const p of particles) if (p.L === L) drawParticle(ctx, p, time);
    }
    // depth vignette on front
    const v = fctx.createLinearGradient(0, H - 170, 0, H);
    v.addColorStop(0, 'rgba(6,10,20,0)'); v.addColorStop(1, 'rgba(6,10,20,0.85)');
    fctx.fillStyle = v; fctx.fillRect(0, H - 120, W, 120);
    drawRuler(fctx);
    placeShip(time);
    if (!reduced) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => { resize(); if (reduced) frame(t0); });
  scene.addEventListener('pointermove', (e) => { mouse = (e.clientX / W) * 2 - 1; }, { passive: true });
  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(frame)); else requestAnimationFrame(frame);
})();
