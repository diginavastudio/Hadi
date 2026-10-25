import { listAnggota, listPinjaman, listPembayaran, bayarPerPinjaman } from "@/lib/db";
import { statusPinjaman, hariIniWIB } from "@/lib/finance";
import { rp } from "@/lib/format";
import { aksiSetoran } from "../actions";
import { Pesan } from "../pesan";

export default async function Setoran(props: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const searchParams = await props.searchParams;
  const [anggota, pinjaman, pembayaran, by] = await Promise.all([listAnggota(), listPinjaman(), listPembayaran(), bayarPerPinjaman()]);
  const nama = new Map(anggota.map((a) => [a.id, a.nama]));
  const hari = hariIniWIB();
  const aktif = pinjaman
    .map((p) => ({ p, s: statusPinjaman(p.tglCair, p.syarat, by.get(p.id) ?? 0, hari) }))
    .filter((x) => !x.s.lunas);
  return (
    <>
      <h1>Setoran Mingguan</h1>
      <Pesan sp={searchParams} />
      <form action={aksiSetoran} className="f">
        <label>Pinjaman<select name="pinjamanId" required>{aktif.map(({ p, s }) => (
          <option key={p.id} value={p.id}>{p.id} · {nama.get(p.anggotaId)} · sisa {rp(s.sisa)}{s.tunggakan ? ` · nunggak ${rp(s.tunggakan)}` : ""}</option>
        ))}</select></label>
        <label>Tanggal<input type="date" name="tgl" defaultValue={hari} required /></label>
        <label>Jumlah (Rp)<input type="number" name="jumlah" required /></label>
        <label>Catatan<input name="catatan" /></label>
        <button>Catat</button>
      </form>
      <p className="note">Buku setoran hanya bertambah. Salah input? Catat baris baru dengan jumlah minus sebagai koreksi, jangan hapus baris di Sheet.</p>
      <h2>20 setoran terakhir</h2>
      <table>
        <thead><tr><th>ID</th><th>Tanggal</th><th>Pinjaman</th><th>Anggota</th><th className="r">Jumlah</th><th>Catatan</th></tr></thead>
        <tbody>{[...pembayaran].reverse().slice(0, 20).map((b) => {
          const pj = pinjaman.find((p) => p.id === b.pinjamanId);
          return <tr key={b.id}><td>{b.id}</td><td>{b.tgl}</td><td>{b.pinjamanId}</td><td>{pj ? nama.get(pj.anggotaId) : ""}</td><td className="r">{rp(b.jumlah)}</td><td>{b.catatan}</td></tr>;
        })}</tbody>
      </table>
    </>
  );
}
