// Read-only smoke test against a running development server or static export.
const base = process.argv[2] || 'http://localhost:4321';
const routes = ['/intro/', '/escena/1/', '/escena/2/', '/escena/3/', '/score/',
  '/calculo-score/', '/producto/1/', '/producto/2/', '/producto/3/', '/escena/8/',
  '/empresa/COMP_0945/', '/empresa/COMP_0640/', '/escena/4/', '/empresa/COMP_0054/',
  '/grupo/GROUP_0067/', '/empresa/COMP_0636/', '/monitor/', '/escena/5/', '/operaciones/', '/escena/6/', '/cierre/'];
for (const route of routes) {
  const response = await fetch(base + route);
  if (response.status !== 200) throw new Error(`${route}: ${response.status}`);
  const html = await response.text();
  if (!html.includes('Elkano')) throw new Error(`${route}: missing page content`);
  console.log('OK', route);
}
for (const name of ['zarpar', 'isla', 'estrellas', 'cofre', 'puerto', 'cierre']) {
  const response = await fetch(`${base}/video/${name}-seedance.mp4`, { headers: { Range: 'bytes=0-99' } });
  if (response.status !== 206) throw new Error(`${name}: byte-range support missing (${response.status})`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== 100) throw new Error(`${name}: wrong byte range`);
  const poster = await fetch(`${base}/video/${name}-seedance.jpg`);
  if (!poster.ok) throw new Error(`${name}: poster missing`);
  await poster.arrayBuffer();
  console.log('OK video, poster and seek support', name);
}
