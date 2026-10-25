import { listAnggota, listPetugas } from "@/lib/db";
import { aksiTambahAnggota } from "../actions";
import { Pesan } from "../pesan";

export default async function Anggota(props: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const searchParams = await props.searchParams;
  const [anggota, petugas] = await Promise.all([listAnggota(), listPetugas()]);
  const namaPetugas = new Map(petugas.map((p) => [p.id, p.nama]));
  return (
    <>
      <h1>Anggota</h1>
      <Pesan sp={searchParams} />
      {petugas.length === 0 && <div className="err">Belum ada petugas. Isi tab Petugas di Google Sheet (kolom id, nama, aktif) dulu.</div>}
      <form action={aksiTambahAnggota} className="f">
        <label>Nama<input name="nama" required /></label>
        <label>No. HP<input name="noHp" /></label>
        <label>Alamat<input name="alamat" /></label>
        <label>Usaha<input name="usaha" /></label>
        <label>Petugas<select name="petugasId" required>{petugas.filter((p) => p.aktif).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
        <button>Tambah</button>
      </form>
      <p className="note">Jangan simpan nomor KTP/NIK di sistem ini. Data pribadi lain seperlunya saja.</p>
      <h2>Daftar ({anggota.length})</h2>
      <table>
        <thead><tr><th>ID</th><th>Nama</th><th>HP</th><th>Usaha</th><th>Petugas</th><th>Daftar</th><th>Status</th></tr></thead>
        <tbody>{anggota.map((a) => (
          <tr key={a.id}><td>{a.id}</td><td>{a.nama}</td><td>{a.noHp}</td><td>{a.usaha}</td><td>{namaPetugas.get(a.petugasId) ?? a.petugasId}</td><td>{a.tglDaftar}</td><td>{a.status}</td></tr>
        ))}</tbody>
      </table>
    </>
  );
}
