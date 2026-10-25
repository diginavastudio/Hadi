// Uji mesin hitung dengan angka dari brief. Murni hitungan (tanpa Sheet).
import { hitungPinjaman, buatJadwal, statusPinjaman, breakEven } from "../lib/finance.ts";

let gagal = 0;
function cek(nama: string, aktual: unknown, harapan: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harapan);
  if (!ok) gagal++;
  console.log(`${ok ? "OK  " : "GAGAL"} ${nama}: ${JSON.stringify(aktual)}${ok ? "" : " (harapan " + JSON.stringify(harapan) + ")"}`);
}

const s = { pokok: 1000000, admin: 100000, bungaPersen: 30, tenor: 10 };
const h = hitungPinjaman(s);
cek("bunga", h.bunga, 300000);
cek("total kewajiban", h.totalKewajiban, 1300000);
cek("angsuran mingguan", h.angsuran, 130000);
cek("angsuran terakhir", h.angsuranTerakhir, 130000);
cek("dana cair bersih", h.danaCairBersih, 900000);
cek("pendapatan kotor/siklus", h.pendapatanKotor, 400000);
cek("biaya efektif % (1 desimal)", Math.round(h.biayaEfektifPersen * 10) / 10, 44.4);

const j = buatJadwal("2026-01-01", s);
cek("jadwal: jumlah baris", j.length, 10);
cek("jadwal: jatuh tempo ke-1", j[0].jatuhTempo, "2026-01-08");
cek("jadwal: jatuh tempo ke-10", j[9].jatuhTempo, "2026-03-12");
cek("jadwal: total", j.reduce((a, x) => a + x.jumlah, 0), 1300000);

// pembulatan: tenor 3 -> sisa diserap angsuran terakhir, total tetap utuh
const j3 = buatJadwal("2026-01-01", { ...s, tenor: 3 });
cek("tenor 3: total tetap 1.300.000", j3.reduce((a, x) => a + x.jumlah, 0), 1300000);

// status: cair 2026-01-01, hari ini 2026-02-01 (4 angsuran jatuh tempo = 520.000), bayar 260.000
const st = statusPinjaman("2026-01-01", s, 260000, "2026-02-01");
cek("tunggakan", st.tunggakan, 260000);
cek("sisa", st.sisa, 1040000);
cek("hari terlambat (angsuran ke-3 jatuh 2026-01-22)", st.hariTerlambat, 10);
cek("lunas?", st.lunas, false);
cek("lunas jika bayar penuh", statusPinjaman("2026-01-01", s, 1300000, "2026-04-01").lunas, true);

// break-even: dengan asumsi kosong -> tidak dihitung
cek("break-even belum diisi", breakEven(s, { biayaPetugasSiklus: 0, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, null);
// 17.600.000 / 400.000 = 44 ; 23.200.000 / 400.000 = 58 (membalik rentang di brief, tanpa gagal bayar)
cek("break-even 17,6jt tanpa kerugian", breakEven(s, { biayaPetugasSiklus: 17600000, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, 44);
cek("break-even 23,2jt tanpa kerugian", breakEven(s, { biayaPetugasSiklus: 23200000, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, 58);
// gagal bayar 3% dari pokok = 30.000 -> margin 370.000
cek("margin dengan gagal bayar 3%", breakEven(s, { biayaPetugasSiklus: 20000000, gagalBayarPersen: 3, biayaDanaPersen: 0 }).marginPerPeminjam, 370000);

console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji hitungan lolos (murni hitungan, bukan uji Sheet).");
process.exit(gagal ? 1 : 0);
