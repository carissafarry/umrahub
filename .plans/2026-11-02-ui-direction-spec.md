# Umra Hub — Arah Tampilan Baru (UI Direction Spec)

Status: **disetujui pemilik produk untuk MVP-1** (2026-11-02). **Pratinjau acuan:** `.plans/design-preview/cari-jadwal-preview-v3.html` (buka di browser; tiga tab, 17 layar mobile 390). Kalau dokumen dan pratinjau berbeda, pratinjau yang menang untuk tampilan, dokumen yang menang untuk aturan. Figma tidak dipakai di MVP-1; layout desktop 1280 ditentukan oleh aturan di tiket dan dinilai pada pratinjau hidup. Sebelumnya: Dibuat 2026-11-02 dari empat gambar referensi yang dilampirkan pemilik produk, diperbarui setelah empat keputusan. Menggantikan arah "soft indigo" di `.plans/umrohhub-mvp-spec.md` dan bagian Design system di `AGENTS.md`, tetapi **hanya setelah disetujui**. Sampai saat itu token yang ada di `src/app/globals.css` tetap berlaku.

Dokumen ini pasangan dari `.plans/2026-11-02-cari-dan-gabung-jadwal-design.md` (apa yang dibangun). Dokumen ini menjelaskan **bagaimana tampilannya**.

Cakupan: tema baru berlaku untuk **semua halaman** pada akhirnya, tetapi pekerjaan sekarang difokuskan pada **layar baru** (fitur Cari dan Gabung Jadwal). Halaman lama di-restyle setelahnya (lihat bagian 9).

## Keputusan pemilik produk

- **Aksen: langit.** Biru untuk siang, oranye dan ungu untuk sore.
- **Font: Plus Jakarta Sans.**
- **Satu tema (terang) untuk MVP.** Mode gelap ditunda.
- **Foto bebas dipakai.** MVP memakai foto dummy.

## 1. Referensi dan perannya

| Gambar | Peran | Yang diambil |
|---|---|---|
| Aplikasi layanan Umrah, tema cokelat dan krem (grid muthawif) | **Layout: muthawif** | Grid portrait bulat dengan lencana kecil, kartu putih di atas pita header, ukuran dan jarak yang lega |
| Aplikasi jamaah tema koral (agenda, "I need to do") | **Layout: trip dan detail** | Kartu agenda, blok tanggal, ubin statistik, daftar tugas, kartu pengumuman, navigasi pil mengambang |
| Aplikasi rencana perjalanan, hero matahari terbenam | **Gaya dan nuansa** | Antarmuka monokrom dengan CTA hitam, lembar putih melengkung di atas hero, chip dan ubin berkontur tipis, nav pil putih |
| Aplikasi rencana perjalanan, kanvas abu terang | **Gaya dan nuansa** | Permukaan putih berkaca di atas abu sangat terang, CTA pil hitam dengan lencana ikon bulat, kalender dengan hari terpilih hitam, bilah progres tipis |

Referensi hanya untuk pola dan nuansa. Tidak ada merek, teks, atau logo dari referensi yang dipakai.

## 2. Ringkasan arah

Antarmuka **monokrom yang tenang**: permukaan putih, tinta hampir hitam, kontur sangat tipis, sudut besar, bayangan lembut yang menyebar. **Warna hadir dari langit**: pita hero dan aksen kecil. Siang berwarna biru, sore beralih ke oranye dan ungu. CTA utama selalu pil hitam. Rasanya menenangkan dan lapang, sesuai gambaran perjalanan ke Tanah Suci.

Berbeda dari arah lama (lavender dan indigo): warna tidak lagi menjadi identitas tombol, jadi kontras bertumpu pada tinta dan putih.

## 3. Token (usulan nilai, satu tema terang)

Nilai di bawah adalah **usulan**. Setiap nilai harus lolos uji kontras di `src/app/design-tokens.test.ts` (teks isi 7:1, teks sekunder dan teks di atas CTA 4.5:1, ikon ubin 3:1) sebelum dipakai. Nama token mengikuti yang sudah ada supaya komponen lama tidak patah.

| Token | Nilai | Catatan |
|---|---|---|
| `--background-from` / `--background-to` | `#FFFFFF` / `#FFFFFF` | **Latar putih polos** (diputuskan pemilik produk). Dua token dipertahankan supaya gradien bisa dipakai lagi |
| `--background` | `#FFFFFF` | Cadangan solid |
| `--surface` | `#EEF4FB` | **Kartu berisi biru langit sangat pucat**, bukan abu dan bukan putih (diputuskan pemilik produk) |
| `--surface-line` (baru) | `#DCE7F3` | Kontur 1px kartu dan pemisah di dalam kartu |
| `--surface-raised` (baru) | `#FFFFFF` | Ubin, tombol kontur, dan lonceng di atas kartu, serta nav pil |
| `--foreground` | `#121212` | Tinta |
| `--muted` | `#5E5E5E` | Teks sekunder |
| `--border` | `#E4E2DD` | Kontur 1px |
| `--primary` | `#121212` | CTA pil tinta |
| `--primary-strong` | `#2A2A2A` | Ujung gradien CTA, boleh sama dengan `--primary` |
| `--primary-foreground` | `#FFFFFF` | Teks dan ikon di atas CTA |
| `--accent` (baru) | `#1D6FB8` | Biru langit tua, aman untuk teks di atas putih (perkiraan kontras sekitar 5:1, akan diuji) |
| `--accent-foreground` (baru) | `#FFFFFF` | |
| `--accent-soft` (baru) | `#DCEBFA` | Latar tag dan ubin biru muda |
| `--sky-day-from` / `--sky-day-to` (baru) | `#4E9FE5` / `#CDE6FA` | Gradien hero siang |
| `--sky-dusk-from` / `--sky-dusk-mid` / `--sky-dusk-to` (baru) | `#F6A15A` / `#D4709A` / `#6C5BC4` | Gradien hero sore |
| `--nav` / `--nav-foreground` | `#FFFFFF` / `#121212` | Nav pil **putih**, tab aktif pil tinta |
| `--tile-amber` / `--tile-green` / `--tile-blue` / `--tile-violet` | `#F7E3C4` / `#D9F0E3` / `#DCE7FB` / `#E9E1F8` | Ubin ikon pastel, dipakai hemat |
| Warna status | hijau `#17734E` di `#DDF3E8`, kuning `#8A5A00` di `#FBEBC8`, merah `#A32A4B` di `#FADDE6` | Selalu disertai bentuk dan teks |
| `--shadow-card` | `none` | Kartu datar tanpa bayangan. Bayangan lembut `0 10px 30px rgba(18,18,18,.12)` hanya untuk elemen yang mengambang (nav pil, lembar) |
| `--dusk-tile` / `--dusk-ink` (baru) | `#F9E6D5` / `#8A4B1F` | Pita kota Madinah dan ubin oranye sore. Makkah memakai `--accent-soft` |

Aturan tambahan:
- Satu CTA utama per layar tetap berlaku, sekarang berupa **pil tinta**.
- Aksen langit dipakai paling banyak di dua tempat per layar di luar hero.
- **Teks di atas hero:** gradien langit tidak memberi kontras 4.5:1 untuk putih. Teks di atas hero hanya judul besar (24px ke atas, semibold). Semua teks isi berada di atas lembar putih.
- **Hero siang atau sore:** MVP memakai satu gradien (siang, biru). Gradien sore dipakai untuk keadaan tertentu (misalnya bagian sore di agenda). Mengganti hero otomatis menurut jam perangkat adalah ide tambahan, bukan bagian MVP.
- **Satu tema:** `color-scheme: light`. Blok `prefers-color-scheme: dark` di `globals.css` dihapus, dan uji kontras hanya memeriksa tema terang. Mode gelap menjadi pekerjaan fase berikutnya.

## 4. Bentuk, jarak, tipografi

- **Radius:** kartu dan lembar 28px, ubin dan thumbnail 16–20px, chip, tombol, dan nav pil penuh, avatar bulat penuh. Lembar bawah melengkung 32px di atas dengan pegangan.
- **Kartu:** isi `--surface` (biru langit pucat), kontur 1px `--surface-line`, **tanpa bayangan**. Ubin dan tombol kontur di dalam kartu berlatar putih. Grid portrait muthawif tidak dibungkus kartu.
- **Pita kota:** Makkah dan Madinah (dan kota lain di kemudian hari) berupa pita penuh selebar kolom dengan ikon, nama 28px bold, tanggal, dan jumlah malam. Makkah memakai `--accent-soft`, Madinah memakai `--dusk-tile`. Tur sehari dari sebuah kota (misalnya Thaif dari Makkah) berada **di bawah pita kotanya** dengan jalur "Makkah, Thaif, Makkah".
- **Tombol Google:** teks di tengah, logo G berwarna asli di lingkaran putih di kiri.
- **Tombol langkah wizard:** berlabel "Next".
- **Jarak:** gutter halaman 16px, jarak antarkartu 12–16px, padding kartu 16–20px. Tap target minimal 44px.
- **Tipografi:** **Plus Jakarta Sans** menggantikan Inter, bobot semibold untuk judul. Noto Naskh Arabic tetap untuk teks Arab. Judul layar 28–34px dengan jarak huruf sedikit rapat, judul bagian 20px, isi 16px.
- **Sapaan dua baris** di layar utama ("Selamat pagi, Siti" lalu satu kalimat ringkas).
- **Ikon:** garis tipis (stroke 1.5px), inline SVG `currentColor`, seperti aturan repo sekarang.

## 5. Komponen (untuk pustaka Figma dan kode)

| Komponen | Pola | Sumber |
|---|---|---|
| `Button` utama | Pil tinta, lencana bulat putih berisi ikon panah, teks tengah | referensi gaya |
| `Button` sekunder | Pil kontur putih | referensi koral |
| `Chip` | Pil berkontur, terpilih = isi tinta dan teks putih | referensi gaya |
| `Tag` | Pil kecil dengan latar `--accent-soft` (atau mint) di atas judul kartu | referensi koral |
| `ProviderTile` | Portrait bulat 72px, lencana terverifikasi di kiri bawah, nama tebal, baris bintang dan jumlah ulasan, baris kapasitas | referensi cokelat |
| `AgendaCard` | Tag, judul, blok tanggal (angka besar dan bulan) dengan pemisah vertikal, jam dan lokasi, area gambar, dua tombol | referensi koral |
| `StatTile` | Ubin kecil: ikon dan label di atas, angka besar, keterangan di bawah | referensi koral dan gaya |
| `ListRow` | Lingkaran ikon pastel, judul, deskripsi dua baris, panah di kanan | referensi koral |
| `NoticeCard` | Avatar, nama, peran berwarna aksen, jam, ikon pengumuman, isi. Digulir mendatar | referensi koral |
| `CapacityBar` | Bilah tipis dua segmen: terkonfirmasi (tinta) dan fix (tinta muda), teks di bawah | milik kita |
| `StatusPill` | Pil kecil dengan bentuk penanda dan teks | milik kita |
| `RangeCalendar` | Kalender bulanan, rentang terpilih berupa lingkaran tinta, chip durasi di atasnya | referensi gaya |
| `Stepper` | Bilah tipis bersegmen di atas layar untuk wizard | referensi gaya |
| `BottomNav` | Pil putih mengambang, tab aktif berupa pil tinta dengan label, maksimal 4 tab | referensi koral dan gaya |
| `Sheet` dan `Dialog` | Lembar bawah melengkung 32px, dialog dengan lingkaran ikon hitam, judul, dan CTA | referensi gaya |

## 6. Pola layout per layar baru

Sumber pola: **M** = referensi muthawif (cokelat), **T** = referensi trip dan detail (koral), **G** = referensi gaya.

| Layar | Susunan |
|---|---|
| Onboarding tanggal | Stepper tipis di atas, judul "Kapan kamu berangkat?", chip durasi, `RangeCalendar` (G), CTA pil tinta di bawah |
| **Cari, agenda untukku** | Pita hero (gradien langit SVG) dengan sapaan dan lonceng bulat, lembar putih melengkung menimpa pita (M, G), baris tanggal trip, kemudian tiap agenda sebagai bagian dengan judul dan **grid 3 kolom `ProviderTile`** (M) |
| Cari, pengaturan kabar | Baris dengan saklar di atas daftar agenda |
| **Detail jadwal** | `AgendaCard` sebagai kepala (T): tag jenis, blok tanggal, penyedia. Di bawahnya tiga `StatTile` (T): opsi terpenuhi, kursi, tenggat. Lalu daftar opsi kendaraan dengan `CapacityBar`. Penentu jumlah kursi dan CTA pil tinta melekat di bawah |
| Konfirmasi hadir, tawaran opsi | `NoticeCard` besar dari penyedia, penentu kursi, CTA pil tinta dan tombol kontur "Tidak ikut" |
| Final dan pembayaran | Ringkasan opsi, kartu rekening, area unggah bukti, tombol grup final sebagai `ListRow` |
| **Jadwal saya** | Bagian "Perlu kamu lakukan" berupa `ListRow` (T), lalu daftar jadwal dengan `StatusPill` |
| Profil muthawif | Portrait bulat besar, nama dan lencana terverifikasi di sampingnya (G), baris bintang, kartu Afiliasi yang menonjol, ulasan, katalog, tombol WhatsApp |
| Profil travel | Seperti profil muthawif, ditambah daftar `ProviderTile` muthawif yang berafiliasi |
| Penawaran kursi | `NoticeCard` penuh, jumlah peminat, CTA pil tinta |
| Pusat notifikasi | `ListRow` dengan lingkaran ikon pastel per jenis kabar |
| Dialog batal dan perubahan opsi | `Dialog` dengan lingkaran ikon hitam |
| Navigasi | Pil putih mengambang dengan empat tab: Beranda, Cari, Jadwal saya, Trip |

### Desktop (`lg` ke atas)

- Nav atas menggantikan nav pil, aktif berupa pil tinta.
- Cari: pita hero lebar, `ProviderTile` dalam 5–6 kolom, bagian agenda dalam dua kolom.
- Detail jadwal: dua kolom, kiri isi dan opsi, kanan kartu ringkasan menempel (kursi, harga, CTA).
- Kontainer maksimal 1200px, sama seperti aturan repo sekarang.

## 7. Gambar (diputuskan)

Foto bebas dipakai. Untuk MVP semua foto adalah **foto dummy**: portrait penyedia, gambar katalog, dan gambar jadwal.

Konsekuensi yang perlu dicatat:
- `AGENTS.md` sekarang melarang `<img>` dan `next/image` kecuali avatar jarak jauh. Aturan itu perlu diperlonggar dalam tiket token dan sistem desain.
- Foto dummy harus dari sumber berlisensi bebas pakai. Disarankan foto yang jelas bukan orang tertentu yang dikenal sebagai muthawif.
- Ketika data asli masuk, portrait muthawif asli hanya dengan izin tertulis dari yang bersangkutan.
- Semua foto punya teks alternatif, ukuran tetap supaya tata letak tidak bergeser, dan `loading="lazy"`.
- Seni hero dekoratif tetap gradien langit CSS dan SVG, bukan foto.

## 8. Yang tidak diambil dari referensi

- Strip waktu salat, tombol SOS, asisten AI atau suara, peta, obrolan. Semuanya di luar lingkup.
- Latar bertekstur cokelat dan palet cokelat dan krem. Itu bagian dari referensi layout, bukan gaya yang dipilih.
- Ilustrasi tokoh dan teks dari referensi.
- Bendera negara pada lencana portrait. Diganti lencana terverifikasi.
- Mode gelap (ditunda).

## 9. Dampak ke repo dan urutan kerja

1. Persetujuan dokumen ini, lalu pratinjau HTML satu layar (Cari) untuk memastikan nuansanya.
2. Pustaka Figma: Variables (satu mode warna, radius, jarak, tipografi), lalu komponen di bagian 5.
3. Layar baru digambar mengikuti urutan kode (Cari dan Detail jadwal dulu).
4. Tiket token baru di repo: perbarui `globals.css` (hapus blok mode gelap), `design-tokens.test.ts` (hanya tema terang), font Plus Jakarta Sans, aturan gambar, dan bagian Design system di `AGENTS.md`. Primitif di `src/components/ui/` (`Button`, `Chip`, `BottomNav`, `Card`) diubah sekali di sini sehingga semua halaman ikut.
5. Tiket restyle halaman lama (checklist, anggaran, dashboard, notifikasi, langkah): dikerjakan setelah layar baru stabil.

## 10. Pertanyaan terbuka

Tidak ada. Persetujuan akhir dokumen ini dibutuhkan sebelum token baru ditulis ke repo.
