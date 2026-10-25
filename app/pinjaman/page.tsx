import Link from "next/link";
import { getParameter, listAnggota, listPinjaman, bayarPerPinjaman } from "@/lib/db";
import { hitungPinjaman, statusPinjaman, hariIniWIB } from "@/lib/finance";
import { rp } from "@/lib/format";
import { aksiCairkan } from "../actions";
import { Pesan } from "../pesan";

export default async function Pinjaman(props: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const searchParams = await props.searchParams;
  const [{ syarat }, anggota, pinjaman, by] = await Promise.all([getParameter(), listAnggota(), listPinjaman(), bayarPerPinjaman()]);
  const nama = new Map(anggota.map((a) => [a.id, a.nama]));
  const hari = hariIniWIB();
  const h = hitungPinjaman(syarat);
  return (
    <>
      <h1>Pinjaman</h1>
      <Pesan sp={searchParams} />
      <form action={aksiCairkan} className="f">
        <label>Anggota<select name="anggotaId" required>{anggota.filter((a) => a.status === "aktif").map((a) => <option key={a.id} value={a.id}>{a.id} · {a.nama}</option>)}</select></label>
        <label>Tanggal cair<input type="date" name="tglCair" defaultValue={hari} required /></label>
        <button>Cairkan</button>
      </form>
      <p className="note">Syarat diambil dari tab Parameter saat ini: pokok {rp(syarat.pokok)}, admin {rp(syarat.admin)}, bunga {syarat.bungaPersen}%, {syarat.tenor} minggu → diterima {rp(h.danaCairBersih)}, angsuran {rp(h.angsuran)}/minggu. Syarat disalin ke baris pinjaman (snapshot) agar perubahan Parameter tidak mengubah pinjaman berjalan.</p>
      <h2>Daftar ({pinjaman.length})</h2>
      <table>
        <thead><tr><th>ID</th><th>Anggota</th><th>Cair</th><th className="r">Total</th><th className="r">Terbayar</th><th className="r">Sisa</th><th className="r">Tunggakan</th><th className="r">Telat (hari)</th><th></th></tr></thead>
        <tbody>{pinjaman.map((p) => {
          const s = statusPinjaman(p.tglCair, p.syarat, by.get(p.id) ?? 0, hari);
          return (
            <tr key={p.id}>
              <td><Link href={`/pinjaman/${p.id}`}>{p.id}</Link></td><td>{nama.get(p.anggotaId) ?? p.anggotaId}</td><td>{p.tglCair}</td>
              <td className="r">{rp(s.totalKewajiban)}</td><td className="r">{rp(s.terbayar)}</td><td className="r">{rp(s.sisa)}</td>
              <td className={"r " + (s.tunggakan ? "bad" : "")}>{rp(s.tunggakan)}</td>
              <td className={"r " + (s.hariTerlambat > 30 ? "bad" : s.hariTerlambat ? "warn" : "")}>{s.hariTerlambat || "-"}</td>
              <td>{s.lunas ? "Lunas" : ""}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </>
  );
}
