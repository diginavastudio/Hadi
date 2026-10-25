// Mesin hitung keuangan. Fungsi murni, tanpa konstanta bisnis di dalamnya:
// semua angka berasal dari argumen (yang datang dari tab Parameter / snapshot Pinjaman).

export type Syarat = { pokok: number; admin: number; bungaPersen: number; tenor: number };

export type Asumsi = {
  biayaPetugasSiklus: number; // Rp per petugas per siklus
  gagalBayarPersen: number; // % dari pokok
  biayaDanaPersen: number; // % dari pokok per siklus
};

export function hitungPinjaman(s: Syarat) {
  const bunga = Math.round((s.pokok * s.bungaPersen) / 100);
  const totalKewajiban = s.pokok + bunga;
  const angsuran = Math.floor(totalKewajiban / s.tenor);
  const angsuranTerakhir = totalKewajiban - angsuran * (s.tenor - 1); // menyerap sisa pembulatan
  return {
    bunga,
    totalKewajiban,
    angsuran,
    angsuranTerakhir,
    danaCairBersih: s.pokok - s.admin,
    pendapatanKotor: s.admin + bunga,
    biayaEfektifPersen: ((s.admin + bunga) / (s.pokok - s.admin)) * 100,
  };
}

export function addDays(tgl: string, n: number): string {
  const d = new Date(tgl + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function selisihHari(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

/** Tanggal hari ini di WIB (UTC+7), format YYYY-MM-DD */
export function hariIniWIB(now: number = Date.now()): string {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export type Jadwal = { ke: number; jatuhTempo: string; jumlah: number };

/** Angsuran ke-1 jatuh tempo 7 hari setelah tanggal cair. */
export function buatJadwal(tglCair: string, s: Syarat): Jadwal[] {
  const h = hitungPinjaman(s);
  return Array.from({ length: s.tenor }, (_, i) => ({
    ke: i + 1,
    jatuhTempo: addDays(tglCair, 7 * (i + 1)),
    jumlah: i + 1 === s.tenor ? h.angsuranTerakhir : h.angsuran,
  }));
}

export type StatusPinjaman = {
  totalKewajiban: number;
  terbayar: number;
  sisa: number;
  lunas: boolean;
  jatuhTempoSampaiHariIni: number; // kumulatif yang seharusnya sudah dibayar
  tunggakan: number;
  hariTerlambat: number; // umur angsuran paling tua yang belum tertutup
  angsuranBerikutnya: Jadwal | null;
};

/** Status diturunkan dari jadwal + total pembayaran; tidak disimpan di mana pun. */
export function statusPinjaman(tglCair: string, s: Syarat, terbayar: number, hariIni: string): StatusPinjaman {
  const jadwal = buatJadwal(tglCair, s);
  const total = jadwal.reduce((a, j) => a + j.jumlah, 0);
  const jatuhTempoSampai = jadwal.filter((j) => j.jatuhTempo <= hariIni).reduce((a, j) => a + j.jumlah, 0);
  const tunggakan = Math.max(0, jatuhTempoSampai - terbayar);
  let kum = 0;
  let tertua: Jadwal | null = null;
  let berikut: Jadwal | null = null;
  for (const j of jadwal) {
    kum += j.jumlah;
    if (kum > terbayar) {
      if (j.jatuhTempo <= hariIni && !tertua) tertua = j;
      if (j.jatuhTempo > hariIni && !berikut) berikut = j;
    }
  }
  return {
    totalKewajiban: total,
    terbayar,
    sisa: Math.max(0, total - terbayar),
    lunas: terbayar >= total,
    jatuhTempoSampaiHariIni: jatuhTempoSampai,
    tunggakan,
    hariTerlambat: tertua ? selisihHari(tertua.jatuhTempo, hariIni) : 0,
    angsuranBerikutnya: berikut,
  };
}

/** Margin per peminjam per siklus = pendapatan kotor - kerugian gagal bayar - biaya dana. */
export function breakEven(s: Syarat, a: Asumsi) {
  const h = hitungPinjaman(s);
  const kerugian = (s.pokok * a.gagalBayarPersen) / 100;
  const biayaDana = (s.pokok * a.biayaDanaPersen) / 100;
  const marginPerPeminjam = h.pendapatanKotor - kerugian - biayaDana;
  const diisi = a.biayaPetugasSiklus > 0;
  return {
    kerugian,
    biayaDana,
    marginPerPeminjam,
    diisi,
    anggotaBreakEven: diisi && marginPerPeminjam > 0 ? Math.ceil(a.biayaPetugasSiklus / marginPerPeminjam) : null,
  };
}
