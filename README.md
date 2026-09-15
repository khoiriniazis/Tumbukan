# AR Tumbukan 3D v1.2.2

> Hotfix Vercel: memperbaiki TypeScript strict error pada WebXR hit-test source yang dapat mengembalikan undefined.

# AR Tumbukan 3D — v1.2 Editorial Timeline Landing

**Versi 1.1 – renderer mobile optimized**

Versi ini mengurangi beban GPU pada HP, memuat modul WebXR secara lazy, dan menampilkan pesan diagnosis jika WebGL gagal dibuat.


Aplikasi laboratorium fisika berbasis web untuk menjelaskan tiga jenis tumbukan:

1. Lenting sempurna (`e = 1`)
2. Lenting sebagian (`0 < e < 1`)
3. Tak lenting sama sekali (`e = 0`)

## Teknologi

- Vite
- TypeScript
- Three.js
- WebXR immersive AR pada perangkat yang mendukung
- Camera AR fallback untuk perangkat/browser tanpa WebXR
- Procedural materials tanpa Blender dan tanpa model `.glb`

## Fitur

- Landing page responsif
- Simulasi 3D dua benda
- Massa dan kecepatan dapat diubah
- Material: karet, kayu, kaca, batu, logam
- Efek material procedural: squash, serpihan, pecahan, debu, percikan
- Perhitungan momentum dan energi kinetik
- Koefisien restitusi otomatis dari material atau manual
- Slow motion
- Vektor momentum dan label objek
- WebXR AR pada perangkat yang mendukung
- Fallback kamera belakang agar tetap dapat dipakai pada perangkat lain

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite.

> Kamera pada browser membutuhkan HTTPS atau `localhost`. Jika membuka dari IP LAN biasa dengan HTTP, browser dapat menolak akses kamera.

## Build produksi

```bash
npm run build
npm run preview
```

Hasil build berada di folder `dist/`.

## Deploy ke Vercel

1. Upload repository ini ke GitHub.
2. Di Vercel pilih **Add New Project**.
3. Import repository GitHub.
4. Framework akan terdeteksi sebagai **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Deploy.

File `vercel.json` sudah disiapkan, sehingga konfigurasi biasanya terdeteksi otomatis.

## Catatan AR

- **WebXR AR** adalah AR asli dan bergantung pada dukungan browser/perangkat.
- **AR Kamera** adalah fallback universal yang menampilkan simulasi Three.js di atas live camera feed.
- Untuk pemakaian kelas, gunakan URL Vercel (`https://...`) agar izin kamera dapat bekerja.

## Struktur

```text
src/
├── effects/ImpactEffects.ts
├── materials/materialLibrary.ts
├── physics/collision.ts
├── scene/CollisionLab.ts
├── main.ts
└── style.css
```

## Catatan pendidikan

Solver tumbukan menggunakan persamaan analitik, bukan physics engine umum, agar nilai kecepatan, momentum, energi, dan koefisien restitusi dapat dijelaskan dan diverifikasi secara langsung dalam konteks pembelajaran.


## v1.2
Landing page direka ulang dengan pendekatan chronology-first: hero editorial, collision chronology, tiga fase tumbukan, material library, scroll progress, dan CTA menuju laboratorium. Simulator 3D/AR tetap dimuat hanya setelah pengguna membuka lab.


## v1.2.1 Vercel build fix
- Fixed strict TypeScript narrowing for optional WebXR `requestHitTestSource`.
- Pinned Vercel/Node runtime to Node 22.x for stable builds.
- Explicitly approved the esbuild install script via npm `allowScripts`.
