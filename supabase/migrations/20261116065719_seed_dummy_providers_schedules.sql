-- Dummy data so every Jadwal and provider screen can be judged before real
-- data exists: 10 fictional providers (6 muthawif, 4 travel) with
-- affiliations, verifications, catalog items and reviews, plus 15 schedules
-- in January 2027 (Makkah, Thaif and Madinah) with vehicle options.
--
-- Idempotent: fixed ids plus upserts, so it can run again safely. Every id
-- starts with d0000000-0000-4000-8000- followed by a two-digit table block
-- (01 service_types, 02 providers, 03 affiliations, 04 verifications,
-- 05 catalog items, 06 reviews, 07 schedules, 08 schedule options) and ten
-- digits. providers and schedules carry is_dummy = true; deleting the dummy
-- providers cascades to every child row. Names, numbers and bank accounts
-- are made up and match no real person or company.

-- Fixed id: table block (2 digits) + running number (10 digits)
create function pg_temp.did(p_block integer, p_n bigint)
returns uuid
language sql
immutable
as $$
  select ('d0000000-0000-4000-8000-' || lpad(p_block::text, 2, '0') || lpad(p_n::text, 10, '0'))::uuid;
$$;

-- Service types (nothing else seeds them; schedules need one)

insert into public.service_types (id, key, name_id, name_en, sort_order)
values
  (pg_temp.did(1, 1), 'umrah_guidance', 'Pendampingan Umrah', 'Umrah guidance', 1),
  (pg_temp.did(1, 2), 'city_tour', 'City tour / tur sehari Thaif', 'City tour / Thaif day trip', 2),
  (pg_temp.did(1, 3), 'ziarah', 'Ziarah Madinah', 'Madinah ziarah', 3)
on conflict (key) do update set
  name_id = excluded.name_id,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order;

-- Providers: 1-6 muthawif, 7-10 travel. Provider 5 is the unverified one.

insert into public.providers (
  id, provider_type, name, bio_id, bio_en, whatsapp_number, bank_account_text,
  is_dummy, is_published
)
values
  (pg_temp.did(2, 1), 'muthawif', 'Ustadz Hasan Al-Mubarok',
   'Muthawif berpengalaman lebih dari 10 tahun mendampingi jamaah Indonesia di Makkah dan Madinah. Sabar dan ramah untuk jamaah lansia.',
   'Muthawif with more than 10 years of experience guiding Indonesian pilgrims in Makkah and Madinah. Patient and friendly with elderly pilgrims.',
   '6281200000001', 'Bank Contoh 000-111-0001 a.n. Hasan (data fiktif)', true, true),
  (pg_temp.did(2, 2), 'muthawif', 'Ustadz Rizal Hakim',
   'Lulusan Madinah yang fokus pada bimbingan manasik dan ziarah. Menjelaskan sejarah tiap tempat dengan runtut.',
   'Madinah graduate focused on manasik guidance and ziarah. Explains the history of each place clearly.',
   '6281200000002', 'Bank Contoh 000-111-0002 a.n. Rizal (data fiktif)', true, true),
  (pg_temp.did(2, 3), 'muthawif', 'Ustadz Farid Ramadhan',
   'Pendamping Umrah mandiri dan keluarga kecil. Menguasai rute Makkah dan tur sehari Thaif.',
   'Guide for independent and small-family Umrah. Knows the Makkah routes and the Thaif day trip well.',
   '6281200000003', 'Bank Contoh 000-111-0003 a.n. Farid (data fiktif)', true, true),
  (pg_temp.did(2, 4), 'muthawif', 'Ustadz Yusuf Maulana',
   'Pemilik layanan pendampingan kecil di Makkah dan Madinah. Grup kecil, jadwal fleksibel.',
   'Owner of a small guidance service in Makkah and Madinah. Small groups, flexible schedule.',
   '6281200000004', 'Bank Contoh 000-111-0004 a.n. Yusuf (data fiktif)', true, true),
  (pg_temp.did(2, 5), 'muthawif', 'Ustadz Irfan Syahputra',
   'Muthawif baru yang melayani pendampingan Umrah dan ziarah. Proses verifikasi masih berjalan.',
   'New muthawif offering Umrah guidance and ziarah. Verification is still in progress.',
   '6281200000005', 'Bank Contoh 000-111-0005 a.n. Irfan (data fiktif)', true, true),
  (pg_temp.did(2, 6), 'muthawif', 'Ustadzah Nabila Zahra',
   'Muthawifah untuk jamaah perempuan dan keluarga. Mendampingi ibadah dan ziarah dengan tempo yang nyaman.',
   'Female guide for women pilgrims and families. Accompanies worship and ziarah at a comfortable pace.',
   '6281200000006', 'Bank Contoh 000-111-0006 a.n. Nabila (data fiktif)', true, true),
  (pg_temp.did(2, 7), 'travel', 'Cahaya Haramain Travel',
   'Penyelenggara perjalanan Umrah dengan layanan darat dan pendampingan di Tanah Suci.',
   'Umrah travel organiser with ground services and guidance in the Holy Land.',
   '6281200000007', 'Bank Contoh 000-222-0007 a.n. PT Cahaya Haramain (data fiktif)', true, true),
  (pg_temp.did(2, 8), 'travel', 'Nurul Safar Wisata',
   'Biro perjalanan dengan paket Umrah reguler, tur sehari Thaif dan ziarah Madinah.',
   'Travel agency with regular Umrah packages, Thaif day trips and Madinah ziarah.',
   '6281200000008', 'Bank Contoh 000-222-0008 a.n. PT Nurul Safar (data fiktif)', true, true),
  (pg_temp.did(2, 9), 'travel', 'Barokah Sejahtera Tour',
   'Travel keluarga dengan armada bus dan Hiace untuk jamaah mandiri maupun rombongan.',
   'Family-run travel with buses and Hiace vans for independent pilgrims and groups.',
   '6281200000009', 'Bank Contoh 000-222-0009 a.n. PT Barokah Sejahtera (data fiktif)', true, true),
  (pg_temp.did(2, 10), 'travel', 'Mutiara Hijaz Umrah',
   'Layanan Umrah dan ziarah dengan kendaraan nyaman dan jadwal tepat waktu.',
   'Umrah and ziarah service with comfortable vehicles and punctual schedules.',
   '6281200000010', 'Bank Contoh 000-222-0010 a.n. PT Mutiara Hijaz (data fiktif)', true, true)
on conflict (id) do update set
  provider_type = excluded.provider_type,
  name = excluded.name,
  bio_id = excluded.bio_id,
  bio_en = excluded.bio_en,
  whatsapp_number = excluded.whatsapp_number,
  bank_account_text = excluded.bank_account_text,
  is_dummy = excluded.is_dummy,
  is_published = excluded.is_published;

-- Affiliations (member -> organization). Rows 5 and 6 are not shown to
-- users: 5 has ended, 6 is confirmed by the member only.

insert into public.provider_affiliations (
  id, member_provider_id, organization_provider_id, relationship_type, status,
  started_on, ended_on, confirmed_by_member, confirmed_by_organization
)
values
  (pg_temp.did(3, 1), pg_temp.did(2, 1), pg_temp.did(2, 7), 'works_at', 'active', date '2023-03-01', null, true, true),
  (pg_temp.did(3, 2), pg_temp.did(2, 2), pg_temp.did(2, 7), 'partner', 'active', date '2024-01-15', null, true, true),
  (pg_temp.did(3, 3), pg_temp.did(2, 3), pg_temp.did(2, 8), 'works_at', 'active', date '2022-09-01', null, true, true),
  (pg_temp.did(3, 4), pg_temp.did(2, 4), pg_temp.did(2, 9), 'owner', 'active', date '2021-05-10', null, true, true),
  (pg_temp.did(3, 5), pg_temp.did(2, 5), pg_temp.did(2, 8), 'works_at', 'ended', date '2023-06-01', date '2024-06-01', true, true),
  (pg_temp.did(3, 6), pg_temp.did(2, 2), pg_temp.did(2, 10), 'partner', 'active', date '2026-09-01', null, true, false)
on conflict (id) do update set
  member_provider_id = excluded.member_provider_id,
  organization_provider_id = excluded.organization_provider_id,
  relationship_type = excluded.relationship_type,
  status = excluded.status,
  started_on = excluded.started_on,
  ended_on = excluded.ended_on,
  confirmed_by_member = excluded.confirmed_by_member,
  confirmed_by_organization = excluded.confirmed_by_organization;

-- Verifications: all verified except provider 5 (pending, so not verified)

insert into public.provider_verifications (
  id, provider_id, status, verified_on, expires_on, criteria_met, reviewed_by
)
values
  (pg_temp.did(4, 1), pg_temp.did(2, 1), 'verified', date '2026-08-10', date '2027-08-10',
   array['identity', 'active_phone', 'muthawif_experience', 'social_media', 'affiliated_travel_verified'], 'dummy'),
  (pg_temp.did(4, 2), pg_temp.did(2, 2), 'verified', date '2026-08-12', date '2027-08-12',
   array['identity', 'active_phone', 'muthawif_experience', 'affiliated_travel_verified'], 'dummy'),
  (pg_temp.did(4, 3), pg_temp.did(2, 3), 'verified', date '2026-09-01', date '2027-09-01',
   array['identity', 'active_phone', 'muthawif_experience', 'social_media', 'affiliated_travel_verified'], 'dummy'),
  (pg_temp.did(4, 4), pg_temp.did(2, 4), 'verified', date '2026-09-05', date '2027-09-05',
   array['identity', 'active_phone', 'active_email', 'muthawif_experience', 'affiliated_travel_verified'], 'dummy'),
  (pg_temp.did(4, 5), pg_temp.did(2, 5), 'pending', null, null,
   array['identity', 'active_phone'], 'dummy'),
  (pg_temp.did(4, 6), pg_temp.did(2, 6), 'verified', date '2026-10-01', date '2027-10-01',
   array['identity', 'active_phone', 'muthawif_experience', 'social_media'], 'dummy'),
  (pg_temp.did(4, 7), pg_temp.did(2, 7), 'verified', date '2026-07-20', date '2027-07-20',
   array['business_license', 'active_phone', 'active_email', 'bank_account_name_match', 'office_address', 'identity'], 'dummy'),
  (pg_temp.did(4, 8), pg_temp.did(2, 8), 'verified', date '2026-07-25', date '2027-07-25',
   array['business_license', 'active_phone', 'active_email', 'bank_account_name_match', 'office_address'], 'dummy'),
  (pg_temp.did(4, 9), pg_temp.did(2, 9), 'verified', date '2026-08-30', date '2027-08-30',
   array['business_license', 'active_phone', 'bank_account_name_match', 'office_address', 'identity', 'social_media'], 'dummy'),
  (pg_temp.did(4, 10), pg_temp.did(2, 10), 'verified', date '2026-10-15', date '2027-10-15',
   array['business_license', 'active_phone', 'active_email', 'bank_account_name_match', 'office_address', 'identity'], 'dummy')
on conflict (id) do update set
  provider_id = excluded.provider_id,
  status = excluded.status,
  verified_on = excluded.verified_on,
  expires_on = excluded.expires_on,
  criteria_met = excluded.criteria_met,
  reviewed_by = excluded.reviewed_by;

-- Catalog items; item 11 is unpublished. Images are placeholders or null.

insert into public.provider_catalog_items (
  id, provider_id, service_type_id, title_id, title_en, description_id, description_en,
  image_url, sort_order, is_published
)
select
  pg_temp.did(5, v.n), pg_temp.did(2, v.p), st.id, v.title_id, v.title_en,
  v.description_id, v.description_en, v.image_url, v.sort_order, v.is_published
from (
  values
    (1, 1, 'umrah_guidance', 'Pendampingan Umrah di Makkah', 'Umrah guidance in Makkah',
     'Dampingi thawaf, sa''i dan tahallul dengan bimbingan doa.', 'Guidance through tawaf, sa''i and tahallul with supplications.',
     'https://picsum.photos/seed/umrah-dummy-1/800/450', 1, true),
    (2, 1, 'ziarah', 'Ziarah Madinah setengah hari', 'Half-day Madinah ziarah',
     'Masjid Quba, Jabal Uhud dan sekitarnya.', 'Quba Mosque, Mount Uhud and surroundings.',
     null, 2, true),
    (3, 2, 'ziarah', 'Ziarah dan sejarah Madinah', 'Madinah ziarah and history',
     'Penjelasan sejarah tiap lokasi dengan tempo santai.', 'History of each site at a relaxed pace.',
     'https://picsum.photos/seed/umrah-dummy-3/800/450', 1, true),
    (4, 2, 'umrah_guidance', 'Bimbingan manasik Umrah', 'Umrah manasik guidance',
     'Latihan dan pendampingan manasik sebelum dan saat Umrah.', 'Manasik practice and guidance before and during Umrah.',
     null, 2, true),
    (5, 3, 'umrah_guidance', 'Pendampingan Umrah mandiri', 'Independent Umrah guidance',
     'Cocok untuk keluarga kecil yang berangkat mandiri.', 'Suits small families travelling independently.',
     null, 1, true),
    (6, 3, 'city_tour', 'Tur sehari Thaif dari Makkah', 'Thaif day trip from Makkah',
     'Kebun anggur, Al-Hada dan pasar lokal dalam satu hari.', 'Vineyards, Al-Hada and the local market in one day.',
     'https://picsum.photos/seed/umrah-dummy-6/800/450', 2, true),
    (7, 4, 'umrah_guidance', 'Pendampingan grup kecil', 'Small-group guidance',
     'Maksimal 8 orang per grup agar tetap nyaman.', 'At most 8 people per group to stay comfortable.',
     null, 1, true),
    (8, 4, 'ziarah', 'Ziarah Madinah grup kecil', 'Small-group Madinah ziarah',
     'Jadwal fleksibel menyesuaikan waktu shalat.', 'Flexible schedule around prayer times.',
     null, 2, true),
    (9, 4, 'city_tour', 'Tur Thaif privat', 'Private Thaif tour',
     'Kendaraan privat dengan rute yang bisa disesuaikan.', 'Private vehicle with an adjustable route.',
     null, 3, true),
    (10, 5, 'ziarah', 'Ziarah Madinah', 'Madinah ziarah',
     'Kunjungan ke tempat bersejarah utama di Madinah.', 'Visits to the main historical places in Madinah.',
     null, 1, true),
    (11, 5, 'umrah_guidance', 'Paket Umrah lengkap (sedang disusun)', 'Complete Umrah package (in preparation)',
     'Masih dalam penyusunan, belum ditampilkan.', 'Still being prepared, not shown yet.',
     null, 2, false),
    (12, 6, 'umrah_guidance', 'Pendampingan Umrah untuk perempuan', 'Umrah guidance for women',
     'Pendampingan oleh muthawifah untuk ibu dan keluarga.', 'Guidance by a female guide for mothers and families.',
     'https://picsum.photos/seed/umrah-dummy-12/800/450', 1, true),
    (13, 6, 'ziarah', 'Ziarah Madinah ramah lansia', 'Elderly-friendly Madinah ziarah',
     'Tempo pelan dengan waktu istirahat cukup.', 'Slow pace with enough rest stops.',
     null, 2, true),
    (14, 7, 'umrah_guidance', 'Layanan darat dan pendampingan Makkah', 'Ground service and guidance in Makkah',
     'Transportasi, pendamping dan jadwal ibadah terpadu.', 'Integrated transport, guide and worship schedule.',
     'https://picsum.photos/seed/umrah-dummy-14/800/450', 1, true),
    (15, 7, 'city_tour', 'Tur sehari Thaif', 'Thaif day trip',
     'Berangkat pagi dari Makkah, kembali sore hari.', 'Leaves Makkah in the morning, back in the afternoon.',
     null, 2, true),
    (16, 8, 'city_tour', 'Join bus Thaif', 'Thaif bus join',
     'Bus besar dengan sistem join, harga hemat per orang.', 'Large bus on a join basis, low price per person.',
     'https://picsum.photos/seed/umrah-dummy-16/800/450', 1, true),
    (17, 8, 'ziarah', 'Ziarah Madinah rombongan', 'Madinah group ziarah',
     'Ziarah bersama rombongan dengan pendamping.', 'Group ziarah with a guide.',
     null, 2, true),
    (18, 8, 'umrah_guidance', 'Pendampingan Umrah reguler', 'Regular Umrah guidance',
     'Pendampingan Umrah dari awal hingga tahallul.', 'Guidance from the start to tahallul.',
     null, 3, true),
    (19, 9, 'city_tour', 'Tur Thaif bus dan Hiace', 'Thaif tour by bus and Hiace',
     'Pilih bus untuk join atau Hiace untuk keluarga.', 'Choose a bus to join or a Hiace for families.',
     null, 1, true),
    (20, 9, 'umrah_guidance', 'Transportasi Umrah Makkah', 'Umrah transport in Makkah',
     'Antar jemput hotel dan Masjidil Haram.', 'Hotel and Masjid al-Haram transfers.',
     null, 2, true),
    (21, 10, 'ziarah', 'Ziarah Madinah nyaman', 'Comfortable Madinah ziarah',
     'Kendaraan ber-AC dengan jadwal tepat waktu.', 'Air-conditioned vehicle with a punctual schedule.',
     'https://picsum.photos/seed/umrah-dummy-21/800/450', 1, true),
    (22, 10, 'umrah_guidance', 'Pendampingan Umrah keluarga', 'Family Umrah guidance',
     'Pendampingan untuk keluarga dengan anak dan lansia.', 'Guidance for families with children and elderly.',
     null, 2, true)
) as v (n, p, service_key, title_id, title_en, description_id, description_en, image_url, sort_order, is_published)
left join public.service_types st on st.key = v.service_key
on conflict (id) do update set
  provider_id = excluded.provider_id,
  service_type_id = excluded.service_type_id,
  title_id = excluded.title_id,
  title_en = excluded.title_en,
  description_id = excluded.description_id,
  description_en = excluded.description_en,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- Reviews: mostly 4-5 stars; review 27 is hidden. Travel providers have
-- their own reviews.

insert into public.provider_reviews (id, provider_id, rating, content, display_name, is_hidden)
select pg_temp.did(6, v.n), pg_temp.did(2, v.p), v.rating, v.content, v.display_name, v.is_hidden
from (
  values
    (1, 1, 5, 'Penjelasannya jelas dan sabar. Ibu saya yang sudah lansia merasa sangat terbantu.', 'Siti R.', false),
    (2, 1, 5, 'Doa-doa saat thawaf dibimbing satu per satu. Terima kasih banyak, Ustadz.', 'Budi S.', false),
    (3, 1, 4, 'Bagus, hanya saja titik kumpul sempat berpindah tanpa kabar awal.', 'Dewi A.', false),
    (4, 2, 5, 'Ziarah Madinah jadi bermakna karena sejarahnya diceritakan runtut.', 'Ahmad F.', false),
    (5, 2, 4, 'Materi manasiknya mudah diikuti, waktunya pas.', 'Rina M.', false),
    (6, 2, 5, 'Ramah dan tepat waktu. Insyaallah akan memakai jasanya lagi.', 'Hendra K.', false),
    (7, 3, 5, 'Tur Thaif-nya seru, kebun anggurnya indah dan kami tidak terburu-buru.', 'Lestari P.', false),
    (8, 3, 4, 'Pendampingan mandiri yang membantu, rute di Makkah jadi tidak membingungkan.', 'Agus W.', false),
    (9, 3, 3, 'Secara umum baik, tetapi kami berangkat agak terlambat dari jadwal.', 'Fitri N.', false),
    (10, 4, 5, 'Grup kecil membuat kami bisa bertanya banyak hal. Sangat nyaman.', 'Yoga P.', false),
    (11, 4, 4, 'Jadwal fleksibel, menyesuaikan waktu shalat dengan baik.', 'Maya L.', false),
    (12, 4, 5, 'Tur Thaif privatnya berkesan, sopirnya juga ramah.', 'Dimas A.', false),
    (13, 5, 4, 'Penjelasan lokasi ziarahnya cukup lengkap untuk muthawif baru.', 'Nur H.', false),
    (14, 5, 3, 'Baik, tetapi koordinasi lewat WhatsApp kadang lambat dibalas.', 'Joko T.', false),
    (15, 6, 5, 'Sebagai perempuan, saya merasa aman dan nyaman didampingi Ustadzah Nabila.', 'Aisyah D.', false),
    (16, 6, 5, 'Tempo ziarah pelan dan ada waktu istirahat. Cocok untuk orang tua kami.', 'Wulan S.', false),
    (17, 6, 4, 'Bagus dan sabar. Semoga jadwalnya bisa lebih banyak.', 'Intan C.', false),
    (18, 7, 5, 'Layanan darat rapi, jemputan tepat waktu dan pendampingnya membantu.', 'Rizki A.', false),
    (19, 7, 4, 'Secara keseluruhan memuaskan, komunikasi cepat.', 'Sari D.', false),
    (20, 7, 2, 'Bus sempat terlambat 30 menit dan informasinya kurang jelas.', 'Eko P.', false),
    (21, 8, 5, 'Join bus ke Thaif murah dan teratur. Cocok untuk jamaah mandiri.', 'Tuti H.', false),
    (22, 8, 4, 'Ziarah Madinah rombongan berjalan lancar, pendamping ramah.', 'Bayu S.', false),
    (23, 8, 4, 'Harga bersahabat dan jadwal jelas.', 'Ratna W.', false),
    (24, 9, 5, 'Hiace-nya bersih dan nyaman untuk keluarga kami berenam.', 'Andi M.', false),
    (25, 9, 4, 'Armada bagus, sopir paham rute. Istirahat bisa sedikit lebih lama.', 'Putri K.', false),
    (26, 10, 5, 'Kendaraan ber-AC dan jadwal ziarah tepat waktu. Rekomendasi.', 'Lina F.', false),
    (27, 10, 1, 'Ulasan contoh yang disembunyikan untuk menguji filter ulasan.', 'Tamu X.', true),
    (28, 10, 4, 'Pelayanannya baik dan responsif.', 'Hadi R.', false)
) as v (n, p, rating, content, display_name, is_hidden)
on conflict (id) do update set
  provider_id = excluded.provider_id,
  rating = excluded.rating,
  content = excluded.content,
  display_name = excluded.display_name,
  is_hidden = excluded.is_hidden;

-- Schedules in January 2027: attendance, option and payment deadlines at
-- H-3, H-2 and H-1 of the date, 20:00 Makkah time (+03). Schedule 5 is
-- unpublished. Thaif is a day trip from Makkah.

insert into public.schedules (
  id, provider_id, service_type_id, city, schedule_date,
  attendance_deadline, option_deadline, payment_deadline,
  discussion_group_url, final_group_url, is_dummy, is_published
)
select
  pg_temp.did(7, v.n), pg_temp.did(2, v.p), st.id, v.city, v.schedule_date,
  ((v.schedule_date - 3)::text || ' 20:00:00+03')::timestamptz,
  ((v.schedule_date - 2)::text || ' 20:00:00+03')::timestamptz,
  ((v.schedule_date - 1)::text || ' 20:00:00+03')::timestamptz,
  v.discussion_code,
  v.final_code,
  true, v.is_published
from (
  values
    (1, 1, 'umrah_guidance', 'Makkah', date '2027-01-05', 'https://chat.whatsapp.com/DUMMYmk01', 'https://chat.whatsapp.com/DUMMYfinalmk01', true),
    (2, 2, 'umrah_guidance', 'Makkah', date '2027-01-12', 'https://chat.whatsapp.com/DUMMYmk02', null, true),
    (3, 3, 'umrah_guidance', 'Makkah', date '2027-01-12', 'https://chat.whatsapp.com/DUMMYmk03', null, true),
    (4, 7, 'umrah_guidance', 'Makkah', date '2027-01-19', 'https://chat.whatsapp.com/DUMMYmk04', 'https://chat.whatsapp.com/DUMMYfinalmk04', true),
    (5, 4, 'umrah_guidance', 'Makkah', date '2027-01-26', 'https://chat.whatsapp.com/DUMMYmk05', null, false),
    (6, 1, 'city_tour', 'Thaif', date '2027-01-08', 'https://chat.whatsapp.com/DUMMYth06', null, true),
    (7, 3, 'city_tour', 'Thaif', date '2027-01-15', 'https://chat.whatsapp.com/DUMMYth07', 'https://chat.whatsapp.com/DUMMYfinalth07', true),
    (8, 8, 'city_tour', 'Thaif', date '2027-01-15', 'https://chat.whatsapp.com/DUMMYth08', null, true),
    (9, 9, 'city_tour', 'Thaif', date '2027-01-22', 'https://chat.whatsapp.com/DUMMYth09', null, true),
    (10, 4, 'city_tour', 'Thaif', date '2027-01-29', null, null, true),
    (11, 2, 'ziarah', 'Madinah', date '2027-01-10', 'https://chat.whatsapp.com/DUMMYmd11', null, true),
    (12, 6, 'ziarah', 'Madinah', date '2027-01-10', 'https://chat.whatsapp.com/DUMMYmd12', 'https://chat.whatsapp.com/DUMMYfinalmd12', true),
    (13, 4, 'ziarah', 'Madinah', date '2027-01-17', 'https://chat.whatsapp.com/DUMMYmd13', null, true),
    (14, 10, 'ziarah', 'Madinah', date '2027-01-24', 'https://chat.whatsapp.com/DUMMYmd14', null, true),
    (15, 8, 'ziarah', 'Madinah', date '2027-01-31', 'https://chat.whatsapp.com/DUMMYmd15', 'https://chat.whatsapp.com/DUMMYfinalmd15', true)
) as v (n, p, service_key, city, schedule_date, discussion_code, final_code, is_published)
join public.service_types st on st.key = v.service_key
on conflict (id) do update set
  provider_id = excluded.provider_id,
  service_type_id = excluded.service_type_id,
  city = excluded.city,
  schedule_date = excluded.schedule_date,
  attendance_deadline = excluded.attendance_deadline,
  option_deadline = excluded.option_deadline,
  payment_deadline = excluded.payment_deadline,
  discussion_group_url = excluded.discussion_group_url,
  final_group_url = excluded.final_group_url,
  is_dummy = excluded.is_dummy,
  is_published = excluded.is_published;

-- Options: each schedule gets options 1 and 2 of its city profile, and every
-- other schedule (odd running number) also option 3. Thaif bus joins cost
-- 40 SAR per person at a minimum of 35; smaller vehicles cost more per
-- person. Ids are 08 block, schedule number * 10 + sort order.

insert into public.schedule_options (
  id, schedule_id, vehicle_format, minimum_participants, capacity, price_sar, sort_order
)
select
  pg_temp.did(8, s.n * 10 + o.sort_order),
  s.id, o.vehicle_format, o.minimum_participants, o.capacity,
  o.price_sar + case when o.minimum_participants >= 35 then 0 else (s.n % 3) * 5 end,
  o.sort_order
from (
  select id, city, (row_number() over (order by id))::integer as n
  from public.schedules
  where id between pg_temp.did(7, 1) and pg_temp.did(7, 9999999999)
) as s
join (
  values
    ('Makkah', 1, 'Hyundai Staria', 3, 6, 250.00),
    ('Makkah', 2, 'Hiace', 6, 10, 180.00),
    ('Makkah', 3, 'Bus 35+ seat', 35, 45, 90.00),
    ('Thaif', 1, 'Bus 35+ seat', 35, 45, 40.00),
    ('Thaif', 2, 'Hiace', 8, 12, 120.00),
    ('Thaif', 3, 'SUV', 2, 4, 200.00),
    ('Madinah', 1, 'Hiace', 6, 10, 60.00),
    ('Madinah', 2, 'Hyundai Staria', 3, 6, 90.00),
    ('Madinah', 3, 'SUV', 2, 4, 110.00)
) as o (city, sort_order, vehicle_format, minimum_participants, capacity, price_sar)
  on o.city = s.city
where o.sort_order <= 2 or s.n % 2 = 1
on conflict (id) do update set
  schedule_id = excluded.schedule_id,
  vehicle_format = excluded.vehicle_format,
  minimum_participants = excluded.minimum_participants,
  capacity = excluded.capacity,
  price_sar = excluded.price_sar,
  sort_order = excluded.sort_order;
