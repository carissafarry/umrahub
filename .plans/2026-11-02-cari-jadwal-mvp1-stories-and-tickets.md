# Cari dan Gabung Jadwal — User story dan tiket MVP-1

Dibuat 2026-11-02. Dokumen induk: `.plans/2026-11-02-cari-dan-gabung-jadwal-design.md` (apa yang dibangun), `.plans/2026-11-02-ui-direction-spec.md` (tampilan), pratinjau `.plans/design-preview/cari-jadwal-preview-v3.html`.
Tiket ada di `factory/backlog.md` (gelombang 8 sampai 13). Setiap tiket menyebut layar mana di pratinjau yang menjadi acuannya.

Aturan untuk semua tiket fe: UI Bahasa Indonesia default dan English lewat i18n (kunci di `id.json` dan `en.json`), mobile 390 lebih dulu lalu layout `lg` yang nyata (nav atas, grid lebih lebar, detail dua kolom), tap target 44px, satu CTA utama (pil tinta) per layar, token tema baru (setelah fe-066), istilah **"Jadwal"** bukan "sesi".

## User story

| # | Cerita | Tiket |
|---|---|---|
| US-1 | Sebagai calon jamaah, saya ingin mengisi tanggal berangkat, tanggal pulang, dan tanggal di Makkah dan Madinah, supaya pencarian cocok dengan perjalananku. | be-061, fe-062 |
| US-2 | Sebagai jamaah, saya ingin Beranda yang menunjukkan trip aktif dan tugas yang perlu kulakukan, supaya tahu langkah berikutnya. | fe-068 |
| US-3 | Sebagai jamaah, saya ingin mencari jadwal muthawif, city tour, dan ziarah di tanggal dan kotaku, dikelompokkan per kota, supaya tidak membuka TikTok satu per satu. | be-067, fe-069 |
| US-4 | Sebagai jamaah, saya ingin melihat opsi kendaraan, harga, dan progres kuotanya tanpa melihat identitas orang lain, supaya paham apakah harga murah akan tercapai. | be-067, fe-071 |
| US-5 | Sebagai jamaah, saya ingin menyatakan minat pada sebuah jadwal, memilih jumlah kursi, dan membatalkannya sebelum membayar, supaya fleksibel. | be-070, fe-071 |
| US-6 | Sebagai jamaah, saya ingin mengonfirmasi hadir ("fix ikut") saat penyedia meminta, supaya kuota dihitung dari yang pasti ikut. | be-070, fe-073 |
| US-7 | Sebagai jamaah, saya ingin menyetujui atau menolak opsi lain yang ditawarkan penyedia, supaya bisa ikut dengan kendaraan yang lebih murah dari taksi sendiri. | be-070, fe-073 |
| US-8 | Sebagai jamaah, saya ingin membayar langsung ke penyedia dan mengunggah bukti pembayaran, lalu mendapat konfirmasi bahwa kursiku aman. | be-072, fe-073 |
| US-9 | Sebagai jamaah, saya ingin melihat semua jadwalku beserta statusnya dan tugas berikutnya di satu tempat. | fe-074 |
| US-10 | Sebagai jamaah, saya ingin melihat profil muthawif atau travel, lencana terverifikasi, afiliasi, katalog, dan ulasannya, supaya bisa menilai siapa yang layak dipercaya. | be-063, fe-077 |
| US-11 | Sebagai jamaah, saya ingin mendapat kabar di dalam aplikasi saat status jadwalku berubah. | be-075, fe-076 |
| US-12 | Sebagai jamaah, saya ingin menilai tips dari jamaah lain "Membantu" atau "Kurang", supaya tips yang berguna naik ke atas. | be-078, fe-079 |
| US-13 | Sebagai pengguna, saya ingin seluruh aplikasi tampil dengan gaya baru yang konsisten. | fe-066, fe-080, fe-081 |
| US-14 | Sebagai pemilik produk, saya ingin data awal dummy yang realistis, supaya semua layar bisa dinilai sebelum data asli ada. | be-065 |
| US-15 | Sebagai admin, saya ingin mengubah status peserta lewat Supabase Studio dengan panduan yang jelas, karena akun provider belum ada. | infra-060 |

## Tiket

Jenis, ketergantungan, dan gelombang. "Siap" artinya bisa dijalankan sekarang.

| Kode | Jenis | Judul | Butuh | Gelombang | Layar acuan |
|---|---|---|---|---|---|
| be-061 | be | Tanggal per kota di trip | – | 8 Siap | 11 |
| be-063 | be | Skema katalog penyedia | – | 8 Siap | 9, 3b |
| fe-066 | fe | Tema baru: token, font, primitif | – | 8 Siap | semua |
| be-078 | be | Penilaian tips (data dan aksi) | be-014 (sudah merge) | 8 Siap | 14 |
| be-064 | be | Skema jadwal, opsi, partisipasi, bukti | be-063 | 9 | – |
| fe-062 | fe | Onboarding: tanggal per kota | be-061, fe-066 | 9 | 11 |
| fe-068 | fe | Beranda, navigasi, rute Trip | fe-066 | 9 | 1, 12 |
| fe-079 | fe | Tips dinilai di Detail langkah | be-078, fe-066 | 9 | 14 |
| be-065 | be | Data dummy | be-063, be-064 | 10 | – |
| be-075 | be | Notifikasi perubahan status | be-064 | 10 | 16 |
| fe-077 | fe | Profil muthawif, profil travel, katalog | be-063, be-065, fe-066 | 10 | 9 |
| be-067 | be | Pencarian jadwal dan kapasitas | be-061, be-064, be-065 | 11 | 2, 3 |
| be-070 | be | Aksi partisipasi dan aturan transisi | be-064 | 11 | – |
| be-072 | be | Penyimpanan bukti pembayaran | be-070 | 11 | 7 |
| fe-069 | fe | Cari, hasil, semua muthawif | be-067, fe-068 | 12 | 2, 3, 3b |
| fe-071 | fe | Detail jadwal dan minat | be-070, be-067, fe-069 | 12 | 4 |
| fe-074 | fe | Jadwal saya | be-070, fe-068 | 12 | 8 |
| fe-073 | fe | Konfirmasi hadir, tawaran opsi, final dan bayar | be-072, fe-071 | 12 | 5, 6, 7 |
| fe-076 | fe | Notifikasi: gaya baru dan jenis baru | be-075, fe-066 | 12 | 16 |
| fe-080 | fe | Gaya baru: landing, onboarding, daftar trip | fe-066, fe-068 | 13 | 10, 12 |
| fe-081 | fe | Gaya baru: checklist, detail langkah, anggaran | fe-066 | 13 | 13, 14, 15 |
| fe-082 | fe | QA akhir | semua fe | 13 | semua |
| infra-060 | infra | Panduan operasi Studio untuk jadwal | be-070 | 13 | – |

Nomor layar mengacu pada judul layar di pratinjau (tab Alur Cari: 1 Beranda, 2 Cari, 3 Hasil, 3b Semua muthawif; tab Jadwal dan profil: 4 sampai 9; tab Halaman lama: 10 sampai 16).

## Rincian singkat per tiket

**be-061** Migrasi `trips.planned_return_date` dan tabel `trip_legs` (trip, kota, tanggal masuk, tanggal keluar, urutan) dengan RLS pemilik trip. Perluas validasi onboarding dan `createOnboardingTrip` untuk menerima tanggal pulang dan satu atau dua bagian kota. Kota awal: Makkah, Madinah. Uji pgTAP dan unit.

**be-063** Tabel `providers` (jenis, nama, bio, kontak WhatsApp, keterangan rekening, `is_dummy`), `provider_affiliations` (jenis hubungan, status, tanggal, dikonfirmasi kedua pihak), `provider_verifications` (status, tanggal, masa berlaku, kriteria, pemeriksa), `service_types`, `provider_catalog_items`, `provider_reviews` (bintang 1 sampai 5, teks, nama tampil "Siti R."). RLS: pengguna login hanya membaca yang dipublikasikan. Tidak ada penulisan dari klien.

**be-064** Tabel `schedules` (provider, jenis layanan, kota, tanggal, tiga tenggat, dua tautan grup, `is_dummy`), `schedule_options` (format kendaraan, minimum, kapasitas, harga SAR), `participations` (trip, jadwal, kursi, status, `created_by`), `payment_proofs`. Fungsi `is_trip_member(trip_id)` dipakai di semua kebijakan baru (sekarang hanya pemilik). Pengguna hanya boleh mengatur status ke `interested`, `fix`, `declined`, `cancelled`, `paid_claimed`; `confirmed` dan `lapsed` hanya admin.

**be-065** Migrasi upsert data dummy: sekitar 10 penyedia (muthawif dan travel, sebagian afiliasi, satu belum terverifikasi), jadwal di Makkah, Thaif, dan Madinah untuk Jan 2027 dengan opsi kendaraan, ulasan dummy, katalog dummy. Semua `is_dummy = true`.

**fe-066** Perbarui `globals.css` (token di spek tampilan, hapus blok mode gelap), font Plus Jakarta Sans lewat `next/font`, `design-tokens.test.ts` (tema terang saja), primitif `Button` (pil tinta dengan lencana ikon), `Chip`, `Card` (isi biru pucat, tanpa bayangan), `BottomNav` (pil putih, tab aktif tinta), dan bagian Design system di `AGENTS.md` (termasuk aturan foto yang dilonggarkan).

**be-067** Loader `searchSchedules(trip, jenis)` yang mengelompokkan per kota dengan tur sehari di bawah kotanya, dan fungsi hitung kapasitas per opsi (terkonfirmasi, fix, tertarik) tanpa membocorkan identitas peserta.

**be-070** Aksi `expressInterest`, `setSeats`, `cancelInterest`, `confirmAttendance`, `respondToOption`, dengan pemeriksaan keanggotaan trip, validasi, dan tabel transisi status yang murni dan diuji.

**be-072** Bucket privat, hanya gambar maksimal 1 MB, RLS (pemilik, penyedia, admin), aksi unggah yang menetapkan `paid_claimed`, dan fungsi penghapusan otomatis 30 hari setelah jadwal selesai. Penjadwalan fungsi itu adalah langkah manual setelah merge (dicatat di PR).

**be-075** Pemicu basis data yang menyisipkan notifikasi ke pemilik trip saat status partisipasi berubah, dengan jenis baru di tabel `notifications`.

**be-078** Tabel `step_comment_votes` (satu suara per pengguna per tips, nilai +1 atau −1, tidak boleh menilai tips sendiri), RLS, aksi, dan pemuat tips yang mengurutkan dari yang paling membantu.

**fe-062** Langkah tanggal di wizard onboarding dan trip baru: kalender rentang, chip durasi, tanggal per kota, label tombol "Next".

**fe-068** Beranda di `/dashboard` (sapaan, trip aktif, tugas, tombol "Cari jadwal untuk tanggalmu" yang aktif setelah fe-069), daftar trip lama pindah ke `/trips`, header baru (lonceng dan akun) dengan nav bawah dan atas. Tab ditambah hanya untuk rute yang sudah ada. **Pertanyaan terbuka:** letak akun (usulan: ikon profil di header).

**fe-069** `/cari` (formulir), hasil dengan pita kota, tile muthawif, tur sehari di bawah Makkah, dan layar "Semua muthawif". **Pertanyaan terbuka:** ketuk tile membuka detail jadwal (usulan).

**fe-071** Detail jadwal dengan opsi, penentu kursi, tombol minat, keadaan setelah minat, dialog batal.

**fe-073** Layar konfirmasi hadir, tawaran opsi, final dan pembayaran (rekening, unggah bukti, grup final), serta keadaan sesudah aksi.

**fe-074** Jadwal saya: tugas yang perlu dilakukan dan daftar status. Menambah tab "Jadwal saya".

**fe-076** Halaman notifikasi dengan gaya baru dan baris untuk jenis baru.

**fe-077** Profil muthawif dan travel (lencana, afiliasi menonjol, ulasan dibaca, daftar katalog, jadwal tersedia, tombol WhatsApp) dan halaman detail katalog. **Pertanyaan terbuka:** bentuk katalog (usulan: daftar kartu yang membuka detail).

**fe-079** Tombol "Membantu" dan "Kurang" pada tips, urutan, tag "Paling membantu".

**fe-080, fe-081** Terapkan pola layout baru ke halaman lama (pita, kartu biru pucat, daftar baris, kalender), tanpa mengubah perilaku.

**fe-082** QA di 390, 768, 1280, aksesibilitas, kontras token, Lighthouse mobile, paritas kunci i18n, dan keadaan kosong dan galat di semua layar baru.

**infra-060** Catatan operasi untuk admin: cara menandai peserta fix, terkonfirmasi, gugur, dan membuka penawaran lewat Supabase Studio, dengan contoh SQL.

## Di luar MVP-1 (MVP-2)

Penawaran kursi, perubahan opsi setelah bayar, tulis ulasan, jadwal bertabrakan, saran muthawif lain saat penuh, pengingat tenggat otomatis, trip bersama (undang keluarga), akun provider. Skema MVP-1 menyiapkan dasarnya: partisipasi menempel ke trip dan semua akses lewat `is_trip_member`.
