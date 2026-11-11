# Workflow log

Satu baris per perubahan pada cara kerja AI (agen, model, prompt, loop, skrip, aturan hemat konteks). Tujuannya melacak apa yang sudah dicoba, mengapa, dan apakah hasilnya lebih akurat dan lebih murah dalam token.

Aturan: kode `workflow-NNN` (penghitung sendiri dari 001), branch `factory/workflow-NNN`, commit `workflow-NNN <pesan>`, PR sendiri. Setiap tugas menambah satu baris di bawah dan mengisi kolom "Hasil terukur" setelah ada data.

## Perubahan

| Kode | Tanggal | Perubahan | Alasan | Dugaan efek | Hasil terukur |
|---|---|---|---|---|---|
| workflow-001 | 2026-11-02 | Model agen `spec-writer` dari opus ke sonnet (`.claude/agents/spec-writer.md`). Sambil menunggu PR ini merge, sesi orkestrator mengatur model per pemanggilan. | Spek dibuat dari kode dan tiket yang sudah jelas. Menulis spek tidak perlu model termahal. | Token dan biaya per spek turun. Risiko: spek kurang teliti (misalnya melewatkan temuan kontras warna seperti yang ditemukan opus di fe-066). | Belum ada. Lihat baseline dan cara mengukur di bawah. |
| workflow-002 | 2026-11-02 | Skrip pengendali `factory/driver.mjs` (PR #27, sudah merge): loop factory dengan langkah mekanis di kode, tiap agen lewat `claude -p` dalam konteks baru, token per langkah dicatat di `usage.jsonl`. | Sesi orkestrator yang panjang membaca ulang percakapan besar setiap kali satu agen selesai. | Orkestrasi hampir tidak memakai token model. Bekal agen lebih kecil (lihat workflow-004). | Belum dijalankan dengan agen sungguhan. Bekal agen headless 14.133 token, dibanding sekitar 40 ribu pada agen di dalam sesi interaktif (dari transkrip). |
| workflow-003 | 2026-11-02 | Batas kapasitas `factory/capacity.mjs` (PR #28): paling banyak 2 job berjalan, 1 di antaranya memakai Supabase lokal. | Empat job paralel membuat load average sekitar 330, OrbStack memakai 95 sampai 137% CPU lebih dari 24 menit, dan builder berjalan 14 sampai 60 menit. | Tidak ada antrean di stack database, durasi job lebih pendek, agen berhenti membuang token menunggu. | Diuji pada state nyata: job database kedua dan job ketiga ditolak. Belum ada angka durasi sebelum dan sesudah. |
| workflow-004 | 2026-11-02 | Mode hemat di skrip pengendali (`--slim` atau `FACTORY_SLIM=1`) dan skrip ukur `factory/measure-context.sh`. | Setiap agen mulai dengan puluhan ribu token bekal (plugin, MCP, skill global) yang tidak dipakai agen factory. | Bekal agen turun sekitar separuh. Risiko: hook milik pengguna (misalnya penulis ulang perintah penghemat token) ikut terlewat, sehingga keluaran alat bisa lebih besar. | Bekal reviewer-code: 14.133 menjadi 5.918 token (−58%) pada satu pengukuran. Belum dibandingkan pada job sungguhan. |
| workflow-005 | 2026-11-02 | Pilihan reviewer di skrip pengendali: `--reviewers code,security` atau `FACTORY_REVIEWERS`. Reviewer yang tidak dipilih dicatat `skipped` (tidak pernah `PASS`) dan approver diberi tahu bahwa reviewnya dibebaskan atas keputusan pengguna. | Tiket tanpa UI (skema database) tidak butuh reviewer UX dan UI, dan tiket yang hanya mengubah halaman bertanda login tidak bisa dilihat agen headless. Tiap reviewer yang tidak perlu memakai sekitar 40 sampai 50 ribu token. | Satu sampai tiga agen lebih sedikit per putaran review. Risiko: pemilihan yang salah melewatkan temuan. | Dipakai pertama kali pada fe-081 (hanya reviewer code). Belum ada angka. |
| workflow-006 | 2026-11-03 | `builder.md`: dev server selalu dilepas dengan `nohup ... &` dan dihentikan lewat port; baca sebagian berkas, gabungkan perintah, tes sempit saat membangun dan validasi penuh sekali di akhir; aturan rute pratinjau tanpa `[id]`. Skrip pengendali: batas waktu per agen (`FACTORY_AGENT_TIMEOUT_MIN`, bawaan 45 menit, atau `--agent-timeout`), perintah yang ditolak dicatat (maksimal 120 huruf), dan Bash hanya-baca (`ls`, `cat`, `grep`, `head`, `tail`, `wc`) ditambahkan ke izin bawaan. | fe-081 memakan sekitar 30 menit dan 3,68 dolar karena builder menggantung 18 menit pada dev server dan terlalu banyak giliran. Reviewer dan approver di be-061 beberapa kali ditolak memakai Bash untuk membaca. | Builder tidak lagi menggantung, giliran dan biaya turun, agen yang macet berhenti dalam 45 menit (bukan 3 jam) dengan pesan jelas. Risiko: batas 45 menit terlalu pendek untuk tiket besar (bisa diubah per job). | Belum ada. Dibandingkan pada job berikutnya dengan ukuran tiket sebanding |

## Baseline (spec-writer dengan opus, gelombang 8, 2026-11-02)

Angka dari notifikasi selesai tiap agen (token dihitung per agen, sudah termasuk membaca file).

| Tiket | Token | Alat dipakai | Durasi |
|---|---|---|---|
| be-078 | 42.203 | 12 | 2 mnt 25 dtk |
| be-063 | 55.460 | 9 | 3 mnt 7 dtk |
| be-061 | 64.928 | 15 | 3 mnt 15 dtk |
| fe-066 | 69.587 | 14 | 4 mnt 3 dtk |
| **Rata-rata** | **58.045** | 12,5 | 3 mnt 12 dtk |

## Cara mengukur efek workflow-001

Bandingkan spec-writer dengan sonnet (gelombang 9 dan seterusnya) pada tiga hal:
1. **Token per spek** dibanding rata-rata baseline di atas.
2. **Mutu spek:** berapa kali builder berstatus `BLOCKED` karena spek, dan berapa putaran review yang dibutuhkan (lebih dari satu putaran akibat kriteria yang kurang atau salah dihitung ke spek).
3. **Temuan yang hilang:** apakah ada masalah yang dulu ditangkap penulis spek (contoh: kontras warna di fe-066) lalu terlewat.

Isi kolom "Hasil terukur" di atas setelah sekurang-kurangnya lima spek dengan sonnet.

## Cara membaca angka token (koreksi, 2026-11-02)

Angka "token per agen" di notifikasi selesai mendekati **ukuran konteks akhir** agen, bukan total yang diproses. Setiap giliran agen membaca ulang seluruh konteks dari cache, jadi total bacaannya jauh lebih besar. Caching sudah bekerja sendiri: 94 sampai 98% input berasal dari cache (169 transkrip). Contoh dari transkrip, gelombang 8:

| Agen | Giliran | Baca cache | Tulis cache | Output | Konteks akhir |
|---|---|---|---|---|---|
| fe-066 builder | 54 | 3,23 jt | 80 rb | 28 rb | 86 rb |
| fe-066 reviewer code | 7 | 207 rb | 42 rb | 2,7 rb | 42 rb |
| fe-066 approver | 8 | 224 rb | 40 rb | 4 rb | 40 rb |
| be-063 builder | 46 | 2,47 jt | 215 rb | 32 rb | 78 rb |
| be-078 builder (dijeda) | 52 | 3,96 jt | 107 rb | 40 rb | 107 rb |
| **fe-066 seluruh tiket** | | **4,2 jt** | **230 rb** | **53 rb** | |

Dua sumber boros: bekal awal agen sekitar 40 ribu token (agen kecil seperti reviewer hanya 7 sampai 8 giliran, jadi bekal mendominasi), dan jumlah giliran builder (40 sampai 54).

## Pengukuran bekal agen (workflow-004, reviewer-code pada haiku, satu panggilan kecil)

| Konfigurasi | Token awal |
|---|---|
| A bawaan | 14.133 |
| B tanpa MCP saja | 24.087 (lebih tinggi, tidak diselidiki) |
| C hanya pengaturan proyek (`--setting-sources project,local`) | 6.664 |
| D C ditambah tanpa MCP dan tanpa skill (mode hemat) | 5.918 |

## Ide berikutnya (belum dikerjakan)

- Kurangi jumlah giliran builder lewat prompt: kelompokkan perintah, jangan menunggu dengan pengecekan berulang, baca hanya bagian berkas yang perlu.
- Validasi bertingkat (tes terkait saat membangun, tes penuh sekali di akhir).
- Pilihan reviewer otomatis menurut jenis tiket (be tanpa UI: code dan keamanan; fe: code, UI, UX), bukan lewat opsi manual.
- **Temuan dari fe-081 (diperbaiki di workflow-006):** builder menjalankan dev server di Bash tanpa melepasnya, jadi panggilan alatnya menggantung 20 menit lebih padahal `build.md` sudah READY. Perlu aturan di `builder.md`: dev server selalu dijalankan dengan `nohup ... &` dan keluarannya dialihkan. Skrip pengendali juga sebaiknya punya batas waktu per agen (sekarang tiga jam).
- Rute pratinjau di `build.md` yang masih berisi `[id]` membuat skrip pengendali berhenti. Builder sebaiknya diberi id trip nyata di prompt-nya.

- Sesi orkestrator baru dengan konteks kecil untuk setiap gelombang, bukan satu sesi panjang.
- Skrip pengendali loop (langkah mekanis di luar model, agen dipanggil lewat `claude -p` dalam konteks kecil).
- Model lebih murah untuk reviewer-security di tiket yang tidak menyentuh data atau autentikasi.
