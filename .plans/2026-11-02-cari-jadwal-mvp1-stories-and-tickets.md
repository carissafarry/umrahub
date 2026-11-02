# Cari dan Gabung Jadwal — User story dan tiket MVP-1

Dibuat 2026-11-02. Dokumen induk: `.plans/2026-11-02-cari-dan-gabung-jadwal-design.md` (apa yang dibangun), `.plans/2026-11-02-ui-direction-spec.md` (tampilan), pratinjau `.plans/design-preview/cari-jadwal-preview-v3.html`.
Tiket ada di `factory/backlog.md` (gelombang 8 sampai 13). Setiap tiket menyebut layar mana di pratinjau yang menjadi acuannya.

Aturan untuk semua tiket fe: UI Bahasa Indonesia default dan English lewat i18n (kunci di `id.json` dan `en.json`), mobile 390 lebih dulu lalu layout `lg` yang nyata (nav atas, grid lebih lebar, detail dua kolom), tap target 44px, satu CTA utama (pil tinta) per layar, token tema baru (setelah fe-022), istilah **"Jadwal"** bukan "sesi".

## User story

| # | Cerita | Tiket |
|---|---|---|
| US-1 | Sebagai calon jamaah, saya ingin mengisi tanggal berangkat, tanggal pulang, dan tanggal di Makkah dan Madinah, supaya pencarian cocok dengan perjalananku. | be-017, fe-018 |
| US-2 | Sebagai jamaah, saya ingin Beranda yang menunjukkan trip aktif dan tugas yang perlu kulakukan, supaya tahu langkah berikutnya. | fe-024 |
| US-3 | Sebagai jamaah, saya ingin mencari jadwal muthawif, city tour, dan ziarah di tanggal dan kotaku, dikelompokkan per kota, supaya tidak membuka TikTok satu per satu. | be-023, fe-025 |
| US-4 | Sebagai jamaah, saya ingin melihat opsi kendaraan, harga, dan progres kuotanya tanpa melihat identitas orang lain, supaya paham apakah harga murah akan tercapai. | be-023, fe-027 |
| US-5 | Sebagai jamaah, saya ingin menyatakan minat pada sebuah jadwal, memilih jumlah kursi, dan membatalkannya sebelum membayar, supaya fleksibel. | be-026, fe-027 |
| US-6 | Sebagai jamaah, saya ingin mengonfirmasi hadir ("fix ikut") saat penyedia meminta, supaya kuota dihitung dari yang pasti ikut. | be-026, fe-029 |
| US-7 | Sebagai jamaah, saya ingin menyetujui atau menolak opsi lain yang ditawarkan penyedia, supaya bisa ikut dengan kendaraan yang lebih murah dari taksi sendiri. | be-026, fe-029 |
| US-8 | Sebagai jamaah, saya ingin membayar langsung ke penyedia dan mengunggah bukti pembayaran, lalu mendapat konfirmasi bahwa kursiku aman. | be-028, fe-029 |
| US-9 | Sebagai jamaah, saya ingin melihat semua jadwalku beserta statusnya dan tugas berikutnya di satu tempat. | fe-030 |
| US-10 | Sebagai jamaah, saya ingin melihat profil muthawif atau travel, lencana terverifikasi, afiliasi, katalog, dan ulasannya, supaya bisa menilai siapa yang layak dipercaya. | be-019, fe-033 |
| US-11 | Sebagai jamaah, saya ingin mendapat kabar di dalam aplikasi saat status jadwalku berubah. | be-031, fe-032 |
| US-12 | Sebagai jamaah, saya ingin menilai tips dari jamaah lain "Membantu" atau "Kurang", supaya tips yang berguna naik ke atas. | be-034, fe-035 |
| US-13 | Sebagai pengguna, saya ingin seluruh aplikasi tampil dengan gaya baru yang konsisten. | fe-022, fe-036, fe-037 |
| US-14 | Sebagai pemilik produk, saya ingin data awal dummy yang realistis, supaya semua layar bisa dinilai sebelum data asli ada. | be-021 |
| US-15 | Sebagai admin, saya ingin mengubah status peserta lewat Supabase Studio dengan panduan yang jelas, karena akun provider belum ada. | infra-060 |

## Tiket

Jenis, ketergantungan, dan gelombang. "Siap" artinya bisa dijalankan sekarang.

| Kode | Jenis | Judul | Butuh | Gelombang | Layar acuan |
|---|---|---|---|---|---|
| be-017 | be | Tanggal per kota di trip | – | 8 Siap | 11 |
| be-019 | be | Skema katalog penyedia | – | 8 Siap | 9, 3b |
| fe-022 | fe | Tema baru: token, font, primitif | – | 8 Siap | semua |
| be-034 | be | Penilaian tips (data dan aksi) | be-014 (sudah merge) | 8 Siap | 14 |
| be-020 | be | Skema jadwal, opsi, partisipasi, bukti | be-019 | 9 | – |
| fe-018 | fe | Onboarding: tanggal per kota | be-017, fe-022 | 9 | 11 |
| fe-024 | fe | Beranda, navigasi, rute Trip | fe-022 | 9 | 1, 12 |
| fe-035 | fe | Tips dinilai di Detail langkah | be-034, fe-022 | 9 | 14 |
| be-021 | be | Data dummy | be-019, be-020 | 10 | – |
| be-031 | be | Notifikasi perubahan status | be-020 | 10 | 16 |
| fe-033 | fe | Profil muthawif, profil travel, katalog | be-019, be-021, fe-022 | 10 | 9 |
| be-023 | be | Pencarian jadwal dan kapasitas | be-017, be-020, be-021 | 11 | 2, 3 |
| be-026 | be | Aksi partisipasi dan aturan transisi | be-020 | 11 | – |
| be-028 | be | Penyimpanan bukti pembayaran | be-026 | 11 | 7 |
| fe-025 | fe | Cari, hasil, semua muthawif | be-023, fe-024 | 12 | 2, 3, 3b |
| fe-027 | fe | Detail jadwal dan minat | be-026, be-023, fe-025 | 12 | 4 |
| fe-030 | fe | Jadwal saya | be-026, fe-024 | 12 | 8 |
| fe-029 | fe | Konfirmasi hadir, tawaran opsi, final dan bayar | be-028, fe-027 | 12 | 5, 6, 7 |
| fe-032 | fe | Notifikasi: gaya baru dan jenis baru | be-031, fe-022 | 12 | 16 |
| fe-036 | fe | Gaya baru: landing, onboarding, daftar trip | fe-022, fe-024 | 13 | 10, 12 |
| fe-037 | fe | Gaya baru: checklist, detail langkah, anggaran | fe-022 | 13 | 13, 14, 15 |
| fe-038 | fe | QA akhir | semua fe | 13 | semua |
| infra-060 | infra | Panduan operasi Studio untuk jadwal | be-026 | 13 | – |

Nomor layar mengacu pada judul layar di pratinjau (tab Alur Cari: 1 Beranda, 2 Cari, 3 Hasil, 3b Semua muthawif; tab Jadwal dan profil: 4 sampai 9; tab Halaman lama: 10 sampai 16).

## Rincian singkat per tiket

**be-017** Migrasi `trips.planned_return_date` dan tabel `trip_legs` (trip, kota, tanggal masuk, tanggal keluar, urutan) dengan RLS pemilik trip. Perluas validasi onboarding dan `createOnboardingTrip` untuk menerima tanggal pulang dan satu atau dua bagian kota. Kota awal: Makkah, Madinah. Uji pgTAP dan unit.

**be-019** Tabel `providers` (jenis, nama, bio, kontak WhatsApp, keterangan rekening, `is_dummy`), `provider_affiliations` (jenis hubungan, status, tanggal, dikonfirmasi kedua pihak), `provider_verifications` (status, tanggal, masa berlaku, kriteria, pemeriksa), `service_types`, `provider_catalog_items`, `provider_reviews` (bintang 1 sampai 5, teks, nama tampil "Siti R."). RLS: pengguna login hanya membaca yang dipublikasikan. Tidak ada penulisan dari klien.

**be-020** Tabel `schedules` (provider, jenis layanan, kota, tanggal, tiga tenggat, dua tautan grup, `is_dummy`), `schedule_options` (format kendaraan, minimum, kapasitas, harga SAR), `participations` (trip, jadwal, kursi, status, `created_by`), `payment_proofs`. Fungsi `is_trip_member(trip_id)` dipakai di semua kebijakan baru (sekarang hanya pemilik). Pengguna hanya boleh mengatur status ke `interested`, `fix`, `declined`, `cancelled`, `paid_claimed`; `confirmed` dan `lapsed` hanya admin.

**be-021** Migrasi upsert data dummy: sekitar 10 penyedia (muthawif dan travel, sebagian afiliasi, satu belum terverifikasi), jadwal di Makkah, Thaif, dan Madinah untuk Jan 2027 dengan opsi kendaraan, ulasan dummy, katalog dummy. Semua `is_dummy = true`.

**fe-022** Perbarui `globals.css` (token di spek tampilan, hapus blok mode gelap), font Plus Jakarta Sans lewat `next/font`, `design-tokens.test.ts` (tema terang saja), primitif `Button` (pil tinta dengan lencana ikon), `Chip`, `Card` (isi biru pucat, tanpa bayangan), `BottomNav` (pil putih, tab aktif tinta), dan bagian Design system di `AGENTS.md` (termasuk aturan foto yang dilonggarkan).

**be-023** Loader `searchSchedules(trip, jenis)` yang mengelompokkan per kota dengan tur sehari di bawah kotanya, dan fungsi hitung kapasitas per opsi (terkonfirmasi, fix, tertarik) tanpa membocorkan identitas peserta.

**be-026** Aksi `expressInterest`, `setSeats`, `cancelInterest`, `confirmAttendance`, `respondToOption`, dengan pemeriksaan keanggotaan trip, validasi, dan tabel transisi status yang murni dan diuji.

**be-028** Bucket privat, hanya gambar maksimal 1 MB, RLS (pemilik, penyedia, admin), aksi unggah yang menetapkan `paid_claimed`, dan fungsi penghapusan otomatis 30 hari setelah jadwal selesai. Penjadwalan fungsi itu adalah langkah manual setelah merge (dicatat di PR).

**be-031** Pemicu basis data yang menyisipkan notifikasi ke pemilik trip saat status partisipasi berubah, dengan jenis baru di tabel `notifications`.

**be-034** Tabel `step_comment_votes` (satu suara per pengguna per tips, nilai +1 atau −1, tidak boleh menilai tips sendiri), RLS, aksi, dan pemuat tips yang mengurutkan dari yang paling membantu.

**fe-018** Langkah tanggal di wizard onboarding dan trip baru: kalender rentang, chip durasi, tanggal per kota, label tombol "Next".

**fe-024** Beranda di `/dashboard` (sapaan, trip aktif, tugas, tombol "Cari jadwal untuk tanggalmu" yang aktif setelah fe-025), daftar trip lama pindah ke `/trips`, header baru (lonceng dan akun) dengan nav bawah dan atas. Tab ditambah hanya untuk rute yang sudah ada. **Pertanyaan terbuka:** letak akun (usulan: ikon profil di header).

**fe-025** `/cari` (formulir), hasil dengan pita kota, tile muthawif, tur sehari di bawah Makkah, dan layar "Semua muthawif". **Pertanyaan terbuka:** ketuk tile membuka detail jadwal (usulan).

**fe-027** Detail jadwal dengan opsi, penentu kursi, tombol minat, keadaan setelah minat, dialog batal.

**fe-029** Layar konfirmasi hadir, tawaran opsi, final dan pembayaran (rekening, unggah bukti, grup final), serta keadaan sesudah aksi.

**fe-030** Jadwal saya: tugas yang perlu dilakukan dan daftar status. Menambah tab "Jadwal saya".

**fe-032** Halaman notifikasi dengan gaya baru dan baris untuk jenis baru.

**fe-033** Profil muthawif dan travel (lencana, afiliasi menonjol, ulasan dibaca, daftar katalog, jadwal tersedia, tombol WhatsApp) dan halaman detail katalog. **Pertanyaan terbuka:** bentuk katalog (usulan: daftar kartu yang membuka detail).

**fe-035** Tombol "Membantu" dan "Kurang" pada tips, urutan, tag "Paling membantu".

**fe-036, fe-037** Terapkan pola layout baru ke halaman lama (pita, kartu biru pucat, daftar baris, kalender), tanpa mengubah perilaku.

**fe-038** QA di 390, 768, 1280, aksesibilitas, kontras token, Lighthouse mobile, paritas kunci i18n, dan keadaan kosong dan galat di semua layar baru.

**infra-060** Catatan operasi untuk admin: cara menandai peserta fix, terkonfirmasi, gugur, dan membuka penawaran lewat Supabase Studio, dengan contoh SQL.

## Di luar MVP-1 (MVP-2)

Penawaran kursi, perubahan opsi setelah bayar, tulis ulasan, jadwal bertabrakan, saran muthawif lain saat penuh, pengingat tenggat otomatis, trip bersama (undang keluarga), akun provider. Skema MVP-1 menyiapkan dasarnya: partisipasi menempel ke trip dan semua akses lewat `is_trip_member`.
