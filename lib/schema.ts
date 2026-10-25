// SATU-SATUNYA definisi struktur Sheet dan nilai awal parameter.
// Nilai awal HANYA dipakai saat setup pertama kali (mengisi tab Parameter).
// Setelah itu, sumber kebenaran adalah tab "Parameter" di Google Sheet.

export const TABS = {
  Parameter: ["key", "value", "keterangan"],
  Petugas: ["id", "nama", "aktif"],
  Anggota: ["id", "nama", "no_hp", "alamat", "usaha", "petugas_id", "tgl_daftar", "status"],
  // Pinjaman menyimpan snapshot syarat saat cair (pokok, admin, bunga, tenor),
  // supaya perubahan Parameter nanti tidak mengubah pinjaman yang sudah berjalan.
  Pinjaman: ["id", "anggota_id", "petugas_id", "tgl_cair", "pokok", "admin", "bunga_persen", "tenor_minggu"],
  // Buku kas pembayaran: hanya ditambah (append-only). Koreksi = baris baru bernilai minus.
  Pembayaran: ["id", "tgl", "pinjaman_id", "jumlah", "catatan"],
} as const;

export type TabName = keyof typeof TABS;

export const DEFAULT_PARAMS: [string, number, string][] = [
  ["pokok", 1000000, "Pokok pinjaman (Rp)"],
  ["admin", 100000, "Potongan administrasi saat pencairan (Rp)"],
  ["bunga_persen", 30, "Bunga flat total per siklus (%)"],
  ["tenor_minggu", 10, "Tenor (minggu)"],
  ["biaya_petugas_siklus", 0, "ISI: biaya 1 petugas per siklus 10 minggu (gaji+transport+lain, Rp)"],
  ["gagal_bayar_persen", 0, "ISI: perkiraan kerugian gagal bayar (% dari pokok)"],
  ["biaya_dana_persen", 0, "ISI: biaya dana per siklus (% dari pokok), 0 jika modal sendiri"],
];
