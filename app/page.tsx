import { getParameter, listAnggota, listPinjaman, listPembayaran, bayarPerPinjaman } from "@/lib/db";
import { hitungPinjaman, statusPinjaman, breakEven, hariIniWIB } from "@/lib/finance";
import { rp, pct } from "@/lib/format";

export default async function Dashboard() {
  const [{ syarat, asumsi }, anggota, pinjaman, pembayaran, by] = await Promise.all([
    getParameter(), listAnggota(), listPinjaman(), listPembayaran(), bayarPerPinjaman(),
  ]);
  const hari = hariIniWIB();
  const h = hitungPinjaman(syarat);
  const be = breakEven(syarat, asumsi);

  const st = pinjaman.map((p) => ({ p, s: statusPinjaman(p.tglCair, p.syarat, by.get(p.id) ?? 0, hari) }));
  const aktif = st.filter((x) => !x.s.lunas);
  const outstanding = aktif.reduce((a, x) => a + x.s.sisa, 0);
  const tunggakan = st.reduce((a, x) => a + x.s.tunggakan, 0);
  const macet = aktif.filter((x) => x.s.hariTerlambat > 30);

  // Arus kas nyata: keluar = dana cair bersih (pokok - admin), masuk = seluruh pembayaran
  const kasKeluar = pinjaman.reduce((a, p) => a + (p.syarat.pokok - p.syarat.admin), 0);
  const kasMasuk = pembayaran.reduce((a, b) => a + b.jumlah, 0);
  // Pendapatan terealisasi (konservatif): admin diterima saat cair + bunga hanya setelah pokok kembali
  const adminDiterima = pinjaman.reduce((a, p) => a + p.syarat.admin, 0);
  const bungaTerealisasi = pinjaman.reduce((a, p) => {
    const terbayar = by.get(p.id) ?? 0;
    const bunga = hitungPinjaman(p.syarat).bunga;
    return a + Math.min(bunga, Math.max(0, terbayar - p.syarat.pokok));
  }, 0);

  return (
    <>
      <h1>Dashboard <span className="note">per {hari} WIB</span></h1>
      <div className="grid">
        <div className="card"><div className="k">Anggota</div><div className="v">{anggota.length}</div></div>
        <div className="card"><div className="k">Pinjaman berjalan</div><div className="v">{aktif.length}</div></div>
        <div className="card"><div className="k">Sisa tagihan (outstanding)</div><div className="v">{rp(outstanding)}</div></div>
        <div className="card"><div className="k">Tunggakan jatuh tempo</div><div className={"v " + (tunggakan > 0 ? "bad" : "")}>{rp(tunggakan)}</div></div>
        <div className="card"><div className="k">Telat &gt; 30 hari</div><div className={"v " + (macet.length ? "bad" : "")}>{macet.length} pinjaman</div></div>
      </div>

      <h2>Arus kas nyata (dari buku pembayaran)</h2>
      <div className="grid">
        <div className="card"><div className="k">Kas keluar (pokok − admin)</div><div className="v">{rp(kasKeluar)}</div></div>
        <div className="card"><div className="k">Kas masuk (setoran)</div><div className="v">{rp(kasMasuk)}</div></div>
        <div className="card"><div className="k">Selisih kas</div><div className="v">{rp(kasMasuk - kasKeluar)}</div></div>
        <div className="card"><div className="k">Pendapatan terealisasi</div><div className="v">{rp(adminDiterima + bungaTerealisasi)}</div>
          <div className="note">Admin {rp(adminDiterima)} + bunga {rp(bungaTerealisasi)}. Bunga diakui setelah pokok kembali (konservatif; ini kebijakan hitung, bukan standar akuntansi).</div></div>
      </div>

      <h2>Ekonomi produk (dari tab Parameter)</h2>
      <table>
        <tbody>
          <tr><td>Bunga flat</td><td className="r">{rp(h.bunga)}</td></tr>
          <tr><td>Total kewajiban peminjam</td><td className="r">{rp(h.totalKewajiban)}</td></tr>
          <tr><td>Angsuran mingguan</td><td className="r">{rp(h.angsuran)}</td></tr>
          <tr><td>Dana cair bersih</td><td className="r">{rp(h.danaCairBersih)}</td></tr>
          <tr><td>Pendapatan kotor per peminjam per siklus</td><td className="r">{rp(h.pendapatanKotor)}</td></tr>
          <tr><td>Biaya efektif untuk peminjam ({syarat.tenor} minggu, dari dana diterima)</td><td className="r">{pct(h.biayaEfektifPersen)}</td></tr>
          <tr><td>Kerugian gagal bayar diasumsikan</td><td className="r">{rp(be.kerugian)}</td></tr>
          <tr><td>Biaya dana</td><td className="r">{rp(be.biayaDana)}</td></tr>
          <tr><td><b>Margin per peminjam</b></td><td className="r"><b>{rp(be.marginPerPeminjam)}</b></td></tr>
          <tr><td><b>Break-even anggota per petugas per siklus</b></td>
            <td className="r"><b>{be.anggotaBreakEven ?? "belum dihitung: isi biaya_petugas_siklus di tab Parameter"}</b></td></tr>
        </tbody>
      </table>
      <p className="note">Break-even = biaya petugas per siklus ÷ margin per peminjam. Angka 44–58 dari brief awal tidak terverifikasi; di sini dihitung dari asumsi yang kamu isi.</p>
    </>
  );
}
