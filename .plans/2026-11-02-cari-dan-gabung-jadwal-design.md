# Umra Hub — Cari dan Gabung Jadwal (Find Umrah Buddies)

Dokumen desain. Status: **menunggu persetujuan**. Dibuat 2026-11-02 dari jadwal brainstorming dengan pemilik produk, diperbarui setelah alur jadwal dan penawaran kursi dibahas.
Urutan kerja: desain Figma dulu (target sekitar satu bulan), lalu implementasi di repo ini.

Konvensi repo tetap berlaku (lihat `AGENTS.md`): brand "Umra Hub", ibadah ditulis "Umrah", UI Bahasa Indonesia default + English lewat i18n, mobile-first dengan layout desktop `lg`, token desain soft indigo, RLS di setiap tabel.

## 1. Maksud dan alasan

Orang yang berangkat Umrah mandiri punya tiga masalah yang sekarang tidak punya tempat:

1. **Mencari muthawif yang tersedia di tanggalnya.** Muthawif membangun audiens di TikTok, mengumpulkan peminat ke grup WhatsApp milik sendiri, dan membagikan jadwal di sana. Calon jamaah harus membuka muthawif satu per satu.
2. **Menilai muthawif dan travel mana yang bisa dipercaya.** Satu-satunya ulasan ada di kolom komentar TikTok, dan muthawif lebih mengejar engagement dulu.
3. **Menggabungkan permintaan supaya harga turun.** Biaya muthawif dihitung per grup. City tour Thaif hanya punya satu penyedia dengan sistem join: bus dengan minimal 35 orang sekitar 40 SAR per orang. Kalau tidak tercapai, penyedia menawarkan kendaraan lain (misalnya Hiace untuk belasan orang) dengan harga lebih mahal dari 40 SAR tapi lebih murah dari 80 SAR. Pendaftaran dilakukan dengan menulis nama di grup chat, jadi jumlah peserta sulit dihitung dan tidak pasti sampai mendekati hari.

Pengguna tetap bebas mengatur itinerary sendiri. Hanya sebagian agenda yang perlu dilakukan bersama orang lain demi harga.

### Cara kerjanya sekarang di kenyataan

1. Calon peserta menulis nama di grup sesuai tanggal yang diinginkan.
2. Sekitar H-3 penyedia mengumumkan siapa yang fix, dengan centang di nama masing-masing.
3. Kalau kuota tidak terpenuhi, dibahas di grup yang sama kendaraan apa yang cocok.
4. Setelah daftar fix dan kendaraan disepakati, sekitar H-1 dibuat grup baru untuk yang benar-benar fix. Pembayaran diminta di grup baru itu.

## 2. Tujuan

Seorang pengguna bisa, dengan data dummy dulu:

1. Melihat jadwal yang disediakan provider (muthawif, travel Umrah) di rentang tanggalnya, dikelompokkan per kota dan agenda (Makkah, Thaif, Madinah).
2. Membaca ulasan provider. Kalau muthawif berafiliasi dengan travel, melihat travel itu dan ulasan travel itu juga (terpisah dari ulasan muthawif).
3. Melihat katalog dan informasi yang disediakan provider.
4. Menyatakan minat pada sebuah jadwal, lalu mengonfirmasi hadir ("fix ikut") saat penyedia meminta, dan melihat kapasitas tiap opsi kendaraan serta harganya.
5. Menyetujui opsi dan harga final, membayar langsung ke provider (nomor rekening dan tautan grup ditampilkan setelah final), mengunggah bukti pembayaran, lalu mendapat konfirmasi bahwa kursi aman.
6. Menghubungi provider lewat WhatsApp yang tersimpan di profil provider.
7. Mendapat kabar di dalam aplikasi ketika provider menawarkan kursi yang kosong, dan bisa mengambilnya.

Bebas memilih provider yang berbeda untuk setiap agenda: Umrah di Makkah, city tour Thaif, dan ziarah di Madinah dipesan terpisah.

## 3. Bukan tujuan sekarang

- Memproses uang di dalam aplikasi. Provider menyebutkan nomor rekening, uang ditangani mereka. Aplikasi hanya menyimpan **bukti pembayaran** (berkas) sebagai catatan, tidak pernah memegang atau memindahkan uang. Pembayaran dalam aplikasi bisa ditambahkan nanti.
- Obrolan grup di dalam aplikasi. Untuk sekarang hanya **tautan grup eksternal** yang dikelola provider (grup diskusi dan grup final). Ini kandidat fitur berikutnya.
- Akun provider yang mengelola agenda, jadwal, opsi, pengumuman, dan pesertanya sendiri. Ini tahap lanjut. Sekarang data dimasukkan oleh pemilik produk lewat Supabase Studio, dan semua langkah milik provider (mengirim pengumuman, mengunci opsi, mengonfirmasi bukti, menawarkan kursi) dilakukan admin atas nama provider. Layar sisi pengguna tetap didesain lengkap.
- Scraping TikTok. Data dikumpulkan manual dari grup WhatsApp yang diikuti pemilik produk. (Syarat layanan TikTok membatasi scraping dan komentar adalah data pribadi orang lain.)
- Data asli. Provider, jadwal, dan ulasan awal semuanya **dummy**. Ulasan asli dikumpulkan manual dari jamaah yang pernah memakai jasa provider, nanti.
- Berbagi kamar hotel dan transport. Skema harus siap menerimanya, layarnya belum didesain.
- Push notification dan email. Kabar hanya muncul di pusat notifikasi dalam aplikasi, sama seperti sekarang.
- Trip budget counter. Tetap dipertahankan seperti sekarang, dikerjakan setelah ini.

## 4. Anti-tujuan (dianggap gagal walaupun semua layar jadi)

- Orang yang baru bertanya dihitung sebagai peserta sehingga angka kapasitas menyesatkan.
- Ulasan yang tidak bisa dipercaya, atau yang terlihat palsu.
- Aplikasi memegang uang pengguna.
- Fitur baru (kamar bersama, transport, akun provider, pembayaran) memaksa perombakan besar pada skema data.
- Pengguna yang sudah memesan jadwal tidak tahu kepastian harganya sampai hari-H.
- Kursi dibiarkan kosong karena peserta yang sudah fix tidak membayar, tanpa cara untuk mengisinya.
- Peserta yang sudah mengunggah bukti pembayaran bisa membatalkan sendiri lewat aplikasi.
- Pengguna yang tidak terkait mendapat banyak kabar penawaran yang tidak relevan.
- Lencana "Terverifikasi" tampil di provider yang dokumennya kedaluwarsa atau belum benar-benar diperiksa.

## 5. Model konsep (skema yang lentur)

Tidak ada tabel khusus muthawif. Beberapa konsep umum yang bisa dipakai ulang. Nama tabel dan kolom persisnya diputuskan saat perencanaan.

- **Penyedia (provider):** muthawif, travel, atau jenis lain, dengan nama, bio, kontak WhatsApp, dan keterangan rekening.
- **Afiliasi:** hubungan antara dua provider, misalnya muthawif A bekerja di, atau punya usaha di, travel A. Setiap afiliasi punya jenis hubungan (bekerja di, pemilik, mitra), status (aktif atau berakhir), tanggal mulai, dan tanggal berakhir bila ada. Satu muthawif bisa punya lebih dari satu afiliasi. Afiliasi **tampil di kedua profil**: profil muthawif menampilkan travel-nya, profil travel menampilkan daftar muthawifnya. Bagian 9 mengatur kaitannya dengan verifikasi.
- **Jenis layanan:** tabel acuan, misalnya pendampingan Umrah, city tour, kamar hotel bersama, transport bersama. Jenis baru berarti baris baru, bukan tabel baru.
- **Katalog:** informasi dan penawaran yang ditulis provider (judul, deskripsi, media).
- **Jadwal:** satu layanan pada tanggal tertentu oleh satu provider, dengan kota dan tiga tenggat yang bisa diatur per jadwal: tenggat konfirmasi hadir (contoh H-3), tenggat penentuan opsi (contoh H-2), dan tenggat pembayaran (contoh H-1). Jadwal punya dua tautan grup eksternal opsional: **grup diskusi** (terbuka untuk peminat dan penerima penawaran) dan **grup final** (hanya untuk peserta yang fix, tampil setelah opsi dikunci).
- **Opsi:** pilihan format layanan dalam satu jadwal, misalnya bus (minimum 35 orang, SAR 40), Hiace (belasan orang, SAR 60), mobil pribadi (SAR 80). Tiap opsi punya jenis kendaraan atau format, jumlah minimum, kapasitas maksimum, dan harga per orang dalam SAR. Satu jadwal punya satu opsi atau lebih. Jadwal muthawif per grup cukup punya satu opsi. Opsi tambahan boleh ditambahkan penyedia setelah jadwal dibuat, saat kuota opsi pertama tidak terpenuhi.
- **Partisipasi:** sebuah **trip** di sebuah jadwal (bukan hanya seorang pengguna), dengan jumlah kursi, status, dan pengguna yang membuatnya (`created_by`). Peserta bergabung ke jadwal, bukan ke satu opsi. Trip wajib ada karena pencarian berdasarkan tanggal trip. Dasar ini disiapkan sejak MVP-1 supaya fitur trip bersama (bagian 12) tidak memaksa perombakan skema.
- **Akses trip:** semua pembacaan dan penulisan data trip (checklist, anggaran, partisipasi, notifikasi) lewat satu fungsi pemeriksa keanggotaan trip. Di MVP-1 anggotanya hanya pemilik. Nanti anggota bertambah lewat undangan tanpa mengubah kebijakan RLS satu per satu.
- **Bukti pembayaran:** berkas yang diunggah peserta pada sebuah partisipasi. Disimpan privat, hanya terlihat oleh peserta itu, penyedia jadwal itu, dan admin.
- **Penawaran kursi:** pengumuman dari provider bahwa ada kursi kosong di sebuah jadwal, dengan jumlah kursi, opsi dan harga final, tenggat mengambil, dan daftar penerima kabar (lihat di bawah).
- **Notifikasi:** memakai pusat notifikasi yang sudah ada dengan jenis baru (pengumuman konfirmasi hadir, tawaran opsi, pengingat bayar, penawaran kursi, status berubah).
- **Ulasan:** terikat ke satu provider (muthawif dan travel punya ulasan masing-masing), berisi bintang 1–5 dan teks. Untuk data nyata nanti hanya partisipan yang terkonfirmasi dan jadwalnya sudah lewat yang boleh menulis.
- **Verifikasi:** catatan per provider berisi status, kriteria yang dipenuhi, tanggal, masa berlaku, dan pemeriksanya (lihat bagian 9). Bukan dokumen sumbernya.
- **Peran:** pengguna biasa, admin (kurator, sekarang lewat Studio), provider (nanti).

### Perjalanan satu jadwal

Hari-hari di bawah hanya contoh dan bisa diatur per jadwal.

| Tahap | Kapan | Pengguna | Status partisipasi |
|---|---|---|---|
| 1. Daftar | sampai H-4 | Mengetuk "Saya tertarik". Bisa batal gratis. | `interested` |
| 2. Konfirmasi hadir | H-3 | Penyedia mengumumkan, pengguna mengetuk "Saya fix ikut". | `fix` |
| 3. Tentukan opsi | H-3 sampai H-2 | Bila jumlah `fix` belum memenuhi minimum opsi pertama, penyedia menawarkan opsi lain. Pengguna menjawab "Setuju harga ini" atau "Tidak ikut". Diskusi boleh di grup diskusi eksternal. | `fix`, atau `declined` |
| 4. Final | H-1 | Penyedia mengunci opsi, harga, dan daftar peserta. Pengguna melihat rekening penyedia dan tautan grup final. | `awaiting_payment` |
| 5. Bayar | sampai tenggat bayar | Pengguna membayar langsung ke penyedia dan **mengunggah bukti pembayaran**. Sejak bukti terkirim tidak ada tombol batal di aplikasi. | `paid_claimed` |
| 6. Konfirmasi | setelah bukti diperiksa | Penyedia memeriksa bukti dan menandai kursi aman. | `confirmed` |
| 7. Ulasan | setelah jadwal | Peserta terkonfirmasi bisa menulis ulasan. | `confirmed` |

Status lain: `declined` (menolak opsi atau harga), `lapsed` (gugur karena tidak membayar sampai tenggat bayar dan kursinya dilepas), `cancelled` (dibatalkan pengguna sebelum mengunggah bukti).

Aturan hitung:
- Opsi mana yang terpenuhi ditentukan oleh jumlah peserta `fix` dan sesudahnya (`fix`, `awaiting_payment`, `paid_claimed`, `confirmed`).
- Yang `interested` tidak dihitung. Ditampilkan terpisah, misalnya "17 fix, 9 tertarik".
- Layar menampilkan progres tiap opsi, misalnya "Bus 17 dari 35, Hiace 17 dari 12 (terpenuhi)".
- Pembatalan: bebas sampai bukti pembayaran diunggah. Setelah itu tidak ada tombol batal. Satu pengecualian: kalau penyedia mengubah opsi atau harga **setelah** pengguna membayar (misalnya dari bus ke Hiace), pengguna mendapat pilihan menerima atau tidak, dan pengembalian dana dibicarakan di luar aplikasi.
- Pengguna yang tidak menjawab saat konfirmasi hadir tidak dihitung, tetapi tetap tercatat sebagai `interested` dan boleh menyusul menjadi `fix` sampai penyedia mengunci opsi.

### Penawaran kursi (mengisi kursi yang kosong atau mencari peserta tambahan)

Penawaran adalah pengumuman yang dikirim provider kepada pengguna lain. Dipakai di dua keadaan: kursi yang dilepas karena peserta fix tidak membayar, dan provider yang masih butuh peserta tambahan.

Masalah utamanya: peserta sudah mengaku fix tetapi belum membayar, sehingga kursinya tidak aman.

1. **Peringatan lebih dulu.** Sebelum tenggat bayar, peserta `awaiting_payment` mendapat pengingat di pusat notifikasi.
2. **Pelepasan.** Setelah tenggat bayar lewat, kursi peserta yang belum mengunggah bukti dilepas (`lapsed`). Penyedia (sekarang admin) bisa membukanya sebagai **penawaran kursi**: jumlah kursi, opsi dan harga final yang berlaku, serta tenggat mengambil.
3. **Siapa yang diberi kabar.** Peserta `interested` di jadwal itu yang belum fix, lalu pengguna yang trip-nya mencakup tanggal jadwal dan memilih "kabari saya soal kursi kosong". Tidak ada daftar tunggu terpisah. Kabar muncul di pusat notifikasi dan penanda di "Jadwal saya".
4. **Menyatakan minat.** Siapa pun yang diberi kabar bisa mengetuk "Saya berminat" sebelum tenggat penawaran. Tidak ada rebutan dan tidak ada batas jumlah: dalam satu hari bisa ada 100 orang yang berminat untuk beberapa kursi. Aplikasi hanya mencatat daftar peminat.
5. **Penyedia memilih di luar aplikasi.** Siapa yang mendapat kursi diputuskan penyedia lewat sistemnya sendiri (misalnya WhatsApp). Setelah itu penyedia (sekarang admin) menandai peserta terpilih sebagai `awaiting_payment` dengan tenggat bayar sendiri, dan yang lain diberi kabar bahwa kursinya sudah terisi.
6. **Diskusi.** Pertanyaan soal penawaran dibahas di grup diskusi eksternal. Tautannya ditampilkan di layar penawaran sampai obrolan di dalam aplikasi dibangun.
7. **Terlambat membayar.** Peserta yang sudah dilepas tetapi mengunggah bukti sebelum kursinya diambil orang lain dikembalikan ke `paid_claimed` dan penyedia memeriksanya.

Selama penawaran terbuka, bar kapasitas menampilkan "N kursi ditawarkan" sebagai segmen terpisah.

## 6. Cakupan layar (untuk Figma)

Mobile 390 dan desktop 1280, dengan keadaan kosong, memuat, galat, dan penuh.

1. **Onboarding / trip:** rentang tanggal Umrah. Sekarang onboarding hanya menanyakan bulan dan tahun.
2. **Daftar agenda untuk tanggalku:** dikelompokkan per kota dan agenda; di tiap agenda ada kartu provider dengan bintang, jumlah ulasan, lencana, travel afiliasi, dan bar kapasitas. Hari tanpa agenda bersama ditampilkan sebagai hari bebas. Keadaan kosong bila tidak ada jadwal.
3. **Detail jadwal:** opsi kendaraan dengan progres dan harga tiap opsi, bar kapasitas (fix dan tertarik), tenggat, tombol minat. Tampilannya berubah mengikuti tahap dan status (lihat 4 sampai 8).
4. **Konfirmasi hadir:** pengumuman dari penyedia, tombol "Saya fix ikut".
5. **Tawaran opsi:** opsi lain dan harganya, tombol "Setuju" atau "Tidak ikut".
6. **Final dan pembayaran:** rekening penyedia, tautan grup final, pilihan unggah bukti, status pemeriksaan.
7. **Penawaran kursi:** kabar, ringkasan kursi dan harga, tenggat, tombol "Saya berminat" (bisa dibatalkan sebelum tenggat), jumlah peminat tanpa menampilkan identitas, tautan grup diskusi. Setelah penyedia memilih: keadaan "terpilih, silakan bayar" atau "kursi sudah terisi".
8. **Profil provider:** lencana terverifikasi (dengan tanggal), bio, katalog, ulasan, tautan WhatsApp, dan **bagian Afiliasi** yang terlihat tanpa menggulir jauh: nama travel, jenis hubungan ("bekerja di" atau "pemilik"), lencana travel itu, dan tautan ke profilnya. Ulasan muthawif dan ulasan travel ditampilkan terpisah dan tidak dicampur.
9. **Profil travel:** lencana terverifikasi, detail, ulasan, dan daftar muthawif yang berafiliasi beserta bintang masing-masing.
10. **Jadwal saya:** jadwal yang diikuti beserta statusnya dan tugas berikutnya.
11. **Tulis ulasan** (setelah jadwal selesai dan terkonfirmasi).
12. **Keadaan khusus:** jadwal penuh, jadwal bertabrakan (peringatan, tidak diblokir), pembatalan minat.

Navigasi (diputuskan): empat tab **Beranda, Cari, Jadwal saya, Trip**. Catatan implementasi: `AppNav` sekarang hanya berisi `/dashboard` dan `/trips/new`, dan aturan repo membolehkan tab hanya untuk rute yang sudah ada. Tab baru ditambahkan bersamaan dengan rutenya.

## 7. Batasan dari repo

- Setiap tabel baru wajib RLS. Pengguna login boleh membaca provider, jadwal, opsi, katalog, dan ulasan. Partisipasi dimiliki pengguna. Peran admin dan provider tidak boleh diperoleh dari sisi klien. Tidak ada service-role key.
- Pengguna **tidak boleh** melihat identitas peserta lain. Yang tampil hanya jumlah.
- Bukti pembayaran (diputuskan pemilik produk): **hanya gambar**, maksimal **1 MB**, disimpan di penyimpanan privat dengan RLS yang terlihat hanya oleh pemilik, penyedia jadwal itu, dan admin. Dihapus otomatis **30 hari** setelah jadwal selesai (tafsiranku atas "30 hari"; ubah kalau maksudnya 30 hari sejak unggah).
- Migrasi baru tidak mengedit migrasi yang sudah ada di `main`. Data dummy lewat migrasi upsert tersendiri.
- Semua teks lewat i18n (`messages/id.json` dan `en.json`).
- Konten yang berasal dari provider dirender sebagai teks biasa, tidak sebagai HTML.
- Pengingat dan kabar penawaran memakai pusat notifikasi yang ada. Penjadwalan berdasarkan tenggat perlu mekanisme di sisi server (bukan klien), dan tidak ada push atau email.

## 8. Pilihan yang kubuat sendiri (tolong dicek)

- Tenggat diatur oleh provider per jadwal (diputuskan pemilik produk). Bawaannya H-3 untuk konfirmasi hadir, H-2 untuk penentuan opsi, H-1 untuk bayar.
- Satu akun bisa memesan lebih dari satu kursi dalam satu partisipasi (diputuskan pemilik produk). Jumlahnya bisa diubah sampai konfirmasi hadir. Nilai awalnya mengikuti jumlah jamaah di trip.
- Bergabung ke dua jadwal yang tanggalnya bertabrakan diizinkan dengan peringatan, tidak diblokir (sama seperti peringatan prasyarat di checklist).
- Data dummy diberi penanda `is_dummy` agar mudah disembunyikan atau dihapus saat data asli masuk.
- Urutan provider di daftar: bintang tertinggi dulu, lalu kursi tersisa.
- Kartu muthawif di daftar agenda menampilkan nama travel afiliasinya dalam satu baris kecil ("bersama Travel A"), supaya afiliasi terlihat sebelum pengguna membuka profil.
- Afiliasi yang berakhir tidak dihapus. Ia disimpan sebagai riwayat dan tidak tampil di profil.
- Ulasan tidak berpindah mengikuti afiliasi: ulasan muthawif tetap milik muthawif, ulasan travel tetap milik travel.
- Teks dari provider boleh satu bahasa (Indonesia) dengan versi English opsional. Antarmuka tetap dua bahasa.
- Penawaran kursi hanya mengumpulkan minat (diputuskan pemilik produk). Penyedia memilih di luar aplikasi, tidak ada rebutan. Aplikasi tidak membatasi jumlah peminat.
- Penerima kabar penawaran: peminat jadwal itu, lalu pengguna dengan tanggal cocok yang memilih menerima kabar. Pilihan terakhir bersifat opt-in agar tidak mengganggu.
- Dua tautan grup per jadwal (diskusi dan final) menggantikan satu tautan grup.
- Peserta yang tidak menjawab saat konfirmasi hadir tetap dianggap peminat, tidak gugur.

## 9. Verifikasi provider (diputuskan)

Provider yang lolos mendapat lencana **"Terverifikasi"**. Kata yang dipakai selalu "terverifikasi", tidak "terpercaya" atau "kredibel", karena lencana hanya menyatakan hal yang benar-benar dicek. Di tahap awal, kamu memeriksa dokumennya secara manual.

**Travel Umrah, wajib:**
- Izin usaha, termasuk izin penyelenggara Umrah dari Kemenag (PPIU) yang nomornya bisa dicocokkan dengan data Kemenag.
- Nomor HP aktif.
- Email aktif.
- Nama pemilik rekening cocok dengan badan usaha yang diverifikasi.
- Alamat kantor.

**Muthawif, wajib:**
- Nomor HP aktif.
- Email aktif.
- Identitas (KTP atau paspor), dan nama pemilik rekening cocok dengan identitas itu.
- Kalau berafiliasi dengan travel Umrah, **travel itu harus sudah terverifikasi lebih dulu**.

**Opsional untuk keduanya:** akun sosial media. Untuk muthawif juga bukti pengalaman atau izin sebagai muthawif, bila ada.

**Aturan lain:**
- Aplikasi menyimpan **hasil** verifikasi saja: status, tanggal, masa berlaku, kriteria yang dipenuhi, dan siapa yang memeriksa. Dokumen sumber (KTP, izin) tidak disimpan di aplikasi pada tahap awal. Kalau nanti provider punya akun dan mengunggah dokumen, penyimpanannya harus privat dan tidak pernah tampil ke pengguna lain.
- Lencana punya masa berlaku dan ditinjau ulang berkala, karena izin bisa kedaluwarsa atau dicabut.
- Muthawif yang afiliasinya tidak lagi terverifikasi ikut kehilangan lencananya sampai afiliasi itu dibereskan.
- Afiliasi hanya tampil kalau **dikonfirmasi oleh kedua pihak**. Sekarang admin yang memastikan, nanti travel sendiri yang menyetujui lewat akun providernya. Tanpa itu, siapa pun bisa mengaku berafiliasi dengan travel terverifikasi dan menumpang reputasinya.

**Catatan untuk pemilik produk:** aturan perizinan di atas (khususnya PPIU dan syarat untuk muthawif) berasal dari pengetahuan umum, bukan dari sumber resmi. Pastikan dengan orang yang paham sebelum daftar syarat dipakai sebagai kriteria final.

## 10. Keputusan tambahan

- **Provider yang belum terverifikasi tetap tampil.** Tanpa lencana "Terverifikasi", dan dengan keterangan yang jelas bahwa provider ini belum diverifikasi. Pengguna tetap bisa menyatakan minat. Teks peringatannya diputuskan di tahap desain.
- **Nama di ulasan:** nama depan dan inisial belakang, mis. "Siti R.".
- **Peringatan provider belum terverifikasi:** "Belum diverifikasi Umra Hub. Periksa sendiri sebelum membayar."
- **"Kabari saya soal kursi kosong"** adalah satu pengaturan per trip di layar Cari, bukan halaman pengaturan terpisah.
- **Tidak ada daftar tunggu.** Belum diketahui seberapa mendesak. Jadwal yang penuh ditandai "Penuh" dengan saran muthawif lain di tanggal yang sama. Kalau provider butuh peserta lagi, ia mengirim penawaran (bagian 5).

Tidak ada pertanyaan terbuka yang tersisa.

## 10b. Pembaruan setelah pratinjau (2026-11-02)

Pratinjau acuan: `.plans/design-preview/cari-jadwal-preview-v3.html`. Spek tampilan: `.plans/2026-11-02-ui-direction-spec.md`.

**Diputuskan pemilik produk:**
- Istilah "sesi" diganti **"Jadwal"** di seluruh antarmuka dan dokumen ("Jadwal saya", "Cari jadwal", "Detail jadwal"). "Opsi" tetap untuk pilihan kendaraan.
- **Beranda dan Cari dipisah.** Beranda berisi sapaan, trip aktif, tugas yang perlu dilakukan, dan satu tombol "Cari jadwal untuk tanggalmu". Cari berisi formulir dengan satu tombol "Cari", lalu halaman hasil.
- **Hasil dikelompokkan per kota** dengan pita besar (Makkah, Madinah). **Thaif adalah tur sehari dari Makkah**, jadi berada di bawah pita Makkah.
- **Tips dari jamaah bisa dinilai** dengan tombol "Membantu" dan "Kurang" (satu suara per pengguna per tips, tidak bisa menilai tips sendiri). Tips diurutkan dari yang paling membantu, dan yang teratas diberi tag "Paling membantu".
- **Figma tidak dipakai di MVP-1.** Pratinjau HTML menjadi acuan, dan layout desktop dinilai pada pratinjau hidup.
- **MVP-1:** tanggal per kota, Beranda, Cari dan hasil, semua muthawif, detail jadwal dan minat, konfirmasi hadir, tawaran opsi, final dan pembayaran dengan bukti, Jadwal saya, profil muthawif dan travel dengan katalog dan ulasan (dibaca), notifikasi perubahan status, tips yang bisa dinilai, tema baru untuk semua halaman.
- **MVP-2:** penawaran kursi, perubahan opsi setelah bayar, tulis ulasan, jadwal bertabrakan, saran muthawif lain di jadwal penuh, pengingat tenggat otomatis, trip bersama (undang keluarga), akun provider.

**Usulan yang belum dikonfirmasi pemilik produk** (dicatat sebagai pertanyaan terbuka di tiketnya, tiket yang bergantung padanya tidak dimulai sebelum dijawab):
1. Mengetuk **tile muthawif** di hasil pencarian membuka **detail jadwal**, dan dari sana baris penyedia menuju profil.
2. **Akun, bahasa, dan keluar** berada di ikon profil bulat di header, di sebelah lonceng, yang membuka lembar bawah.
3. **Katalog** penyedia berupa daftar kartu di profil (judul, gambar, deskripsi) yang membuka halaman detail.

**Konsekuensi data:**
- Trip perlu **tanggal per kota** (kota, tanggal masuk, tanggal keluar, urutan) selain rentang tanggal keseluruhan. Pencarian jadwal memakai tanggal per kota, dan jadwal "tur sehari dari" sebuah kota ikut kotanya.
- Rute: `/dashboard` menjadi **Beranda**, dan daftar trip lama pindah ke **`/trips`** (tab "Trip"). Rute `/trips/[id]` dan seterusnya tidak berubah.

## 11. Diserahkan ke pembangun

Nama tabel dan kolom, cara menghitung kapasitas tanpa membocorkan identitas peserta, strategi RLS terperinci, mekanisme penjadwalan tenggat dan pelepasan kursi, pengaturan penyimpanan bukti pembayaran, pembagian tugas, dan struktur komponen UI.

## 12. Pengembangan berikutnya (di luar dokumen ini)

**Trip bersama (disebut pemilik produk):** pemilik mengundang akun keluarga atau rombongan, dan anggota mendapat akses yang sama untuk melihat itinerary, rute, muthawif yang dipilih, jadwal, agenda, dan anggaran. Perlu keanggotaan trip, undangan, daftar anggota, dan aturan siapa boleh melakukan apa (khususnya konfirmasi hadir, pembayaran, dan penghapusan). Obrolan grup dalam aplikasi, pembayaran dalam aplikasi, akun provider, kamar hotel dan transport bersama, push notification, dan tautan jadwal terkonfirmasi ke trip budget counter (harga jadwal masuk otomatis ke anggaran, dengan konversi SAR ke IDR).
