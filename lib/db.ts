import { getStore, Row } from "./store";
import { Syarat, Asumsi, hariIniWIB } from "./finance";

export type Anggota = { id: string; nama: string; noHp: string; alamat: string; usaha: string; petugasId: string; tglDaftar: string; status: string };
export type Pinjaman = { id: string; anggotaId: string; petugasId: string; tglCair: string; syarat: Syarat };
export type Pembayaran = { id: string; tgl: string; pinjamanId: string; jumlah: number; catatan: string };
export type Petugas = { id: string; nama: string; aktif: boolean };

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const n = (v: unknown) => Number(v ?? 0);

export async function getParameter() {
  const rows = await getStore().read("Parameter");
  const m = new Map(rows.map((r) => [s(r[0]), r]));
  const need = (k: string) => {
    const r = m.get(k);
    if (!r) throw new Error(`Parameter "${k}" tidak ada di tab Parameter. Jalankan halaman Setup.`);
    return n(r[1]);
  };
  const syarat: Syarat = { pokok: need("pokok"), admin: need("admin"), bungaPersen: need("bunga_persen"), tenor: need("tenor_minggu") };
  const asumsi: Asumsi = {
    biayaPetugasSiklus: need("biaya_petugas_siklus"),
    gagalBayarPersen: need("gagal_bayar_persen"),
    biayaDanaPersen: need("biaya_dana_persen"),
  };
  return { syarat, asumsi, baris: rows.map((r) => ({ key: s(r[0]), value: s(r[1]), ket: s(r[2]) })) };
}

export async function listPetugas(): Promise<Petugas[]> {
  return (await getStore().read("Petugas")).map((r) => ({ id: s(r[0]), nama: s(r[1]), aktif: s(r[2]).toLowerCase() !== "tidak" }));
}

export async function listAnggota(): Promise<Anggota[]> {
  return (await getStore().read("Anggota")).map((r) => ({
    id: s(r[0]), nama: s(r[1]), noHp: s(r[2]), alamat: s(r[3]), usaha: s(r[4]), petugasId: s(r[5]), tglDaftar: s(r[6]), status: s(r[7]),
  }));
}

export async function listPinjaman(): Promise<Pinjaman[]> {
  return (await getStore().read("Pinjaman")).map((r) => ({
    id: s(r[0]), anggotaId: s(r[1]), petugasId: s(r[2]), tglCair: s(r[3]),
    syarat: { pokok: n(r[4]), admin: n(r[5]), bungaPersen: n(r[6]), tenor: n(r[7]) },
  }));
}

export async function listPembayaran(): Promise<Pembayaran[]> {
  return (await getStore().read("Pembayaran")).map((r) => ({ id: s(r[0]), tgl: s(r[1]), pinjamanId: s(r[2]), jumlah: n(r[3]), catatan: s(r[4]) }));
}

function nextId(prefix: string, rows: Row[], pad: number) {
  const max = rows.reduce((a, r) => Math.max(a, Number(s(r[0]).replace(/\D/g, "")) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}

export async function tambahAnggota(d: { nama: string; noHp: string; alamat: string; usaha: string; petugasId: string }) {
  const st = getStore();
  if (!d.nama.trim()) throw new Error("Nama wajib diisi.");
  const id = nextId("AGT", await st.read("Anggota"), 3);
  await st.append("Anggota", [id, d.nama.trim(), d.noHp.trim(), d.alamat.trim(), d.usaha.trim(), d.petugasId, hariIniWIB(), "aktif"]);
  return id;
}

/** Pencairan: syarat diambil dari tab Parameter lalu disalin sebagai snapshot ke baris pinjaman. */
export async function cairkanPinjaman(d: { anggotaId: string; tglCair: string }) {
  const st = getStore();
  const anggota = (await listAnggota()).find((a) => a.id === d.anggotaId);
  if (!anggota) throw new Error("Anggota tidak ditemukan.");
  const aktif = await daftarPinjamanAktifAnggota(d.anggotaId);
  if (aktif) throw new Error(`Anggota masih punya pinjaman berjalan (${aktif}). Lunasi dulu.`);
  const { syarat } = await getParameter();
  const id = nextId("PJM", await st.read("Pinjaman"), 3);
  await st.append("Pinjaman", [id, anggota.id, anggota.petugasId, d.tglCair, syarat.pokok, syarat.admin, syarat.bungaPersen, syarat.tenor]);
  return id;
}

async function daftarPinjamanAktifAnggota(anggotaId: string) {
  const { statusPinjaman } = await import("./finance");
  const pj = (await listPinjaman()).filter((p) => p.anggotaId === anggotaId);
  const by = await bayarPerPinjaman();
  const hari = hariIniWIB();
  const a = pj.find((p) => !statusPinjaman(p.tglCair, p.syarat, by.get(p.id) ?? 0, hari).lunas);
  return a?.id ?? null;
}

export async function bayarPerPinjaman() {
  const m = new Map<string, number>();
  for (const b of await listPembayaran()) m.set(b.pinjamanId, (m.get(b.pinjamanId) ?? 0) + b.jumlah);
  return m;
}

export async function catatPembayaran(d: { pinjamanId: string; tgl: string; jumlah: number; catatan: string }) {
  const st = getStore();
  if (!Number.isFinite(d.jumlah) || d.jumlah === 0) throw new Error("Jumlah harus angka bukan nol (minus = koreksi).");
  const pj = (await listPinjaman()).find((p) => p.id === d.pinjamanId);
  if (!pj) throw new Error("Pinjaman tidak ditemukan.");
  const id = nextId("BYR", await st.read("Pembayaran"), 4);
  await st.append("Pembayaran", [id, d.tgl, d.pinjamanId, d.jumlah, d.catatan.trim()]);
  return id;
}
