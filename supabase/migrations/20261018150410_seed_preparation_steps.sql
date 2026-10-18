-- Seed content: the 22 preparation steps from the MVP spec and the flight
-- cost overrides per departure city. Idempotent: fixed ids plus upserts, so it
-- can run again safely. Costs are per person, in whole rupiah (IDR).
-- Change content later with a new upsert migration (or Studio), not here.

insert into public.preparation_steps (
  id,
  phase_key,
  category_key,
  title_id,
  title_en,
  summary_id,
  summary_en,
  detail_content_id,
  detail_content_en,
  estimated_cost_min,
  estimated_cost_max,
  cost_varies_by_city,
  is_shared_step,
  dependency_step_ids,
  sort_order,
  is_published
) values

-- 3-6 months before: documents

(
  '5eed0000-0000-4000-8000-000000000001',
  '3_6_months_before',
  'documents',
  'Buat atau perpanjang paspor',
  'Apply for or renew your passport',
  'Paspor wajib berlaku minimal 6 bulan dari tanggal kepulangan. Urus sejak awal karena antrean di kantor imigrasi bisa panjang.',
  'Your passport must be valid for at least 6 months after your return date. Start early, as immigration office queues can be long.',
  $md$## Langkah-langkah

1. Cek masa berlaku paspor Anda. Jika kurang dari 6 bulan setelah tanggal pulang, perpanjang.
2. Daftar antrean lewat aplikasi **M-Paspor** dan pilih kantor imigrasi terdekat.
3. Datang sesuai jadwal untuk verifikasi dokumen, foto dan wawancara.
4. Bayar biaya paspor sesuai jenisnya (paspor biasa atau elektronik).
5. Ambil paspor di kantor imigrasi pada tanggal yang diberikan.

## Yang perlu disiapkan

- KTP elektronik
- Kartu Keluarga (KK)
- Akta kelahiran, ijazah atau buku nikah (salah satu, sesuai ketentuan)
- Paspor lama, jika memperpanjang

## Tips

- Pastikan nama di paspor sama persis dengan nama di tiket dan visa.
- Simpan foto atau salinan halaman identitas paspor di ponsel.
- Informasi resmi: [imigrasi.go.id](https://www.imigrasi.go.id)
$md$,
  $md$## Steps

1. Check your passport's expiry date. If it is less than 6 months after your return date, renew it.
2. Book a slot in the **M-Paspor** app and choose the nearest immigration office.
3. Attend your appointment for document checks, photo and interview.
4. Pay the passport fee for the type you choose (regular or electronic).
5. Collect the passport at the immigration office on the given date.

## What you need

- Electronic ID card (KTP)
- Family card (KK)
- Birth certificate, diploma or marriage book (one of them, as required)
- Your old passport, if renewing

## Tips

- Make sure the name in your passport matches your ticket and visa exactly.
- Keep a photo or copy of the passport's identity page on your phone.
- Official information: [imigrasi.go.id](https://www.imigrasi.go.id)
$md$,
  350000,
  650000,
  false,
  false,
  null,
  10,
  true
),
(
  '5eed0000-0000-4000-8000-000000000002',
  '3_6_months_before',
  'documents',
  'Siapkan pas foto paspor dan visa',
  'Prepare passport and visa photos',
  'Visa dan beberapa dokumen perjalanan butuh pas foto dengan ketentuan khusus. Siapkan versi cetak dan digital sekaligus.',
  'Your visa and some travel documents need photos that meet specific requirements. Get both printed and digital copies at once.',
  $md$## Langkah-langkah

1. Cek ketentuan foto terbaru untuk visa Arab Saudi di platform pengajuan visa.
2. Foto di studio dengan latar belakang putih, wajah menghadap ke depan dan terlihat jelas.
3. Minta file digital beresolusi tinggi selain foto cetak.
4. Simpan file foto di ponsel dan di penyimpanan awan.

## Yang perlu disiapkan

- Pakaian rapi berwarna gelap atau tidak putih, agar kontras dengan latar
- Kerudung yang tidak menutupi wajah (untuk perempuan)
- Ukuran foto sesuai ketentuan, biasanya 4x6 cm

## Tips

- Jangan memakai kacamata atau aksesori yang menutupi wajah.
- Foto harus baru, diambil dalam 6 bulan terakhir.
- Cetak beberapa lembar cadangan untuk keperluan di perjalanan.
$md$,
  $md$## Steps

1. Check the latest photo requirements for the Saudi visa on the visa application platform.
2. Have your photo taken at a studio with a white background, facing forward with your face clearly visible.
3. Ask for a high-resolution digital file as well as printed photos.
4. Save the photo file on your phone and in cloud storage.

## What you need

- Neat clothing in a dark or non-white colour, so it contrasts with the background
- A headscarf that does not cover the face (for women)
- The required photo size, usually 4x6 cm

## Tips

- Do not wear glasses or accessories that cover your face.
- The photo must be recent, taken within the last 6 months.
- Print a few spare copies for use during the trip.
$md$,
  25000,
  75000,
  false,
  false,
  null,
  20,
  true
),
(
  '5eed0000-0000-4000-8000-000000000003',
  '3_6_months_before',
  'documents',
  'Kumpulkan dokumen pendukung (KTP, KK, dll.)',
  'Gather supporting documents (KTP, KK, etc.)',
  'Siapkan dokumen identitas dan keluarga yang dibutuhkan untuk paspor, visa dan perjalanan. Buat salinan cetak dan digital.',
  'Collect the identity and family documents you need for your passport, visa and trip. Make printed and digital copies.',
  $md$## Langkah-langkah

1. Kumpulkan dokumen asli: KTP, KK, akta kelahiran dan buku nikah.
2. Fotokopi setiap dokumen dan pindai ke format PDF.
3. Simpan salinan digital di ponsel dan di penyimpanan awan.
4. Simpan dokumen asli dalam satu map tahan air.

## Yang perlu disiapkan

- KTP elektronik
- Kartu Keluarga (KK)
- Akta kelahiran
- Buku nikah, untuk pasangan suami istri
- Akta kelahiran anak, jika membawa anak

## Tips

- Pastikan data di semua dokumen sama, terutama ejaan nama dan tanggal lahir.
- Jika ada perbedaan data, urus perbaikannya di Dukcapil sebelum membuat paspor.
$md$,
  $md$## Steps

1. Gather the originals: KTP, KK, birth certificate and marriage book.
2. Photocopy each document and scan it to PDF.
3. Save the digital copies on your phone and in cloud storage.
4. Keep the originals together in one waterproof folder.

## What you need

- Electronic ID card (KTP)
- Family card (KK)
- Birth certificate
- Marriage book, for married couples
- Children's birth certificates, if travelling with children

## Tips

- Make sure the details match across all documents, especially name spelling and date of birth.
- If any details differ, have them corrected at the civil registry (Dukcapil) before applying for a passport.
$md$,
  0,
  50000,
  false,
  false,
  null,
  30,
  true
),

-- 3-6 months before: health

(
  '5eed0000-0000-4000-8000-000000000004',
  '3_6_months_before',
  'health',
  'Vaksinasi meningitis (wajib)',
  'Get the meningitis vaccine (required)',
  'Arab Saudi mewajibkan vaksin meningitis bagi jemaah Umrah. Anda akan mendapat sertifikat vaksin internasional (ICV) sebagai bukti.',
  'Saudi Arabia requires a meningitis vaccine for Umrah pilgrims. You receive an International Certificate of Vaccination (ICV) as proof.',
  $md$## Langkah-langkah

1. Daftar vaksinasi secara online lewat layanan resmi Kementerian Kesehatan.
2. Datang ke kantor kekarantinaan kesehatan atau fasilitas kesehatan yang ditunjuk sesuai jadwal.
3. Terima vaksin meningitis ACYW135.
4. Ambil sertifikat vaksin internasional (ICV, "buku kuning").

## Yang perlu disiapkan

- Paspor atau KTP sesuai ketentuan pendaftaran
- Bukti pendaftaran online
- Riwayat kesehatan dan obat yang sedang diminum

## Tips

- Vaksin sebaiknya diberikan paling lambat 10 hari sebelum keberangkatan.
- Sertifikat ini dibutuhkan untuk pengajuan visa, jadi lakukan sebelum mengurus visa.
- Simpan ICV bersama paspor dan foto halaman yang berisi data vaksin.
- Informasi resmi: [kemkes.go.id](https://www.kemkes.go.id)
$md$,
  $md$## Steps

1. Register for the vaccination online through the official Ministry of Health service.
2. Visit the health quarantine office or appointed health facility at your scheduled time.
3. Receive the ACYW135 meningitis vaccine.
4. Collect your International Certificate of Vaccination (ICV, the "yellow book").

## What you need

- Passport or KTP, as the registration requires
- Your online registration proof
- Your medical history and any medicines you take

## Tips

- Get the vaccine at least 10 days before departure.
- The certificate is needed for your visa application, so do this before applying.
- Keep the ICV with your passport and take a photo of the page with your vaccine details.
- Official information: [kemkes.go.id](https://www.kemkes.go.id)
$md$,
  300000,
  800000,
  false,
  false,
  null,
  40,
  true
),
(
  '5eed0000-0000-4000-8000-000000000005',
  '3_6_months_before',
  'health',
  'Pemeriksaan kesehatan umum',
  'Get a general health check-up',
  'Ibadah Umrah banyak berjalan kaki dan dilakukan di cuaca panas. Periksa kesehatan agar Anda tahu kondisi tubuh dan obat yang perlu dibawa.',
  'Umrah involves a lot of walking in hot weather. A check-up tells you how fit you are and which medicines to bring.',
  $md$## Langkah-langkah

1. Buat janji dengan dokter umum atau di puskesmas.
2. Lakukan pemeriksaan dasar: tekanan darah, gula darah, kolesterol dan kondisi jantung.
3. Konsultasikan rencana perjalanan dan aktivitas fisik seperti tawaf dan sa'i.
4. Minta resep dan surat keterangan dokter untuk obat rutin yang akan dibawa.

## Yang perlu disiapkan

- Kartu BPJS atau asuransi kesehatan
- Daftar obat yang sedang diminum
- Hasil pemeriksaan sebelumnya, jika ada

## Tips

- Jemaah lansia atau dengan penyakit kronis sebaiknya periksa lebih awal.
- Mulai rutin jalan kaki untuk melatih stamina.
- Bawa obat dalam kemasan asli beserta resepnya.
$md$,
  $md$## Steps

1. Make an appointment with a general practitioner or at a community health centre (puskesmas).
2. Do basic checks: blood pressure, blood sugar, cholesterol and heart condition.
3. Discuss your travel plans and physical activities such as tawaf and sa'i.
4. Ask for prescriptions and a doctor's letter for any regular medicines you will bring.

## What you need

- BPJS card or health insurance card
- A list of medicines you currently take
- Previous test results, if any

## Tips

- Elderly pilgrims or people with chronic conditions should get checked early.
- Start walking regularly to build stamina.
- Carry medicines in their original packaging with the prescription.
$md$,
  200000,
  1000000,
  false,
  false,
  null,
  50,
  true
),

-- 3-6 months before: financial

(
  '5eed0000-0000-4000-8000-000000000006',
  '3_6_months_before',
  'financial',
  'Tetapkan anggaran dan mulai menabung',
  'Set a budget and start saving',
  'Hitung perkiraan total biaya perjalanan untuk semua anggota rombongan. Mulai sisihkan dana secara rutin.',
  'Estimate the total cost of the trip for everyone in your group. Start setting money aside regularly.',
  $md$## Langkah-langkah

1. Daftar semua pos biaya: paspor, vaksin, visa, tiket pesawat, akomodasi, transportasi lokal, makan dan perlengkapan.
2. Kalikan biaya per orang dengan jumlah anggota rombongan.
3. Tambahkan dana cadangan untuk keperluan tak terduga.
4. Buka rekening tabungan terpisah dan tabung secara rutin setiap bulan.

## Yang perlu disiapkan

- Daftar anggota rombongan
- Perkiraan tanggal keberangkatan
- Rekening tabungan khusus perjalanan

## Tips

- Harga tiket dan hotel biasanya naik menjelang musim ramai seperti Ramadan dan libur sekolah.
- Gunakan menu anggaran di aplikasi ini untuk memantau perkiraan biaya.
$md$,
  $md$## Steps

1. List every cost item: passport, vaccine, visa, flights, accommodation, local transport, meals and supplies.
2. Multiply the per-person costs by the number of people in your group.
3. Add a buffer for unexpected expenses.
4. Open a separate savings account and save a fixed amount every month.

## What you need

- A list of everyone in your group
- Your estimated departure date
- A savings account set aside for the trip

## Tips

- Flight and hotel prices usually rise ahead of busy seasons such as Ramadan and school holidays.
- Use the budget view in this app to track your estimated costs.
$md$,
  null,
  null,
  false,
  true,
  null,
  60,
  true
),

-- 2-3 months before: documents

(
  '5eed0000-0000-4000-8000-000000000007',
  '2_3_months_before',
  'documents',
  'Ajukan visa Umrah Arab Saudi',
  'Apply for a Saudi Umrah visa',
  'Ajukan visa Umrah secara online setelah paspor, pas foto dan sertifikat vaksin meningitis siap.',
  'Apply for your Umrah visa online once your passport, photos and meningitis vaccination certificate are ready.',
  $md$## Langkah-langkah

1. Pastikan paspor masih berlaku minimal 6 bulan dan sertifikat vaksin meningitis sudah ada.
2. Buka platform resmi pengajuan visa Arab Saudi dan buat akun.
3. Isi formulir, unggah pas foto dan halaman identitas paspor.
4. Bayar biaya visa beserta asuransi kesehatan wajib yang menyertainya.
5. Unduh dan cetak e-visa setelah disetujui.

## Yang perlu disiapkan

- **Paspor** yang masih berlaku minimal 6 bulan
- **Sertifikat vaksin meningitis** (ICV)
- Pas foto digital sesuai ketentuan
- Rencana perjalanan dan alamat akomodasi
- Kartu debit atau kredit untuk pembayaran online

## Tips

- Visa tidak bisa diajukan sebelum paspor dan vaksin meningitis selesai.
- Periksa ulang ejaan nama dan nomor paspor sebelum membayar.
- Platform resmi: [nusuk.sa](https://www.nusuk.sa)
$md$,
  $md$## Steps

1. Make sure your passport is valid for at least 6 months and you have your meningitis vaccination certificate.
2. Open the official Saudi visa platform and create an account.
3. Fill in the form and upload your photo and passport identity page.
4. Pay the visa fee and the mandatory health insurance that comes with it.
5. Download and print the e-visa once it is approved.

## What you need

- A **passport** valid for at least 6 months
- Your **meningitis vaccination certificate** (ICV)
- A digital photo that meets the requirements
- Your travel plan and accommodation address
- A debit or credit card for online payment

## Tips

- You cannot apply for the visa until your passport and meningitis vaccine are done.
- Double-check your name spelling and passport number before paying.
- Official platform: [nusuk.sa](https://www.nusuk.sa)
$md$,
  1500000,
  3500000,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000004']::uuid[],
  70,
  true
),
(
  '5eed0000-0000-4000-8000-000000000008',
  '2_3_months_before',
  'documents',
  'Siapkan asuransi perjalanan',
  'Arrange travel insurance',
  'Asuransi perjalanan melindungi Anda dari biaya berobat, keterlambatan penerbangan dan kehilangan bagasi selama di perjalanan.',
  'Travel insurance protects you against medical bills, flight delays and lost luggage during the trip.',
  $md$## Langkah-langkah

1. Cek perlindungan asuransi kesehatan yang sudah termasuk dalam visa.
2. Bandingkan polis asuransi perjalanan yang mencakup Arab Saudi.
3. Pilih polis yang menanggung biaya medis, evakuasi, keterlambatan dan kehilangan bagasi.
4. Beli polis untuk setiap anggota rombongan dan simpan sertifikatnya.

## Yang perlu disiapkan

- Data paspor setiap anggota rombongan
- Tanggal berangkat dan pulang
- Nomor kontak darurat

## Tips

- Pastikan masa perlindungan mencakup seluruh tanggal perjalanan.
- Simpan nomor layanan darurat asuransi di ponsel.
$md$,
  $md$## Steps

1. Check the health insurance cover already included with your visa.
2. Compare travel insurance policies that cover Saudi Arabia.
3. Choose a policy that covers medical costs, evacuation, delays and lost luggage.
4. Buy a policy for each person in your group and keep the certificates.

## What you need

- Passport details for everyone in your group
- Departure and return dates
- An emergency contact number

## Tips

- Make sure the cover runs for every day of your trip.
- Save the insurer's emergency number on your phone.
$md$,
  300000,
  1000000,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000001']::uuid[],
  80,
  true
),

-- 2-3 months before: booking

(
  '5eed0000-0000-4000-8000-000000000009',
  '2_3_months_before',
  'booking',
  'Pesan tiket pesawat (Jeddah atau Madinah)',
  'Book flights (Jeddah or Madinah)',
  'Pesan tiket pulang-pergi ke Jeddah atau Madinah untuk seluruh rombongan. Harga tiket bergantung pada kota keberangkatan Anda.',
  'Book return flights to Jeddah or Madinah for your whole group. The fare depends on your departure city.',
  $md$## Langkah-langkah

1. Tentukan bandara tujuan: Jeddah (JED) atau Madinah (MED).
2. Bandingkan jadwal dan harga dari kota keberangkatan Anda, langsung maupun transit.
3. Pesan tiket untuk semua anggota rombongan dalam satu pemesanan jika memungkinkan.
4. Simpan e-tiket dan kode pemesanan.

## Yang perlu disiapkan

- Data paspor setiap penumpang (nama sesuai paspor)
- Tanggal berangkat dan pulang
- Kartu pembayaran

## Tips

- **Harga tiket bergantung pada kota keberangkatan.** Penerbangan langsung umumnya tersedia dari kota besar; kota lain sering harus transit.
- Tiba di Madinah dan pulang dari Jeddah (atau sebaliknya) bisa menghemat waktu perjalanan darat.
- Cek batas bagasi, terutama jika ingin membawa air zamzam saat pulang.
$md$,
  $md$## Steps

1. Choose your arrival airport: Jeddah (JED) or Madinah (MED).
2. Compare schedules and fares from your departure city, direct or with a transit.
3. Book everyone in your group in one booking if possible.
4. Save the e-tickets and booking code.

## What you need

- Passport details for each passenger (names exactly as in the passport)
- Departure and return dates
- A payment card

## Tips

- **The fare depends on your departure city.** Direct flights usually leave from major cities; other cities often need a transit.
- Flying into Madinah and out of Jeddah (or the other way round) can save time on the road.
- Check the baggage allowance, especially if you plan to bring zamzam water home.
$md$,
  9000000,
  18000000,
  true,
  false,
  array['5eed0000-0000-4000-8000-000000000001']::uuid[],
  90,
  true
),
(
  '5eed0000-0000-4000-8000-000000000010',
  '2_3_months_before',
  'booking',
  'Pesan akomodasi',
  'Book accommodation',
  'Pesan hotel di Makkah dan Madinah sesuai tanggal penerbangan. Pilih lokasi yang dekat dengan masjid agar mudah beribadah.',
  'Book hotels in Makkah and Madinah to match your flight dates. Pick places close to the mosques so worship is easy.',
  $md$## Langkah-langkah

1. Bagi lama tinggal antara Makkah dan Madinah sesuai jadwal penerbangan.
2. Bandingkan hotel berdasarkan jarak ke Masjidil Haram dan Masjid Nabawi.
3. Pesan kamar untuk seluruh rombongan.
4. Simpan bukti pemesanan dan alamat hotel dalam bahasa Arab dan Inggris.

## Yang perlu disiapkan

- Jadwal penerbangan yang sudah pasti
- Jumlah anggota rombongan dan kebutuhan kamar
- Kartu pembayaran

## Tips

- Hotel yang dekat masjid lebih mahal, tetapi menghemat tenaga, terutama untuk lansia.
- Cek apakah harga sudah termasuk sarapan dan pajak.
- Alamat hotel juga dibutuhkan saat mengajukan visa.
$md$,
  $md$## Steps

1. Split your stay between Makkah and Madinah to fit your flight schedule.
2. Compare hotels by distance to Masjid al-Haram and Masjid an-Nabawi.
3. Book rooms for your whole group.
4. Save the booking confirmations and hotel addresses in Arabic and English.

## What you need

- Confirmed flight schedule
- Group size and room needs
- A payment card

## Tips

- Hotels near the mosques cost more but save energy, especially for elderly pilgrims.
- Check whether the price includes breakfast and taxes.
- You also need a hotel address for the visa application.
$md$,
  3000000,
  12000000,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000009']::uuid[],
  100,
  true
),

-- 2-3 months before: financial

(
  '5eed0000-0000-4000-8000-000000000011',
  '2_3_months_before',
  'financial',
  'Tukar mata uang (riyal Saudi/SAR)',
  'Exchange currency (SAR)',
  'Siapkan riyal Saudi (SAR) tunai untuk kebutuhan sehari-hari. Tukar di bank atau money changer resmi.',
  'Get Saudi riyals (SAR) in cash for daily expenses. Exchange them at a bank or licensed money changer.',
  $md$## Langkah-langkah

1. Perkirakan kebutuhan uang tunai untuk makan, transportasi lokal dan belanja kecil.
2. Bandingkan kurs di beberapa bank atau money changer resmi.
3. Tukar sebagian dana ke SAR sebelum berangkat.
4. Aktifkan kartu debit atau kredit untuk transaksi luar negeri sebagai cadangan.

## Yang perlu disiapkan

- KTP atau paspor untuk transaksi penukaran
- Daftar perkiraan pengeluaran harian

## Tips

- Jangan membawa semua uang dalam satu dompet; pisahkan di beberapa tempat.
- Pecahan kecil memudahkan membayar taksi dan makanan.
- Pembayaran kartu dan dompet digital diterima di banyak tempat di Arab Saudi.
$md$,
  $md$## Steps

1. Estimate how much cash you need for meals, local transport and small purchases.
2. Compare rates at a few banks or licensed money changers.
3. Exchange part of your funds into SAR before you leave.
4. Enable your debit or credit card for overseas use as a backup.

## What you need

- KTP or passport for the exchange
- A rough list of daily expenses

## Tips

- Do not keep all your money in one wallet; split it across several places.
- Small notes make it easier to pay for taxis and food.
- Card and mobile payments are accepted in many places in Saudi Arabia.
$md$,
  null,
  null,
  false,
  true,
  array['5eed0000-0000-4000-8000-000000000006']::uuid[],
  110,
  true
),

-- 1 month before: preparation

(
  '5eed0000-0000-4000-8000-000000000012',
  '1_month_before',
  'preparation',
  'Beli pakaian ihram dan perlengkapan',
  'Buy ihram clothing and supplies',
  'Siapkan pakaian ihram dan perlengkapan ibadah. Laki-laki memakai dua lembar kain ihram, perempuan memakai pakaian longgar yang menutup aurat.',
  'Get your ihram clothing and worship supplies. Men wear two sheets of ihram cloth; women wear loose clothing that covers the body.',
  $md$## Langkah-langkah

1. Laki-laki: beli dua set kain ihram (satu cadangan) dan sabuk ihram.
2. Perempuan: siapkan gamis dan kerudung longgar yang nyaman.
3. Beli sandal yang tidak menutup mata kaki dan nyaman untuk berjalan jauh.
4. Lengkapi perlengkapan ibadah dan kebutuhan pribadi.

## Yang perlu disiapkan

- Kain ihram dan sabuk (laki-laki)
- Gamis dan kerudung (perempuan)
- Sandal dan kaus kaki
- Sabun dan sampo tanpa pewangi untuk dipakai saat ihram
- Sajadah lipat, buku du'a dan tas kecil

## Tips

- Coba pakai kain ihram di rumah agar terbiasa.
- Pilih bahan yang menyerap keringat karena cuaca panas.
$md$,
  $md$## Steps

1. Men: buy two sets of ihram cloth (one spare) and an ihram belt.
2. Women: prepare a loose, comfortable dress (gamis) and headscarf.
3. Buy sandals that leave the ankles uncovered and are comfortable for long walks.
4. Complete your worship supplies and personal items.

## What you need

- Ihram cloth and belt (men)
- Dress and headscarf (women)
- Sandals and socks
- Unscented soap and shampoo for use while in ihram
- A foldable prayer mat, a du'a book and a small bag

## Tips

- Practise wearing the ihram cloth at home so it feels familiar.
- Choose breathable fabrics because of the hot weather.
$md$,
  150000,
  600000,
  false,
  false,
  null,
  120,
  true
),
(
  '5eed0000-0000-4000-8000-000000000013',
  '1_month_before',
  'preparation',
  'Kemas barang sesuai daftar',
  'Pack your essentials checklist',
  'Susun daftar barang bawaan dan mulai mengemas. Pisahkan barang untuk koper dan tas kabin.',
  'Make a packing list and start packing. Split items between your suitcase and carry-on bag.',
  $md$## Langkah-langkah

1. Buat daftar barang: pakaian, perlengkapan ibadah, obat, perlengkapan mandi dan elektronik.
2. Taruh dokumen, obat rutin, uang dan satu set pakaian ganti di tas kabin.
3. Kemas sisanya di koper dan timbang sesuai batas bagasi.
4. Beri label nama dan nomor telepon pada setiap tas.

## Yang perlu disiapkan

- Koper dan tas kabin
- Pakaian ihram dan pakaian sehari-hari
- Obat-obatan pribadi
- Colokan universal dan power bank

## Tips

- Sisakan ruang di koper untuk oleh-oleh.
- Power bank wajib dibawa di kabin, bukan di bagasi.
- Bawa botol semprot kecil untuk menyegarkan diri di cuaca panas.
$md$,
  $md$## Steps

1. Make a list: clothes, worship supplies, medicines, toiletries and electronics.
2. Put documents, regular medicines, money and one change of clothes in your carry-on.
3. Pack the rest in your suitcase and weigh it against the baggage limit.
4. Label every bag with your name and phone number.

## What you need

- Suitcase and carry-on bag
- Ihram clothing and everyday clothes
- Personal medicines
- A universal plug adapter and power bank

## Tips

- Leave room in your suitcase for souvenirs.
- Power banks must go in your carry-on, not checked baggage.
- Bring a small spray bottle to cool down in the heat.
$md$,
  null,
  null,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000012']::uuid[],
  130,
  true
),
(
  '5eed0000-0000-4000-8000-000000000014',
  '1_month_before',
  'preparation',
  'Pelajari manasik dan tata cara ibadah',
  'Study basic manasik and rituals',
  'Pelajari urutan ibadah Umrah, dari ihram, tawaf dan sa''i sampai tahallul, agar Anda yakin saat melaksanakannya.',
  'Learn the order of the Umrah rites, from ihram, tawaf and sa''i to tahallul, so you feel confident performing them.',
  $md$## Langkah-langkah

1. Pelajari rukun Umrah: niat ihram di miqat, tawaf, sa'i dan tahallul.
2. Pahami larangan selama ihram.
3. Hafalkan bacaan dan du'a pokok, atau siapkan buku du'a.
4. Ulangi tata cara wudhu dan shalat agar lancar.

## Yang perlu disiapkan

- Buku panduan manasik dari sumber terpercaya
- Video atau kajian manasik dari lembaga resmi

## Tips

- Ketahui miqat sesuai rute penerbangan Anda; sering kali ihram dimulai di pesawat.
- Belajar bersama keluarga atau rombongan agar saling mengingatkan.
$md$,
  $md$## Steps

1. Learn the pillars of Umrah: the ihram intention at the miqat, tawaf, sa'i and tahallul.
2. Understand what is forbidden while in ihram.
3. Memorise the key recitations and du'a, or prepare a du'a book.
4. Review wudhu and prayer so they come naturally.

## What you need

- A manasik guidebook from a trusted source
- Manasik videos or classes from an official institution

## Tips

- Know the miqat for your flight route; ihram often begins on the plane.
- Study with your family or group so you can remind each other.
$md$,
  null,
  null,
  false,
  false,
  null,
  140,
  true
),

-- 1 month before: documents

(
  '5eed0000-0000-4000-8000-000000000015',
  '1_month_before',
  'documents',
  'Pastikan semua dokumen siap',
  'Verify all documents are ready',
  'Periksa bahwa paspor, visa, sertifikat vaksin dan polis asuransi setiap anggota rombongan sudah lengkap dan datanya benar.',
  'Check that every group member''s passport, visa, vaccination certificate and insurance policy are complete and correct.',
  $md$## Langkah-langkah

1. Cocokkan nama dan nomor paspor di visa, tiket dan polis asuransi.
2. Cek masa berlaku paspor dan tanggal berlaku visa.
3. Pastikan sertifikat vaksin meningitis ada untuk setiap orang.
4. Perbaiki data yang salah sekarang, selagi masih ada waktu.

## Yang perlu disiapkan

- Paspor
- E-visa
- Sertifikat vaksin meningitis (ICV)
- Polis asuransi perjalanan
- E-tiket dan bukti pemesanan hotel

## Tips

- Simpan semua dokumen digital dalam satu folder di ponsel.
- Bagikan salinan dokumen ke satu anggota keluarga di rumah.
$md$,
  $md$## Steps

1. Match names and passport numbers across the visa, tickets and insurance policy.
2. Check the passport expiry date and the visa's validity dates.
3. Make sure everyone has a meningitis vaccination certificate.
4. Fix any wrong details now, while there is still time.

## What you need

- Passport
- E-visa
- Meningitis vaccination certificate (ICV)
- Travel insurance policy
- E-tickets and hotel booking confirmations

## Tips

- Keep all digital documents in one folder on your phone.
- Share copies of the documents with a family member at home.
$md$,
  null,
  null,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000007', '5eed0000-0000-4000-8000-000000000008']::uuid[],
  150,
  true
),

-- 1 week before: final checks

(
  '5eed0000-0000-4000-8000-000000000016',
  '1_week_before',
  'final_checks',
  'Konfirmasi tiket pesawat dan hotel',
  'Confirm flight and hotel bookings',
  'Cek ulang jadwal penerbangan dan pemesanan hotel. Pastikan tidak ada perubahan jadwal atau pembatalan.',
  'Double-check your flight times and hotel bookings. Make sure nothing has been rescheduled or cancelled.',
  $md$## Langkah-langkah

1. Cek status penerbangan di situs atau aplikasi maskapai.
2. Hubungi hotel atau cek aplikasi pemesanan untuk konfirmasi.
3. Lakukan check-in online jika sudah dibuka.
4. Atur transportasi dari bandara ke hotel.

## Yang perlu disiapkan

- Kode pemesanan tiket
- Bukti pemesanan hotel
- Nomor kontak maskapai dan hotel

## Tips

- Aktifkan notifikasi dari maskapai agar tahu jika ada perubahan jadwal.
- Catat jam check-in dan check-out hotel.
$md$,
  $md$## Steps

1. Check the flight status on the airline's website or app.
2. Contact the hotel or check the booking app for confirmation.
3. Check in online if it is open.
4. Arrange transport from the airport to the hotel.

## What you need

- Flight booking code
- Hotel booking confirmations
- Airline and hotel contact numbers

## Tips

- Turn on airline notifications so you hear about schedule changes.
- Note the hotel check-in and check-out times.
$md$,
  null,
  null,
  false,
  true,
  array['5eed0000-0000-4000-8000-000000000009', '5eed0000-0000-4000-8000-000000000010']::uuid[],
  160,
  true
),
(
  '5eed0000-0000-4000-8000-000000000017',
  '1_week_before',
  'final_checks',
  'Cetak dan unduh semua dokumen',
  'Print and download all documents',
  'Cetak dokumen penting dan simpan salinan digitalnya agar bisa diakses tanpa internet.',
  'Print your key documents and save digital copies you can open without internet.',
  $md$## Langkah-langkah

1. Cetak e-visa, e-tiket, bukti hotel dan polis asuransi.
2. Unduh semua dokumen ke ponsel agar bisa dibuka secara offline.
3. Simpan cetakan dalam map tahan air.
4. Buat satu set salinan tambahan untuk disimpan terpisah.

## Yang perlu disiapkan

- File e-visa, e-tiket, bukti hotel dan polis asuransi
- Printer atau jasa cetak
- Map dokumen tahan air

## Tips

- Simpan salinan di dua tempat: tas kabin dan koper.
- Bagikan file dokumen ke anggota rombongan lain sebagai cadangan.
$md$,
  $md$## Steps

1. Print the e-visa, e-tickets, hotel confirmations and insurance policy.
2. Download all documents to your phone so they open offline.
3. Keep the printouts in a waterproof folder.
4. Make an extra set of copies to store separately.

## What you need

- E-visa, e-ticket, hotel and insurance files
- A printer or print shop
- A waterproof document folder

## Tips

- Keep copies in two places: your carry-on and your suitcase.
- Share the document files with another group member as a backup.
$md$,
  10000,
  50000,
  false,
  true,
  array['5eed0000-0000-4000-8000-000000000015']::uuid[],
  170,
  true
),
(
  '5eed0000-0000-4000-8000-000000000018',
  '1_week_before',
  'final_checks',
  'Kabari keluarga dan siapkan rencana komunikasi',
  'Notify family and set up a communication plan',
  'Beri tahu keluarga jadwal perjalanan Anda dan siapkan cara tetap terhubung selama di Arab Saudi.',
  'Share your travel schedule with family and set up a way to stay in touch while in Saudi Arabia.',
  $md$## Langkah-langkah

1. Bagikan jadwal penerbangan dan alamat hotel kepada keluarga.
2. Pilih paket roaming internasional atau rencanakan membeli kartu SIM lokal.
3. Buat grup pesan untuk rombongan dan keluarga di rumah.
4. Tentukan titik kumpul jika ada anggota rombongan yang terpisah.

## Yang perlu disiapkan

- Ponsel yang sudah tidak terkunci operator, jika ingin memakai SIM lokal
- Nomor kontak darurat keluarga
- Nomor kontak KBRI Riyadh dan KJRI Jeddah

## Tips

- Simpan nomor darurat di kertas juga, bukan hanya di ponsel.
- Sepakati jam rutin untuk memberi kabar ke keluarga.
$md$,
  $md$## Steps

1. Share your flight schedule and hotel addresses with family.
2. Choose an international roaming plan or plan to buy a local SIM card.
3. Create a messaging group for your travel group and family at home.
4. Agree on a meeting point in case anyone in the group gets separated.

## What you need

- An unlocked phone, if you plan to use a local SIM
- Family emergency contact numbers
- Contact numbers for the Indonesian Embassy in Riyadh and Consulate General in Jeddah

## Tips

- Write emergency numbers on paper too, not only on your phone.
- Agree on regular times to check in with family.
$md$,
  150000,
  500000,
  false,
  true,
  null,
  180,
  true
),

-- 1 week before: spiritual

(
  '5eed0000-0000-4000-8000-000000000019',
  '1_week_before',
  'spiritual',
  'Ikuti bimbingan manasik (jika ada di kota Anda)',
  'Attend a manasik briefing (if available locally)',
  'Ikuti bimbingan manasik di masjid atau lembaga setempat untuk memantapkan pemahaman ibadah Umrah.',
  'Join a manasik briefing at a local mosque or institution to strengthen your understanding of the Umrah rites.',
  $md$## Langkah-langkah

1. Cari jadwal bimbingan manasik di masjid, KUA atau lembaga di kota Anda.
2. Daftar dan hadiri sesi, idealnya bersama seluruh rombongan.
3. Praktikkan tawaf dan sa'i dalam simulasi jika tersedia.
4. Tanyakan hal yang belum jelas kepada pembimbing.

## Yang perlu disiapkan

- Catatan dari belajar manasik sebelumnya
- Pakaian ihram, jika ada praktik langsung

## Tips

- Jika tidak ada bimbingan di kota Anda, ikuti kajian manasik online dari lembaga resmi.
- Perbanyak du'a dan persiapan hati menjelang keberangkatan.
$md$,
  $md$## Steps

1. Look for manasik briefings at a mosque, the local religious affairs office (KUA) or an institution in your city.
2. Register and attend, ideally with your whole group.
3. Practise tawaf and sa'i in a simulation if one is offered.
4. Ask the instructor about anything that is still unclear.

## What you need

- Your notes from earlier manasik study
- Ihram clothing, if there is hands-on practice

## Tips

- If there is no briefing in your city, join an online manasik class from an official institution.
- Spend more time in du'a and prepare yourself spiritually before departure.
$md$,
  0,
  500000,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000014']::uuid[],
  190,
  true
),

-- Departure day: checklist

(
  '5eed0000-0000-4000-8000-000000000020',
  'departure_day',
  'checklist',
  'Cek akhir barang bawaan',
  'Final packing check',
  'Periksa sekali lagi isi koper dan tas kabin sebelum berangkat ke bandara.',
  'Check your suitcase and carry-on one last time before leaving for the airport.',
  $md$## Langkah-langkah

1. Cocokkan isi koper dengan daftar barang bawaan.
2. Pastikan barang cair di tas kabin sesuai aturan penerbangan.
3. Timbang koper sekali lagi.
4. Kunci koper dan pasang label nama.

## Yang perlu disiapkan

- Daftar barang bawaan
- Timbangan koper
- Gembok koper

## Tips

- Laki-laki yang memulai ihram di pesawat bisa memakai kain ihram dari rumah atau menyimpannya di tas kabin.
- Bawa camilan dan botol minum kosong untuk diisi setelah pemeriksaan keamanan.
$md$,
  $md$## Steps

1. Check your suitcase against your packing list.
2. Make sure liquids in your carry-on follow airline rules.
3. Weigh your suitcase once more.
4. Lock your suitcase and attach a name label.

## What you need

- Your packing list
- A luggage scale
- A luggage lock

## Tips

- Men who start ihram on the plane can wear the ihram cloth from home or keep it in their carry-on.
- Bring snacks and an empty water bottle to fill after security.
$md$,
  null,
  null,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000013']::uuid[],
  200,
  true
),
(
  '5eed0000-0000-4000-8000-000000000021',
  'departure_day',
  'checklist',
  'Tiba di bandara dan check-in',
  'Airport arrival and check-in',
  'Datang ke bandara lebih awal untuk check-in, menyerahkan bagasi dan melewati pemeriksaan imigrasi.',
  'Arrive at the airport early to check in, drop your bags and clear immigration.',
  $md$## Langkah-langkah

1. Berangkat ke bandara agar tiba paling lambat 3 jam sebelum penerbangan internasional.
2. Check-in di konter maskapai dan serahkan bagasi.
3. Lewati pemeriksaan imigrasi dengan paspor dan boarding pass.
4. Tunggu di ruang tunggu sesuai nomor gerbang.

## Yang perlu disiapkan

- Paspor dan e-visa
- E-tiket atau kode pemesanan
- Transportasi ke bandara

## Tips

- Rombongan sebaiknya berkumpul di satu titik sebelum check-in.
- Cek papan informasi penerbangan untuk perubahan gerbang.
$md$,
  $md$## Steps

1. Leave for the airport so you arrive at least 3 hours before an international flight.
2. Check in at the airline counter and drop your bags.
3. Clear immigration with your passport and boarding pass.
4. Wait in the departure area by your gate number.

## What you need

- Passport and e-visa
- E-ticket or booking code
- Transport to the airport

## Tips

- Have your group meet at one spot before check-in.
- Watch the flight information screens for gate changes.
$md$,
  100000,
  500000,
  false,
  true,
  array['5eed0000-0000-4000-8000-000000000016']::uuid[],
  210,
  true
),
(
  '5eed0000-0000-4000-8000-000000000022',
  'departure_day',
  'checklist',
  'Verifikasi dokumen di tas kabin',
  'Verify documents in your carry-on',
  'Pastikan semua dokumen penting ada di tas kabin dan mudah dijangkau, bukan di koper bagasi.',
  'Make sure all key documents are in your carry-on and easy to reach, not in your checked baggage.',
  $md$## Langkah-langkah

1. Periksa map dokumen di tas kabin sebelum meninggalkan rumah.
2. Pastikan paspor, e-visa, ICV dan e-tiket ada untuk setiap orang.
3. Simpan paspor di tempat yang aman tetapi mudah dijangkau.
4. Periksa lagi setelah melewati imigrasi.

## Yang perlu disiapkan

- Paspor
- E-visa
- Sertifikat vaksin meningitis (ICV)
- E-tiket dan bukti hotel
- Polis asuransi perjalanan

## Tips

- Gunakan tas kecil yang dikalungkan untuk paspor dan uang.
- Salah satu anggota rombongan bisa menyimpan salinan dokumen semua orang.
$md$,
  $md$## Steps

1. Check the document folder in your carry-on before leaving home.
2. Make sure everyone has their passport, e-visa, ICV and e-ticket.
3. Keep your passport somewhere safe but easy to reach.
4. Check again after you clear immigration.

## What you need

- Passport
- E-visa
- Meningitis vaccination certificate (ICV)
- E-ticket and hotel confirmation
- Travel insurance policy

## Tips

- Use a small neck pouch for your passport and money.
- One group member can carry copies of everyone's documents.
$md$,
  null,
  null,
  false,
  false,
  array['5eed0000-0000-4000-8000-000000000017']::uuid[],
  220,
  true
)

on conflict (id) do update set
  phase_key = excluded.phase_key,
  category_key = excluded.category_key,
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  summary_id = excluded.summary_id,
  summary_en = excluded.summary_en,
  detail_content_id = excluded.detail_content_id,
  detail_content_en = excluded.detail_content_en,
  estimated_cost_min = excluded.estimated_cost_min,
  estimated_cost_max = excluded.estimated_cost_max,
  cost_varies_by_city = excluded.cost_varies_by_city,
  is_shared_step = excluded.is_shared_step,
  dependency_step_ids = excluded.dependency_step_ids,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();

-- Flight cost per departure city (step 09)

insert into public.city_cost_overrides (step_id, city, cost_min, cost_max) values
  ('5eed0000-0000-4000-8000-000000000009', 'Jakarta', 9000000, 15000000),
  ('5eed0000-0000-4000-8000-000000000009', 'Surabaya', 10000000, 16000000),
  ('5eed0000-0000-4000-8000-000000000009', 'Medan', 9500000, 16000000),
  ('5eed0000-0000-4000-8000-000000000009', 'Makassar', 11000000, 18000000),
  ('5eed0000-0000-4000-8000-000000000009', 'Yogyakarta', 10500000, 17000000)
on conflict (step_id, city) do update set
  cost_min = excluded.cost_min,
  cost_max = excluded.cost_max;
