let DATA = null; // isi dari data.json setelah fetch berhasil

const pageContent = document.getElementById('pageContent');
const navList = document.getElementById('navList');
const backdrop = document.getElementById('modalBackdrop');

// Catatan: fetch('data.json') butuh halaman diakses lewat http(s), bukan
// file:// langsung. Jalankan `python3 -m http.server` di folder ini lalu buka
// localhost, atau push ke GitHub Pages — di situ fetch()-nya jalan normal.
fetch('data.json')
  .then(res => {
    if (!res.ok) throw new Error('data.json tidak ditemukan (HTTP ' + res.status + ')');
    return res.json();
  })
  .then(data => {
    DATA = data;
    buildNav();
    switchTab('sma'); // mulai di tab yang datanya udah lengkap
  })
  .catch(err => {
    pageContent.innerHTML = `
      <header><h1>Gagal memuat data</h1></header>
      <div class="card">
        <p><strong>${err.message}</strong></p>
        <p class="empty-state">
          Kalau ini muncul pas buka index.html langsung dari file explorer: itu wajar,
          browser memblokir fetch() dari file lokal. Jalankan lewat server kecil
          (misalnya <code>python3 -m http.server</code> lalu buka localhost),
          atau langsung push ke GitHub Pages.
        </p>
      </div>`;
  });

function buildNav(){
  const icons = { home: '🏠' };
  const labels = { home: 'Home' };
  const order = ['home', 'sd', 'smp', 'sma', 'kuliah'];
  navList.innerHTML = order.map(key => {
    const icon = key === 'home' ? icons.home : DATA.schools[key].icon;
    const label = key === 'home' ? labels.home : DATA.schools[key].name;
    return `<li class="nav-item" data-tab="${key}" onclick="switchTab('${key}', this)">${icon} ${label}</li>`;
  }).join('');
}

// ---------- render: HOME ----------
function renderHome(){
  const sma = DATA.schools.sma;
  const last = sma.overallAvg[sma.overallAvg.length - 1];
  const totalReady = Object.values(DATA.schools).filter(s => s.ready).length;
  const totalSchools = Object.keys(DATA.schools).length;

  pageContent.innerHTML = `
    <header>
      <div class="title-block">
        <div class="eyebrow">Arsip Akademik</div>
        <h1>Ringkasan</h1>
        <div class="subtitle">Overview perjalanan akademik dari SD sampai Perguruan Tinggi.</div>
      </div>
    </header>
    <div class="card">
      <h2><span class="idx">00</span> Statistik</h2>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-val">${totalReady} / ${totalSchools}</div><div class="stat-lbl">Jenjang Terdata</div></div>
        <div class="stat-box"><div class="stat-val">${sma.overallAvg.length}</div><div class="stat-lbl">Periode Terdata (SMA)</div></div>
        <div class="stat-box"><div class="stat-val">${last.toFixed(2)}</div><div class="stat-lbl">Rerata Terakhir (SMA)</div></div>
      </div>
    </div>
    <div class="card">
      <h2><span class="idx">01</span> Daftar Jenjang</h2>
      <div class="grid">
        ${Object.entries(DATA.schools).map(([key, s]) => `
          <div class="subj-card" data-goto="${key}">
            <div class="subj-top"><div class="subj-name">${s.icon} ${s.name}</div></div>
            <div class="subj-cat">${s.ready ? (s.subjects.length + ' mapel · ' + s.overallAvg.length + ' semester') : 'Belum ada data'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  pageContent.querySelectorAll('[data-goto]').forEach(el => {
    el.onclick = () => switchTab(el.dataset.goto);
  });
}

// ---------- render: SEGERA HADIR ----------
function renderComingSoon(key){
  const s = DATA.schools[key];
  pageContent.innerHTML = `
    <header>
      <div class="title-block">
        <div class="eyebrow">${s.name}</div>
        <h1>Segera Hadir</h1>
        <div class="subtitle">Rekap nilai untuk jenjang ini belum ditambahkan.</div>
      </div>
    </header>
    <div class="card">
      <p class="empty-state">Kirim rekap rapor ${s.name} (nilai per semester/mapel) ke data.json, nanti grafiknya otomatis muncul kayak MAN 1 Kebumen.</p>
    </div>
  `;
}

// ---------- render: sekolah dengan data lengkap (dipakai untuk SMA, dan jenjang lain nanti kalau udah ready) ----------
function renderSchool(key){
  const s = DATA.schools[key];
  const periods = DATA.periods;
  const periodsShort = periods.map(p => p.replace('Semester ', 'S'));

  pageContent.innerHTML = `
    <header>
      <div class="title-block">
        <div class="eyebrow">${s.name} · Rekap Rapor · ${periods.length} Periode</div>
        <h1>Perkembangan Nilai</h1>
        <div class="subtitle">Grafik interaktif dari rekap nilai rapor, ${s.subjects.length} mata pelajaran sepanjang ${periods.length} periode penilaian.</div>
      </div>
      <div class="seal">
        <div class="num" id="sealNum">—</div>
        <div class="lbl">Rerata Terakhir</div>
        <div class="delta" id="sealDelta">—</div>
      </div>
    </header>

    <div class="card">
      <h2><span class="idx">01</span> Rerata Keseluruhan per Periode</h2>
      <div class="chart-box"><svg id="overallChart"></svg></div>
    </div>

    <div class="card">
      <h2><span class="idx">02</span> Nilai per Mata Pelajaran</h2>
      <div class="controls" id="catFilters"></div>
      <div class="grid" id="subjGrid"></div>
    </div>
  `;

  const last = s.overallAvg[s.overallAvg.length - 1];
  const prev = s.overallAvg[s.overallAvg.length - 2];
  document.getElementById('sealNum').textContent = last.toFixed(2);
  const diff = (last - prev).toFixed(2);
  const sealDelta = document.getElementById('sealDelta');
  sealDelta.textContent = (diff >= 0 ? '▲ +' : '▼ ') + diff + ` vs ${periodsShort[periodsShort.length - 2]}`;
  if (diff < 0) sealDelta.classList.add('down');

  drawChart(document.getElementById('overallChart'), s.overallAvg, periods, periodsShort, { color: '#4FA3C7', fill: true, showAxis: true, showPoints: true, range: [80, 100] });

  const cats = ["Semua", ...new Set(s.subjects.map(x => x.cat))];
  const filterBar = document.getElementById('catFilters');
  let activeCat = "Semua";
  const grid = document.getElementById('subjGrid');

  function renderGrid(){
    grid.innerHTML = '';
    s.subjects.filter(x => activeCat === "Semua" || x.cat === activeCat).forEach(x => {
      const { avg, d, cls, arrow } = trendInfo(x.vals);
      const card = document.createElement('div');
      card.className = 'subj-card';
      card.innerHTML = `
        <div class="subj-top"><div class="subj-name">${x.name}</div><div class="subj-cat">${x.cat}</div></div>
        <div class="subj-stats"><div class="subj-avg">${avg.toFixed(1)}</div><div class="subj-trend ${cls}">${arrow} ${Math.abs(d).toFixed(1)}</div></div>
        <svg class="spark"></svg>
      `;
      card.onclick = () => openModal(x.name, x.cat, x.vals, periods, DATA.catColors);
      grid.appendChild(card);
      drawChart(card.querySelector('.spark'), x.vals, periods, periodsShort, { color: DATA.catColors[x.cat], fill: true, showAxis: false, showPoints: false });
    });
  }

  cats.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (c === activeCat ? ' active' : '');
    b.textContent = c;
    b.onclick = () => {
      activeCat = c;
      [...filterBar.children].forEach(ch => ch.classList.remove('active'));
      b.classList.add('active');
      renderGrid();
    };
    filterBar.appendChild(b);
  });

  renderGrid();
}

function trendInfo(vals){
  const nonNull = vals.filter(v => v !== null);
  const avg = nonNull.reduce((a, b) => a + b, 0) / nonNull.length;
  const d = nonNull[nonNull.length - 1] - nonNull[0];
  let cls = 'flat', arrow = '→';
  if (d > 0.5) { cls = 'up'; arrow = '↑'; }
  else if (d < -0.5) { cls = 'down'; arrow = '↓'; }
  return { avg, d, cls, arrow };
}

// ---------- Modal ----------
function openModal(name, cat, vals, periods, catColors){
  document.getElementById('modalTitle').textContent = name;
  document.getElementById('modalCat').textContent = cat;
  backdrop.classList.add('open');
  const periodsShort = periods.map(p => p.replace('Semester ', 'S'));
  drawChart(document.getElementById('modalChart'), vals, periods, periodsShort, { color: catColors[cat], fill: true, showAxis: true, showPoints: true });
  document.getElementById('modalTable').innerHTML = periods.map((p, i) => `<tr><td>${p}</td><td>${vals[i] === null ? '—' : vals[i]}</td></tr>`).join('');
}
document.getElementById('modalClose').onclick = () => backdrop.classList.remove('open');
backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.classList.remove('open'); };

// ---------- Tab switching ----------
function switchTab(key, elem){
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = elem || document.querySelector(`.nav-item[data-tab="${key}"]`);
  if (navEl) navEl.classList.add('active');

  if (key === 'home') renderHome();
  else if (DATA.schools[key] && DATA.schools[key].ready) renderSchool(key);
  else renderComingSoon(key);

  if (window.innerWidth <= 768) setNavOpen(false);
}

// ---------- Sidebar toggle ----------
const mainNav = document.getElementById('mainNav');
const navOpenBtn = document.getElementById('navOpenBtn');
const navCloseBtn = document.getElementById('navCloseBtn');
function setNavOpen(open){
  mainNav.classList.toggle('collapsed', !open);
  navOpenBtn.classList.toggle('show', !open);
}
navCloseBtn.onclick = () => setNavOpen(false);
navOpenBtn.onclick = () => setNavOpen(true);
if (window.innerWidth <= 768) setNavOpen(false);

// ---------- dependency-free SVG line chart engine ----------
const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs){
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function niceRange(values){
  const nn = values.filter(v => v !== null && v !== undefined);
  let lo = Math.min(...nn), hi = Math.max(...nn);
  const pad = Math.max(1.2, (hi - lo) * 0.25);
  lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
  if (hi - lo < 4) hi = lo + 4;
  return [lo, hi];
}
function drawChart(svg, values, periods, periodsShort, opts){
  opts = Object.assign({ color: '#4FA3C7', fill: true, showAxis: true, showPoints: true }, opts);
  const [min, max] = opts.range || niceRange(values);
  const W = 600, H = opts.showAxis ? 260 : 40;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '';

  const padL = opts.showAxis ? 34 : 1, padR = 8, padT = 10, padB = opts.showAxis ? 22 : 1;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = periods.length;
  const xStep = innerW / (n - 1);
  const yScale = v => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xScale = i => padL + i * xStep;

  if (opts.showAxis) {
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const v = min + (max - min) * s / steps;
      const y = yScale(v);
      svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: '#282C31', 'stroke-width': 1 }));
      const t = svgEl('text', { x: padL - 6, y: y + 3, 'text-anchor': 'end', 'font-size': 10, 'font-family': "'IBM Plex Mono',monospace", fill: '#8A8F94' });
      t.textContent = Math.round(v);
      svg.appendChild(t);
    }
    periodsShort.forEach((p, i) => {
      const t = svgEl('text', { x: xScale(i), y: H - 6, 'text-anchor': 'middle', 'font-size': 10, 'font-family': "'IBM Plex Mono',monospace", fill: '#8A8F94' });
      t.textContent = p;
      svg.appendChild(t);
    });
  }

  const pts = values.map((v, i) => (v === null || v === undefined) ? null : { x: xScale(i), y: yScale(v), v, i }).filter(Boolean);
  if (pts.length === 0) return;

  if (opts.fill) {
    const baseline = padT + innerH;
    let d = `M ${pts[0].x} ${baseline} `;
    pts.forEach(p => d += `L ${p.x} ${p.y} `);
    d += `L ${pts[pts.length - 1].x} ${baseline} Z`;
    svg.appendChild(svgEl('path', { d, fill: opts.color + '26', stroke: 'none' }));
  }

  let d = `M ${pts[0].x} ${pts[0].y} `;
  for (let i = 1; i < pts.length; i++) d += `L ${pts[i].x} ${pts[i].y} `;
  svg.appendChild(svgEl('path', { d, fill: 'none', stroke: opts.color, 'stroke-width': opts.showAxis ? 2.5 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

  if (opts.showPoints) {
    pts.forEach(p => {
      const c = svgEl('circle', { cx: p.x, cy: p.y, r: 5, fill: opts.color, stroke: '#1C2024', 'stroke-width': 1.5 });
      const title = svgEl('title', {});
      title.textContent = `${periods[p.i]}: ${p.v}`;
      c.appendChild(title);
      svg.appendChild(c);
    });
  }
}
