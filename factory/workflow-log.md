# Workflow log

Satu baris per perubahan pada cara kerja AI (agen, model, prompt, loop, skrip, aturan hemat konteks). Tujuannya melacak apa yang sudah dicoba, mengapa, dan apakah hasilnya lebih akurat dan lebih murah dalam token.

Aturan: kode `workflow-NNN` (penghitung sendiri dari 001), branch `factory/workflow-NNN`, commit `workflow-NNN <pesan>`, PR sendiri. Setiap tugas menambah satu baris di bawah dan mengisi kolom "Hasil terukur" setelah ada data.

## Perubahan

| Kode | Tanggal | Perubahan | Alasan | Dugaan efek | Hasil terukur |
|---|---|---|---|---|---|
| workflow-001 | 2026-11-02 | Model agen `spec-writer` dari opus ke sonnet (`.claude/agents/spec-writer.md`). Sambil menunggu PR ini merge, sesi orkestrator mengatur model per pemanggilan. | Spek dibuat dari kode dan tiket yang sudah jelas. Menulis spek tidak perlu model termahal. | Token dan biaya per spek turun. Risiko: spek kurang teliti (misalnya melewatkan temuan kontras warna seperti yang ditemukan opus di fe-066). | Belum ada. Lihat baseline dan cara mengukur di bawah. |

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

## Ide berikutnya (belum dikerjakan)

- Sesi orkestrator baru dengan konteks kecil untuk setiap gelombang, bukan satu sesi panjang.
- Skrip pengendali loop (langkah mekanis di luar model, agen dipanggil lewat `claude -p` dalam konteks kecil).
- Model lebih murah untuk reviewer-security di tiket yang tidak menyentuh data atau autentikasi.
