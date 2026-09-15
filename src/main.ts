import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CollisionLab, type LabParameters } from './scene/CollisionLab';
import { MATERIALS, type MaterialKey } from './materials/materialLibrary';
import type { CollisionMode } from './physics/collision';

const app = document.querySelector<HTMLDivElement>('#app')!;

const defaultParams: LabParameters = {
  mode: 'elastic',
  massA: 1.5,
  massB: 2,
  velocityA: 4.8,
  velocityB: -2,
  materialA: 'rubber',
  materialB: 'glass',
  partialRestitution: 0.55,
  autoMaterialRestitution: true,
  timeScale: 1,
  showVectors: true,
  showLabels: true,
};

let params: LabParameters = { ...defaultParams };
let cleanupLab: (() => void) | null = null;
let cleanupLanding: (() => void) | null = null;

function landingTemplate(): string {
  return `
  <div class="atl-page">
    <div class="atl-scroll-progress" aria-hidden="true"><span data-scroll-progress></span></div>

    <header class="atl-nav">
      <a class="atl-brand" href="#top" aria-label="AR Tumbukan 3D">
        <span class="atl-brand-symbol"><i></i><i></i></span>
        <span>AR Tumbukan <b>3D</b></span>
      </a>
      <nav class="atl-nav-links" aria-label="Navigasi utama">
        <a href="#timeline">Kronologi</a>
        <a href="#material">Material</a>
        <a href="#physics">Fisika</a>
      </nav>
      <button class="atl-nav-cta" data-open-lab><span>Open Lab</span><span aria-hidden="true">↗</span></button>
    </header>

    <main id="top">
      <section class="atl-hero">
        <div class="atl-hero-copy">
          <div class="atl-overline"><span class="atl-live-dot"></span> Interactive Physics Experience</div>
          <h1><span>Collision</span><span class="atl-outline">in three</span><span>dimensions.</span></h1>
          <p class="atl-lead">Jelajahi tumbukan dari kondisi awal, momen impact, hingga gerak akhir. Satu laboratorium visual untuk memahami momentum, energi kinetik, dan koefisien restitusi.</p>
          <div class="atl-stats" aria-label="Ringkasan laboratorium">
            <div><strong>03</strong><span>jenis tumbukan</span></div>
            <div><strong>05</strong><span>material fisik</span></div>
            <div><strong>3D</strong><span>+ augmented reality</span></div>
          </div>
          <div class="atl-actions">
            <button class="atl-primary" data-open-lab>Mulai eksperimen <span>↗</span></button>
            <a class="atl-text-link" href="#timeline">Jelajahi kronologi <span>↓</span></a>
          </div>
        </div>

        <div class="atl-hero-stage" aria-hidden="true">
          <div class="atl-stage-grid"></div>
          <div class="atl-stage-axis atl-axis-x"><span>x</span></div>
          <div class="atl-stage-axis atl-axis-y"><span>y</span></div>
          <div class="atl-stage-ring ring-a"></div>
          <div class="atl-stage-ring ring-b"></div>
          <div class="atl-stage-ball atl-ball-a"><span>A</span></div>
          <div class="atl-stage-ball atl-ball-b"><span>B</span></div>
          <div class="atl-impact-core"><i></i><i></i><i></i></div>
          <div class="atl-vector atl-vector-a"><b>v₁</b></div>
          <div class="atl-vector atl-vector-b"><b>v₂</b></div>
          <div class="atl-stage-data data-a"><span>MASS A</span><b>1.5 kg</b></div>
          <div class="atl-stage-data data-b"><span>MASS B</span><b>2.0 kg</b></div>
          <div class="atl-stage-caption">Realtime collision model · procedural material · vector analysis</div>
        </div>
      </section>

      <section class="atl-scroll-intro">
        <div><span>Scroll into the collision</span><small>Fisika dulu. Alat eksperimen tersedia di akhir.</small></div>
        <div class="atl-scroll-arrow" aria-hidden="true">↓</div>
      </section>

      <section class="atl-era-index" id="timeline">
        <div class="atl-index-row">
          <div class="atl-index-title">Collision chronology</div>
          <div class="atl-index-track" aria-hidden="true"><span></span><i class="p1"></i><i class="p2"></i><i class="p3"></i></div>
        </div>
        <div class="atl-era-grid">
          <a href="#before"><span>01</span><strong>Sebelum tumbukan</strong><small>u₁ · u₂ · p awal</small></a>
          <a href="#impact"><span>02</span><strong>Momen impact</strong><small>impuls · kontak · e</small></a>
          <a href="#after"><span>03</span><strong>Setelah tumbukan</strong><small>v₁ · v₂ · Eₖ akhir</small></a>
        </div>
        <div class="atl-ruler" aria-hidden="true"><span>t₀</span><span>0 ms</span><span>Δt</span><span>t₁</span></div>
      </section>

      <section class="atl-timeline-section" id="before">
        <div class="atl-section-marker"><span>01</span><small>INITIAL STATE</small></div>
        <div class="atl-section-copy">
          <div class="atl-kicker">Sebelum tumbukan</div>
          <h2>Semua dimulai dari <em>keadaan awal.</em></h2>
          <p>Massa dan kecepatan awal menentukan momentum sistem. Sebelum kontak terjadi, setiap benda membawa momentum dan energi kinetiknya sendiri.</p>
          <div class="atl-formula-line"><span>p = mv</span><span>Eₖ = ½mv²</span></div>
        </div>
        <div class="atl-event-card">
          <div class="atl-event-top"><span>t &lt; 0</span><span>PRE-COLLISION</span></div>
          <div class="atl-mini-scene pre"><i class="mini-a"></i><i class="mini-b"></i><b class="mini-arrow left-to-right"></b><b class="mini-arrow right-to-left"></b></div>
          <div class="atl-event-bottom"><span>Benda masih terpisah</span><b>Σp = konstan</b></div>
        </div>
      </section>

      <section class="atl-timeline-section atl-accent-section" id="impact">
        <div class="atl-section-marker"><span>02</span><small>CONTACT</small></div>
        <div class="atl-section-copy">
          <div class="atl-kicker">Momen impact</div>
          <h2>Kontak singkat. <em>Perubahan besar.</em></h2>
          <p>Saat benda bersentuhan, gaya impuls bekerja dalam waktu sangat pendek. Koefisien restitusi menentukan seberapa kuat kedua benda kembali saling menjauh.</p>
          <div class="atl-formula-line"><span>J = FΔt</span><span>e = Δv menjauh / Δu mendekat</span></div>
        </div>
        <div class="atl-event-card impact-card">
          <div class="atl-event-top"><span>t = 0</span><span>IMPACT</span></div>
          <div class="atl-mini-scene impact"><i class="mini-a"></i><i class="mini-b"></i><div class="mini-burst"></div></div>
          <div class="atl-event-bottom"><span>Energi dapat berubah bentuk</span><b>Impuls maksimum</b></div>
        </div>
      </section>

      <section class="atl-timeline-section" id="after">
        <div class="atl-section-marker"><span>03</span><small>FINAL STATE</small></div>
        <div class="atl-section-copy">
          <div class="atl-kicker">Setelah tumbukan</div>
          <h2>Satu hukum. <em>Tiga hasil.</em></h2>
          <p>Momentum total tetap terjaga pada sistem tertutup, tetapi energi kinetik dapat tetap, berkurang sebagian, atau berkurang maksimum tergantung jenis tumbukan.</p>
          <button class="atl-inline-cta" data-open-lab>Lihat hasil secara 3D <span>↗</span></button>
        </div>
        <div class="atl-results-stack">
          <article><div><span>e = 1.00</span><b>01</b></div><h3>Lenting sempurna</h3><p>Momentum dan energi kinetik dipertahankan.</p><div class="atl-result-viz elastic"><i></i><i></i></div></article>
          <article><div><span>0 &lt; e &lt; 1</span><b>02</b></div><h3>Lenting sebagian</h3><p>Momentum tetap, sebagian energi kinetik berubah bentuk.</p><div class="atl-result-viz partial"><i></i><i></i></div></article>
          <article><div><span>e = 0</span><b>03</b></div><h3>Tak lenting</h3><p>Kedua benda bergerak bersama setelah kontak.</p><div class="atl-result-viz inelastic"><i></i><i></i></div></article>
        </div>
      </section>

      <section class="atl-material-section" id="material">
        <div class="atl-material-head">
          <span class="atl-kicker">Material library</span>
          <h2>Permukaan berbeda.<br>Respons berbeda.</h2>
          <p>Material tidak hanya mengganti warna. Setiap pilihan memiliki tekstur procedural, karakter pantulan, dan efek impact yang berbeda.</p>
        </div>
        <div class="atl-material-list">
          <article><span class="atl-material-num">01</span><div class="atl-mat-sphere rubber"></div><h3>Karet</h3><p>Elastis · squash</p></article>
          <article><span class="atl-material-num">02</span><div class="atl-mat-sphere wood"></div><h3>Kayu</h3><p>Serat · serpihan</p></article>
          <article><span class="atl-material-num">03</span><div class="atl-mat-sphere glass"></div><h3>Kaca</h3><p>Transparan · pecahan</p></article>
          <article><span class="atl-material-num">04</span><div class="atl-mat-sphere stone"></div><h3>Batu</h3><p>Kasar · debu</p></article>
          <article><span class="atl-material-num">05</span><div class="atl-mat-sphere metal"></div><h3>Logam</h3><p>Metallic · spark</p></article>
        </div>
      </section>

      <section class="atl-physics-section" id="physics">
        <div class="atl-physics-number">3D</div>
        <div class="atl-physics-copy">
          <span class="atl-kicker">Interactive laboratory</span>
          <h2>Ubah parameter.<br><em>Lihat fisikanya.</em></h2>
          <p>Pilih jenis tumbukan, massa, kecepatan, material, dan slow motion. Analisis langsung memperlihatkan momentum, energi, restitusi, serta vektor geraknya.</p>
          <button class="atl-primary light" data-open-lab>Open 3D laboratory <span>↗</span></button>
        </div>
        <div class="atl-physics-specs">
          <div><span>Render</span><b>Three.js</b></div>
          <div><span>Platform</span><b>Web + Mobile</b></div>
          <div><span>Mode</span><b>3D + AR</b></div>
          <div><span>Deploy</span><b>GitHub / Vercel</b></div>
        </div>
      </section>
    </main>

    <footer class="atl-footer">
      <div><span class="atl-live-dot"></span> AR Tumbukan 3D</div>
      <div>Interactive Physics · 2026</div>
      <button data-open-lab>Launch Lab ↗</button>
    </footer>
  </div>`;
}

function renderLanding(): void {
  cleanupLab?.(); cleanupLab = null;
  cleanupLanding?.(); cleanupLanding = null;
  document.body.style.overflow = '';
  app.innerHTML = landingTemplate();

  const openButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-open-lab]'));
  const openLab = () => {
    cleanupLanding?.();
    cleanupLanding = null;
    renderLab();
  };
  openButtons.forEach((el) => el.addEventListener('click', openLab));

  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
  const events = Array.from(document.querySelectorAll<HTMLElement>('.atl-timeline-section, .atl-material-section, .atl-physics-section'));
  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    if (progress) progress.style.transform = `scaleX(${ratio})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.16 });
  events.forEach((el) => observer.observe(el));

  cleanupLanding = () => {
    window.removeEventListener('scroll', onScroll);
    observer.disconnect();
    openButtons.forEach((el) => el.removeEventListener('click', openLab));
  };
}

function options(): string {
  return (Object.keys(MATERIALS) as MaterialKey[]).map((key) => `<option value="${key}">${MATERIALS[key].label}</option>`).join('');
}

function labTemplate(): string {
  return `
  <div class="lab-page">
    <header class="lab-top">
      <div class="lab-brand"><span class="brand-mark"></span><span>AR Tumbukan 3D</span><small>Laboratorium</small></div>
      <div class="lab-actions"><button data-mode-3d>Mode 3D</button><button data-camera-ar>AR Kamera</button><button data-home>Beranda</button></div>
    </header>
    <div class="lab-layout">
      <aside class="panel left" data-control-panel>
        <h2 data-panel-toggle>Parameter Eksperimen</h2>
        <div class="segmented" data-modes>
          <button data-mode="elastic" class="active">Lenting sempurna · e = 1</button>
          <button data-mode="partial">Lenting sebagian · 0 &lt; e &lt; 1</button>
          <button data-mode="inelastic">Tak lenting · e = 0</button>
        </div>
        <h3>Benda A</h3>
        <div class="field"><div class="field-head"><span>Massa</span><output data-out="massA">1.5 kg</output></div><input data-input="massA" type="range" min="0.5" max="5" step="0.1" value="1.5"></div>
        <div class="field"><div class="field-head"><span>Kecepatan awal</span><output data-out="velocityA">4.8 m/s</output></div><input data-input="velocityA" type="range" min="-8" max="8" step="0.1" value="4.8"></div>
        <div class="field"><div class="field-head"><span>Material</span></div><select data-select="materialA">${options()}</select></div>
        <div class="material-note" data-note-a></div>
        <h3>Benda B</h3>
        <div class="field"><div class="field-head"><span>Massa</span><output data-out="massB">2.0 kg</output></div><input data-input="massB" type="range" min="0.5" max="5" step="0.1" value="2"></div>
        <div class="field"><div class="field-head"><span>Kecepatan awal</span><output data-out="velocityB">-2.0 m/s</output></div><input data-input="velocityB" type="range" min="-8" max="8" step="0.1" value="-2"></div>
        <div class="field"><div class="field-head"><span>Material</span></div><select data-select="materialB">${options()}</select></div>
        <div class="material-note" data-note-b></div>
        <h3>Kontrol</h3>
        <label class="inline-toggle"><span>e otomatis dari material</span><input data-toggle="autoE" type="checkbox" checked></label>
        <div class="field"><div class="field-head"><span>e manual untuk lenting sebagian</span><output data-out="partialRestitution">0.55</output></div><input data-input="partialRestitution" type="range" min="0.1" max="0.9" step="0.01" value="0.55"></div>
        <div class="field"><div class="field-head"><span>Kecepatan simulasi</span><output data-out="timeScale">1.00×</output></div><input data-input="timeScale" type="range" min="0.15" max="1.4" step="0.05" value="1"></div>
        <label class="inline-toggle"><span>Vektor momentum</span><input data-toggle="vectors" type="checkbox" checked></label>
        <label class="inline-toggle"><span>Label benda</span><input data-toggle="labels" type="checkbox" checked></label>
        <div class="control-row"><button data-reset>Reset</button><button data-pause>Pause</button><button class="accent" data-apply>Terapkan & mulai</button></div>
      </aside>

      <main class="viewport" data-viewport>
        <video class="camera-feed" data-camera playsinline muted></video>
        <div class="render-status" data-render-status>
          <span class="render-spinner"></span>
          <strong>Menyiapkan laboratorium 3D…</strong>
          <small data-render-detail>Memulai WebGL</small>
        </div>
        <div class="label-layer" data-label-layer></div>
        <div class="ar-reticle"></div>
        <div class="ar-launch hidden" data-ar-launch><span data-ar-status>AR siap</span><button data-ar-start>Mulai AR</button></div>
        <div class="xr-button-wrap" data-xr-wrap></div>
        <div class="viewport-hud"><span class="hud-badge" data-hud-mode>3D · Lenting sempurna</span><span class="hud-badge" data-hud-e>e = 1.00</span><span class="hud-badge">Drag untuk rotasi · pinch/scroll untuk zoom</span></div>
      </main>

      <aside class="panel right">
        <h2>Analisis Langsung</h2>
        <div class="stat-grid">
          <div class="stat"><span>Momentum total</span><strong data-stat="momentum">0 kg·m/s</strong></div>
          <div class="stat"><span>Energi kinetik</span><strong data-stat="energy">0 J</strong></div>
          <div class="stat"><span>Koef. restitusi</span><strong data-stat="e">1.00</strong></div>
          <div class="stat"><span>Jumlah tumbukan</span><strong data-stat="count">0</strong></div>
          <div class="stat wide"><span>Kecepatan A / B</span><strong data-stat="velocities">0 / 0 m/s</strong></div>
        </div>
        <div class="event-card" data-event>Mulai eksperimen untuk melihat hasil tumbukan.</div>
        <div class="formula"><strong>Hukum kekekalan momentum</strong>m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂<br><br><strong>Koefisien restitusi</strong>e = (v₂ − v₁) / (u₁ − u₂)</div>
        <div class="ar-help"><strong>AR asli:</strong> tersedia pada browser/perangkat yang mendukung WebXR immersive-ar.<br><br><strong>Fallback:</strong> AR Kamera menggunakan kamera belakang sebagai latar dan tetap menjalankan simulasi 3D.</div>
      </aside>
    </div>
  </div>`;
}

async function renderLab(): Promise<void> {
  cleanupLab?.(); cleanupLab = null;
  document.body.style.overflow = 'hidden';
  app.innerHTML = labTemplate();

  const viewport = document.querySelector<HTMLElement>('[data-viewport]')!;
  const labelLayer = document.querySelector<HTMLElement>('[data-label-layer]')!;
  const cameraFeed = document.querySelector<HTMLVideoElement>('[data-camera]')!;
  const arLaunch = document.querySelector<HTMLElement>('[data-ar-launch]')!;
  const arStatus = document.querySelector<HTMLElement>('[data-ar-status]')!;
  const xrWrap = document.querySelector<HTMLElement>('[data-xr-wrap]')!;
  const controlPanel = document.querySelector<HTMLElement>('[data-control-panel]')!;
  const renderStatus = document.querySelector<HTMLElement>('[data-render-status]')!;
  const renderDetail = document.querySelector<HTMLElement>('[data-render-detail]')!;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x242823);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 100);
  camera.position.set(0, 7.2, 13.2);
  scene.add(camera);

  const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  let renderer: THREE.WebGLRenderer;
  try {
    renderDetail.textContent = 'Membuat renderer WebGL';
    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      depth: true,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
    });
  } catch (err) {
    renderStatus.classList.add('error');
    renderStatus.innerHTML = `<strong>3D tidak dapat dijalankan</strong><small>WebGL gagal dibuat pada browser/perangkat ini. Coba Chrome/Edge terbaru dan pastikan akselerasi grafis aktif.</small><button data-reload-lab>Muat ulang</button>`;
    renderStatus.querySelector<HTMLButtonElement>('[data-reload-lab]')?.addEventListener('click', () => location.reload());
    console.error('WebGL renderer gagal dibuat', err);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.xr.enabled = true;
  renderer.domElement.setAttribute('aria-label', 'Simulasi tumbukan 3D');
  viewport.insertBefore(renderer.domElement, labelLayer);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderStatus.classList.add('error');
    renderStatus.style.display = 'flex';
    renderStatus.innerHTML = '<strong>Renderer 3D berhenti</strong><small>WebGL context hilang. Tutup aplikasi berat lain, lalu muat ulang halaman.</small><button onclick="location.reload()">Muat ulang</button>';
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);
  controls.minDistance = 7;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfff8ea, 0x3d493d, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(7, 11, 7); key.castShadow = true; key.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024); scene.add(key);
  const fill = new THREE.PointLight(0x9fddff, 10, 30, 2); fill.position.set(-8, 4, -5); scene.add(fill);

  const lab = new CollisionLab(scene, params);
  lab.attachLabels(camera, labelLayer);
  lab.setOnCollision((snapshot) => {
    if (!snapshot.lastResult) return;
    const r = snapshot.lastResult;
    const loss = Math.max(0, 100 - r.energyRetained);
    const event = document.querySelector<HTMLElement>('[data-event]')!;
    event.innerHTML = `<strong>Tumbukan terjadi.</strong><br>vA = ${r.v1.toFixed(2)} m/s · vB = ${r.v2.toFixed(2)} m/s<br>Momentum ${r.momentumBefore.toFixed(2)} → ${r.momentumAfter.toFixed(2)} kg·m/s<br>Energi kinetik tersisa ${r.energyRetained.toFixed(1)}% · hilang ${loss.toFixed(1)}%`;
  });

  function resize(): void {
    const rect = viewport.getBoundingClientRect();
    camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(viewport);

  const selectA = document.querySelector<HTMLSelectElement>('[data-select="materialA"]')!;
  const selectB = document.querySelector<HTMLSelectElement>('[data-select="materialB"]')!;
  selectA.value = params.materialA; selectB.value = params.materialB;

  function updateNotes(): void {
    const a = MATERIALS[params.materialA], b = MATERIALS[params.materialB];
    document.querySelector<HTMLElement>('[data-note-a]')!.textContent = `${a.description} Restitusi natural ≈ ${a.restitution.toFixed(2)}.`;
    document.querySelector<HTMLElement>('[data-note-b]')!.textContent = `${b.description} Restitusi natural ≈ ${b.restitution.toFixed(2)}.`;
  }

  function modeLabel(): string {
    return params.mode === 'elastic' ? 'Lenting sempurna' : params.mode === 'partial' ? 'Lenting sebagian' : 'Tak lenting';
  }

  const ui = {
    momentum: document.querySelector<HTMLElement>('[data-stat="momentum"]')!,
    energy: document.querySelector<HTMLElement>('[data-stat="energy"]')!,
    restitution: document.querySelector<HTMLElement>('[data-stat="e"]')!,
    count: document.querySelector<HTMLElement>('[data-stat="count"]')!,
    velocities: document.querySelector<HTMLElement>('[data-stat="velocities"]')!,
    hudE: document.querySelector<HTMLElement>('[data-hud-e]')!,
    hudMode: document.querySelector<HTMLElement>('[data-hud-mode]')!,
  };
  let uiAccumulator = 1;
  function updateUI(force = false): void {
    if (!force && uiAccumulator < 0.08) return;
    uiAccumulator = 0;
    const snap = lab.getSnapshot();
    ui.momentum.textContent = `${snap.momentum.toFixed(2)} kg·m/s`;
    ui.energy.textContent = `${snap.energy.toFixed(2)} J`;
    ui.restitution.textContent = snap.restitution.toFixed(2);
    ui.count.textContent = String(snap.collisionCount);
    ui.velocities.textContent = `${snap.velocityA.toFixed(2)} / ${snap.velocityB.toFixed(2)} m/s`;
    ui.hudE.textContent = `e = ${snap.restitution.toFixed(2)}`;
    ui.hudMode.textContent = `${cameraFeed.classList.contains('active') ? 'AR Kamera' : '3D'} · ${modeLabel()}`;
  }

  updateNotes();
  updateUI(true);
  // Reticle untuk penempatan arena pada permukaan nyata di WebXR.
  const xrReticle = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.12, 36).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbdd44a, side: THREE.DoubleSide }),
  );
  xrReticle.matrixAutoUpdate = false;
  xrReticle.visible = false;
  scene.add(xrReticle);

  let hitTestSource: XRHitTestSource | null = null;
  let hitTestSourceRequested = false;
  const xrController = renderer.xr.getController(0);
  xrController.addEventListener('select', () => {
    if (!xrReticle.visible) return;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const ignoredScale = new THREE.Vector3();
    xrReticle.matrix.decompose(position, quaternion, ignoredScale);
    lab.root.position.copy(position);
    lab.root.quaternion.copy(quaternion);
    lab.root.scale.setScalar(0.09);
    lab.root.visible = true;
  });
  scene.add(xrController);

  let last = performance.now();
  let firstFrameRendered = false;
  let renderFailed = false;
  renderer.setAnimationLoop((now: number, frame?: XRFrame) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    uiAccumulator += dt;

    if (frame && renderer.xr.isPresenting) {
      const session = renderer.xr.getSession();
      if (session && !hitTestSourceRequested) {
        void session.requestReferenceSpace('viewer').then((viewerSpace: XRReferenceSpace) => {
          const requestHitTestSource = session.requestHitTestSource?.bind(session);
          if (!requestHitTestSource) return;

          const hitTestPromise = requestHitTestSource({ space: viewerSpace });
          if (!hitTestPromise) return;

          return hitTestPromise.then((source: XRHitTestSource) => {
            hitTestSource = source;
          });
        });
        session.addEventListener('end', () => {
          hitTestSourceRequested = false;
          hitTestSource?.cancel();
          hitTestSource = null;
          xrReticle.visible = false;
        }, { once: true });
        hitTestSourceRequested = true;
      }
      if (hitTestSource) {
        const refSpace = renderer.xr.getReferenceSpace();
        const hits = refSpace ? frame.getHitTestResults(hitTestSource) : [];
        if (hits.length > 0 && refSpace) {
          const pose = hits[0].getPose(refSpace);
          if (pose) {
            xrReticle.visible = true;
            xrReticle.matrix.fromArray(pose.transform.matrix);
          }
        } else {
          xrReticle.visible = false;
        }
      }
    }

    if (renderFailed) return;
    try {
      lab.update(dt);
      controls.update();
      updateUI();
      renderer.render(scene, camera);
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        requestAnimationFrame(() => { renderStatus.classList.add('ready'); });
      }
    } catch (err) {
      renderFailed = true;
      console.error('Render 3D gagal', err);
      renderStatus.classList.add('error');
      renderStatus.style.display = 'flex';
      renderStatus.innerHTML = `<strong>Render 3D gagal</strong><small>${err instanceof Error ? err.message : String(err)}<br><br>Coba Chrome/Edge terbaru atau perangkat lain yang mendukung WebGL2.</small><button data-render-reload>Muat ulang</button>`;
      renderStatus.querySelector<HTMLButtonElement>('[data-render-reload]')?.addEventListener('click', () => location.reload());
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
    params.mode = btn.dataset.mode as CollisionMode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.remove('active')); btn.classList.add('active');
    lab.setParameters(params); lab.reset(); updateUI(true);
  }));

  document.querySelectorAll<HTMLInputElement>('[data-input]').forEach((input) => input.addEventListener('input', () => {
    const key = input.dataset.input as 'massA' | 'massB' | 'velocityA' | 'velocityB' | 'partialRestitution' | 'timeScale';
    const value = Number(input.value); (params[key] as number) = value;
    const out = document.querySelector<HTMLOutputElement>(`[data-out="${key}"]`)!;
    out.value = key.startsWith('mass') ? `${value.toFixed(1)} kg` : key.startsWith('velocity') ? `${value.toFixed(1)} m/s` : key === 'timeScale' ? `${value.toFixed(2)}×` : value.toFixed(2);
    lab.setParameters(params);
  }));

  selectA.addEventListener('change', () => { params.materialA = selectA.value as MaterialKey; updateNotes(); lab.setParameters(params); lab.reset(); });
  selectB.addEventListener('change', () => { params.materialB = selectB.value as MaterialKey; updateNotes(); lab.setParameters(params); lab.reset(); });
  document.querySelector<HTMLInputElement>('[data-toggle="autoE"]')!.addEventListener('change', (e) => { params.autoMaterialRestitution = (e.currentTarget as HTMLInputElement).checked; lab.setParameters(params); });
  document.querySelector<HTMLInputElement>('[data-toggle="vectors"]')!.addEventListener('change', (e) => { params.showVectors = (e.currentTarget as HTMLInputElement).checked; lab.setParameters(params); });
  document.querySelector<HTMLInputElement>('[data-toggle="labels"]')!.addEventListener('change', (e) => { params.showLabels = (e.currentTarget as HTMLInputElement).checked; lab.setParameters(params); });
  document.querySelector<HTMLButtonElement>('[data-reset]')!.addEventListener('click', () => lab.reset());
  document.querySelector<HTMLButtonElement>('[data-apply]')!.addEventListener('click', () => { lab.setParameters(params); lab.reset(); });
  document.querySelector<HTMLButtonElement>('[data-pause]')!.addEventListener('click', (e) => { const paused = lab.togglePause(); (e.currentTarget as HTMLButtonElement).textContent = paused ? 'Lanjutkan' : 'Pause'; });
  document.querySelector<HTMLElement>('[data-panel-toggle]')!.addEventListener('click', () => controlPanel.classList.toggle('open'));
  document.querySelector<HTMLButtonElement>('[data-home]')!.addEventListener('click', renderLanding);

  let mediaStream: MediaStream | null = null;
  async function stopCamera(): Promise<void> {
    if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null; cameraFeed.srcObject = null; cameraFeed.classList.remove('active'); viewport.classList.remove('camera-mode');
    scene.background = new THREE.Color(0x242823); lab.setEnvironmentVisible(true); arLaunch.classList.add('hidden');
  }

  async function startCameraFallback(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak menyediakan akses kamera.');
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      cameraFeed.srcObject = mediaStream; await cameraFeed.play(); cameraFeed.classList.add('active'); viewport.classList.add('camera-mode');
      scene.background = null; lab.setEnvironmentVisible(false);
      arLaunch.classList.remove('hidden'); arStatus.textContent = 'AR Kamera aktif · letakkan arena virtual di tengah bidang';
      document.querySelector<HTMLButtonElement>('[data-ar-start]')!.textContent = 'Tutup AR';
    } catch (err) {
      alert(`Kamera tidak dapat dibuka. Pastikan situs menggunakan HTTPS dan izin kamera diberikan.\n\n${err instanceof Error ? err.message : String(err)}`);
    }
  }

  document.querySelector<HTMLButtonElement>('[data-camera-ar]')!.addEventListener('click', async () => {
    if (cameraFeed.classList.contains('active')) await stopCamera(); else await startCameraFallback();
  });
  document.querySelector<HTMLButtonElement>('[data-ar-start]')!.addEventListener('click', stopCamera);
  document.querySelector<HTMLButtonElement>('[data-mode-3d]')!.addEventListener('click', stopCamera);

  // WebXR dimuat secara lazy agar mode 3D biasa tidak menunggu modul AR.
  let xrButton: HTMLElement | null = null;
  async function setupWebXR(): Promise<void> {
    try {
      if (!navigator.xr) return;
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) return;
      const { ARButton } = await import('three/examples/jsm/webxr/ARButton.js');
      const createdXrButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor'],
        domOverlay: { root: document.body },
      });
      xrButton = createdXrButton;
      createdXrButton.textContent = 'MULAI WEBXR AR';
      xrWrap.appendChild(createdXrButton);
      renderer.xr.addEventListener('sessionstart', () => {
        void stopCamera();
        scene.background = null;
        lab.setEnvironmentVisible(false);
        controls.enabled = false;
        lab.reset();
        lab.root.visible = false;
        lab.root.scale.setScalar(0.09);
        labelLayer.style.display = 'none';
        xrWrap.style.display = 'none';
      });
      renderer.xr.addEventListener('sessionend', () => {
        scene.background = new THREE.Color(0x242823);
        lab.setEnvironmentVisible(true);
        controls.enabled = true;
        lab.root.visible = true;
        lab.root.scale.setScalar(1);
        lab.root.position.set(0, 0, 0);
        lab.root.quaternion.identity();
        labelLayer.style.display = '';
        xrWrap.style.display = '';
      });
    } catch (err) {
      console.warn('WebXR tidak tersedia. Mode 3D dan AR Kamera tetap aktif.', err);
    }
  }
  void setupWebXR();

  cleanupLab = () => {
    renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose(); lab.dispose(); renderer.dispose();
    mediaStream?.getTracks().forEach((track) => track.stop());
    xrButton?.remove();
    document.body.style.overflow = '';
  };
}

renderLanding();
