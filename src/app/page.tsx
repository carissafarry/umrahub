const benefits = [
  {
    title: "Checklist persiapan pribadi",
    description:
      "Daftar tugas yang disesuaikan dengan tanggal keberangkatan dan kebutuhan Anda.",
  },
  {
    title: "Perkiraan biaya dalam Rupiah",
    description:
      "Hitung perkiraan tiket, visa, hotel, dan biaya lainnya sebelum berangkat.",
  },
  {
    title: "Panduan langkah demi langkah",
    description:
      "Penjelasan jelas untuk setiap tahap, dari mengurus dokumen hingga ibadah di Tanah Suci.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5">
      <header className="border-b border-border py-4">
        <p className="text-xl font-bold tracking-tight">UmrohHub</p>
      </header>

      <main className="flex flex-1 flex-col gap-10 py-10">
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl leading-tight font-bold">
            Persiapan Umrah mandiri, lebih tenang dan terarah
          </h1>
          <p className="text-lg text-muted">
            UmrohHub memandu Anda langkah demi langkah dalam mempersiapkan
            Umrah secara mandiri, tanpa biro perjalanan, dari rencana awal
            hingga hari keberangkatan.
          </p>
          <p lang="ar" dir="rtl" className="font-arabic text-2xl leading-loose">
            لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
          </p>
        </section>

        <section aria-labelledby="manfaat" className="flex flex-col gap-4">
          <h2 id="manfaat" className="text-xl font-semibold">
            Yang Anda dapatkan
          </h2>
          <ul className="flex flex-col gap-3">
            {benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <h3 className="font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-muted">{benefit.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <button
            type="button"
            className="tap-target w-full rounded-xl bg-accent px-6 py-3 text-lg font-semibold text-accent-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Masuk dengan Google
          </button>
          <p className="text-center text-muted">
            Gratis. Simpan kemajuan persiapan Anda di satu tempat.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted">
        © 2026 UmrohHub · Teman persiapan Umrah mandiri
      </footer>
    </div>
  );
}
