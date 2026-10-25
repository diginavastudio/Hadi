import { getParameter } from "@/lib/db";

export default async function Parameter() {
  const { baris } = await getParameter();
  return (
    <>
      <h1>Parameter</h1>
      <p className="note">Hanya tampilan. Untuk mengubah, edit langsung tab "Parameter" di Google Sheet; itu satu-satunya sumber kebenaran. Perubahan hanya berlaku untuk pinjaman baru.</p>
      <table>
        <thead><tr><th>Kunci</th><th className="r">Nilai</th><th>Keterangan</th></tr></thead>
        <tbody>{baris.map((b) => (
          <tr key={b.key}><td>{b.key}</td><td className="r">{b.value}</td><td className={b.ket.startsWith("ISI") ? "warn" : ""}>{b.ket}</td></tr>
        ))}</tbody>
      </table>
    </>
  );
}
