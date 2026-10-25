import { notFound } from "next/navigation";
import { listAnggota, listPinjaman, listPembayaran } from "@/lib/db";
import { buatJadwal, statusPinjaman, hariIniWIB } from "@/lib/finance";
import { rp } from "@/lib/format";

export default async function Detail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [pinjaman, anggota, pembayaran] = await Promise.all([listPinjaman(), listAnggota(), listPembayaran()]);
  const p = pinjaman.find((x) => x.id === params.id);
  if (!p) notFound();
  const bayar = pembayaran.filter((b) => b.pinjamanId === p.id);
  const terbayar = bayar.reduce((a, b) => a + b.jumlah, 0);
  const hari = hariIniWIB();
  const s = statusPinjaman(p.tglCair, p.syarat, terbayar, hari);
  const jadwal = buatJadwal(p.tglCair, p.syarat);
  let kum = 0;
  return (
    <>
      <h1>{p.id} · {anggota.find((a) => a.id === p.anggotaId)?.nama}</h1>
      <div className="grid">
        <div className="card"><div className="k">Total kewajiban</div><div className="v">{rp(s.totalKewajiban)}</div></div>
        <div className="card"><div className="k">Terbayar</div><div className="v">{rp(s.terbayar)}</div></div>
        <div className="card"><div className="k">Sisa</div><div className="v">{rp(s.sisa)}</div></div>
        <div className="card"><div className="k">Tunggakan</div><div className={"v " + (s.tunggakan ? "bad" : "")}>{rp(s.tunggakan)}</div></div>
      </div>
      <h2>Jadwal angsuran</h2>
      <table>
        <thead><tr><th>Ke</th><th>Jatuh tempo</th><th className="r">Jumlah</th><th>Status</th></tr></thead>
        <tbody>{jadwal.map((j) => {
          kum += j.jumlah;
          const lunas = terbayar >= kum;
          const telat = !lunas && j.jatuhTempo <= hari;
          return <tr key={j.ke}><td>{j.ke}</td><td>{j.jatuhTempo}</td><td className="r">{rp(j.jumlah)}</td><td className={telat ? "bad" : ""}>{lunas ? "Tertutup" : telat ? "Menunggak" : "Belum jatuh tempo"}</td></tr>;
        })}</tbody>
      </table>
      <h2>Riwayat setoran</h2>
      <table>
        <thead><tr><th>ID</th><th>Tanggal</th><th className="r">Jumlah</th><th>Catatan</th></tr></thead>
        <tbody>{bayar.map((b) => <tr key={b.id}><td>{b.id}</td><td>{b.tgl}</td><td className="r">{rp(b.jumlah)}</td><td>{b.catatan}</td></tr>)}</tbody>
      </table>
    </>
  );
}
