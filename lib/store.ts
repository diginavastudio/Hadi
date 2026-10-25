import { TABS, TabName, DEFAULT_PARAMS } from "./schema";
import { hariIniWIB, addDays } from "./finance";

// Lapisan penyimpanan tunggal. Dua backend:
//  - Google Sheets (produksi): aktif bila GOOGLE_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON ada.
//  - Memori (DATA TIRUAN, hanya untuk uji): aktif bila MOCK=1.
// Bila keduanya tidak ada, aplikasi menolak jalan (tidak diam-diam memakai data tiruan).

export type Row = (string | number)[];

export interface Store {
  readonly nama: string;
  read(tab: TabName): Promise<Row[]>; // tanpa header
  append(tab: TabName, row: Row): Promise<void>;
  ensureSchema(): Promise<string>;
}

class SheetsStore implements Store {
  nama = "Google Sheets";
  private async api() {
    const { google } = await import("googleapis");
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  }
  private id = process.env.GOOGLE_SHEET_ID!;

  async read(tab: TabName): Promise<Row[]> {
    const s = await this.api();
    const r = await s.spreadsheets.values.get({
      spreadsheetId: this.id,
      range: `${tab}!A2:Z`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return (r.data.values as Row[]) ?? [];
  }

  async append(tab: TabName, row: Row) {
    const s = await this.api();
    await s.spreadsheets.values.append({
      spreadsheetId: this.id,
      range: `${tab}!A1`,
      valueInputOption: "RAW", // RAW: teks berawalan "=" tidak dieksekusi sebagai rumus
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }

  async ensureSchema(): Promise<string> {
    const s = await this.api();
    const meta = await s.spreadsheets.get({ spreadsheetId: this.id });
    const ada = new Set((meta.data.sheets ?? []).map((x) => x.properties?.title));
    const log: string[] = [];
    const tambah = (Object.keys(TABS) as TabName[]).filter((t) => !ada.has(t));
    if (tambah.length) {
      await s.spreadsheets.batchUpdate({
        spreadsheetId: this.id,
        requestBody: { requests: tambah.map((t) => ({ addSheet: { properties: { title: t } } })) },
      });
      log.push(`Tab dibuat: ${tambah.join(", ")}`);
    }
    for (const t of Object.keys(TABS) as TabName[]) {
      const h = await s.spreadsheets.values.get({ spreadsheetId: this.id, range: `${t}!A1:Z1` });
      if (!h.data.values?.length) {
        await s.spreadsheets.values.update({
          spreadsheetId: this.id,
          range: `${t}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [[...TABS[t]]] },
        });
        log.push(`Header ditulis: ${t}`);
      }
    }
    const p = await this.read("Parameter");
    if (!p.length) {
      await s.spreadsheets.values.append({
        spreadsheetId: this.id,
        range: "Parameter!A1",
        valueInputOption: "RAW",
        requestBody: { values: DEFAULT_PARAMS },
      });
      log.push("Parameter awal diisi (cek dan lengkapi baris bertanda ISI)");
    }
    return log.length ? log.join("; ") : "Struktur sudah lengkap, tidak ada yang diubah.";
  }
}

// ---- DATA TIRUAN (hanya MOCK=1) ----
const mem: Record<string, Row[]> = {};
class MockStore implements Store {
  nama = "MEMORI (DATA TIRUAN)";
  async read(tab: TabName) {
    if (!mem[tab]) mem[tab] = seed(tab);
    return mem[tab].map((r) => [...r]);
  }
  async append(tab: TabName, row: Row) {
    if (!mem[tab]) mem[tab] = seed(tab);
    mem[tab].push(row);
  }
  async ensureSchema() {
    return "Mode tiruan: tidak ada yang perlu disiapkan.";
  }
}

function seed(tab: TabName): Row[] {
  const hari = hariIniWIB();
  switch (tab) {
    case "Parameter":
      return DEFAULT_PARAMS.map((p) => [...p]).map((r) =>
        r[0] === "biaya_petugas_siklus" ? [r[0], 20000000, r[2]] : r[0] === "gagal_bayar_persen" ? [r[0], 3, r[2]] : r
      );
    case "Petugas":
      return [["PTG-001", "Petugas Contoh", "ya"]];
    case "Anggota":
      return [
        ["AGT-001", "Ibu Sari (tiruan)", "0800000001", "Alamat tiruan", "Warung", "PTG-001", addDays(hari, -80), "aktif"],
        ["AGT-002", "Bu Wati (tiruan)", "0800000002", "Alamat tiruan", "Jahit", "PTG-001", addDays(hari, -50), "aktif"],
        ["AGT-003", "Pak Joko (tiruan)", "0800000003", "Alamat tiruan", "Gorengan", "PTG-001", addDays(hari, -20), "aktif"],
      ];
    case "Pinjaman":
      return [
        ["PJM-001", "AGT-001", "PTG-001", addDays(hari, -75), 1000000, 100000, 30, 10],
        ["PJM-002", "AGT-002", "PTG-001", addDays(hari, -45), 1000000, 100000, 30, 10],
        ["PJM-003", "AGT-003", "PTG-001", addDays(hari, -15), 1000000, 100000, 30, 10],
      ];
    case "Pembayaran":
      return [
        ["BYR-0001", addDays(hari, -68), "PJM-001", 130000, ""],
        ["BYR-0002", addDays(hari, -61), "PJM-001", 130000, ""],
        ["BYR-0003", addDays(hari, -38), "PJM-002", 130000, ""],
        ["BYR-0004", addDays(hari, -8), "PJM-003", 130000, ""],
      ];
  }
}

export function getStore(): Store {
  if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return new SheetsStore();
  if (process.env.MOCK === "1") return new MockStore();
  throw new Error(
    "Penyimpanan belum dikonfigurasi: isi GOOGLE_SHEET_ID dan GOOGLE_SERVICE_ACCOUNT_JSON (atau MOCK=1 hanya untuk uji dengan data tiruan)."
  );
}
