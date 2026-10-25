// Uji lokal (Node). Memuat Finance.gs dan Code.gs apa adanya ke satu konteks, dengan layanan Google DITIRUKAN di memori.
// Ini uji dengan DATA TIRUAN: bukan bukti bahwa Sheet/Apps Script sungguhan berfungsi.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let gagal = 0, lolos = 0;
function cek(nama, aktual, harapan) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harapan);
  ok ? lolos++ : gagal++;
  console.log((ok ? 'OK    ' : 'GAGAL ') + nama + ': ' + JSON.stringify(aktual) + (ok ? '' : ' (harapan ' + JSON.stringify(harapan) + ')'));
}
function melempar(nama, fn, potongan) {
  try { fn(); gagal++; console.log('GAGAL ' + nama + ': tidak melempar error'); }
  catch (e) { const ok = e.message.indexOf(potongan) >= 0; ok ? lolos++ : gagal++; console.log((ok ? 'OK    ' : 'GAGAL ') + nama + ': "' + e.message + '"'); }
}

// ---- Sheet tiruan (header sama dengan Sheet asli) ----
const data = {
  Parameter: [['key', 'value', 'keterangan'], ['pokok', 1000000, ''], ['admin', 100000, ''], ['bunga_persen', 30, ''], ['tenor_minggu', 10, ''],
    ['biaya_petugas_siklus', 20000000, ''], ['gagal_bayar_persen', 3, ''], ['biaya_dana_persen', 0, '']],
  Petugas: [['id', 'nama', 'aktif']],
  Anggota: [['id', 'nama', 'no_hp', 'alamat', 'usaha', 'petugas_id', 'tgl_daftar', 'status']],
  Pinjaman: [['id', 'anggota_id', 'petugas_id', 'tgl_cair', 'pokok', 'admin', 'bunga_persen', 'tenor_minggu']],
  Pembayaran: [['id', 'tgl', 'pinjaman_id', 'jumlah', 'catatan']]
};
const formats = {}; // formats[tab][barisIndex] = array format
function sheet(nama) {
  const rows = data[nama];
  if (!rows) return null;
  formats[nama] = formats[nama] || [];
  return {
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getLastRow: () => rows.length,
    getRange: (r, c, nr, nc) => ({
      setNumberFormats: f => { formats[nama][r - 1] = f[0]; },
      setValues: v => { rows[r - 1] = v[0].slice(); }
    })
  };
}
let kunciDiambil = 0, kunciDilepas = 0;
const ctx = {
  console, Date, Math, JSON, Number, String, isNaN, isFinite, Array, Object, RegExp, Error,
  SpreadsheetApp: { openById: () => ({ getSheetByName: sheet }) },
  LockService: { getScriptLock: () => ({ waitLock: () => { kunciDiambil++; }, releaseLock: () => { kunciDilepas++; } }) },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
  HtmlService: { createHtmlOutputFromFile: () => ({ setTitle() { return this; }, addMetaTag() { return this; } }) }
};
vm.createContext(ctx);
const dir = path.join(__dirname, '..');
// const/let di skrip vm tidak menjadi properti konteks; var dan function ya. Code.gs memakai var/function.
vm.runInContext(fs.readFileSync(path.join(dir, 'Finance.gs'), 'utf8'), ctx, { filename: 'Finance.gs' });
vm.runInContext(fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
const C = ctx;

// ---- 1. Rumus (angka dari brief) ----
const s = { pokok: 1000000, admin: 100000, bungaPersen: 30, tenor: 10 };
const h = C.hitungPinjaman(s);
cek('bunga', h.bunga, 300000);
cek('total kewajiban', h.totalKewajiban, 1300000);
cek('angsuran mingguan', h.angsuran, 130000);
cek('dana cair bersih', h.danaCairBersih, 900000);
cek('pendapatan kotor/siklus', h.pendapatanKotor, 400000);
cek('biaya efektif % (1 desimal)', Math.round(h.biayaEfektifPersen * 10) / 10, 44.4);
const j = C.buatJadwal('2026-01-01', s);
cek('jadwal ke-1', j[0].jatuhTempo, '2026-01-08');
cek('jadwal ke-10', j[9].jatuhTempo, '2026-03-12');
cek('tenor 3: total utuh', C.buatJadwal('2026-01-01', { pokok: 1000000, admin: 100000, bungaPersen: 30, tenor: 3 }).reduce((a, x) => a + x.jumlah, 0), 1300000);
const st = C.statusPinjaman('2026-01-01', s, 260000, '2026-02-01');
cek('tunggakan', st.tunggakan, 260000);
cek('hari terlambat', st.hariTerlambat, 10);
cek('lunas jika bayar penuh', C.statusPinjaman('2026-01-01', s, 1300000, '2026-04-01').lunas, true);
cek('break-even 17,6jt tanpa kerugian', C.breakEven(s, { biayaPetugasSiklus: 17600000, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, 44);
cek('break-even 23,2jt tanpa kerugian', C.breakEven(s, { biayaPetugasSiklus: 23200000, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, 58);
cek('break-even belum diisi', C.breakEven(s, { biayaPetugasSiklus: 0, gagalBayarPersen: 0, biayaDanaPersen: 0 }).anggotaBreakEven, null);
cek('validasi: lunas persis diterima', C.validasiSetoran(1300000, 1170000, 130000), null);
cek('validasi: lebih dari sisa ditolak', C.validasiSetoran(1300000, 1170000, 130001) !== null, true);
cek('validasi: nol ditolak', C.validasiSetoran(1300000, 0, 0) !== null, true);
cek('validasi: pecahan ditolak', C.validasiSetoran(1300000, 0, 1000.5) !== null, true);
cek('validasi: koreksi melebihi terbayar ditolak', C.validasiSetoran(1300000, 100000, -100001) !== null, true);

// ---- 2. Aplikasi terhadap Sheet tiruan ----
melempar('tambah anggota tanpa petugas ditolak', () => C.aksiTambahAnggota({ nama: 'A', petugasId: 'PTG-001' }), 'Petugas tidak ditemukan');
data.Petugas.push(['PTG-001', 'Petugas Uji (tiruan)', 'ya']);
melempar('nama kosong ditolak', () => C.aksiTambahAnggota({ nama: '  ', petugasId: 'PTG-001' }), 'Nama wajib');
cek('anggota 1', C.aksiTambahAnggota({ nama: 'Ibu Uji (tiruan)', petugasId: 'PTG-001', noHp: '08', alamat: 'x', usaha: 'warung' }).id, 'AGT-001');
cek('anggota 2 (teks mirip rumus)', C.aksiTambahAnggota({ nama: '=HYPERLINK("http://x")', petugasId: 'PTG-001' }).id, 'AGT-002');
cek('teks "=..." disimpan sebagai teks (format @)', formats.Anggota[2][1], '@');
cek('kolom teks diformat @ (id)', formats.Anggota[1][0], '@');

melempar('cairkan tanggal salah ditolak', () => C.aksiCairkan({ anggotaId: 'AGT-001', tglCair: '25/10/2026' }), 'YYYY-MM-DD');
melempar('cairkan anggota tak ada ditolak', () => C.aksiCairkan({ anggotaId: 'AGT-999', tglCair: '2026-10-01' }), 'tidak ditemukan');
cek('cairkan AGT-001', C.aksiCairkan({ anggotaId: 'AGT-001', tglCair: '2026-10-01' }).id, 'PJM-001');
cek('snapshot syarat tersalin ke baris pinjaman', data.Pinjaman[1].slice(4), [1000000, 100000, 30, 10]);
melempar('cairkan lagi saat berjalan ditolak', () => C.aksiCairkan({ anggotaId: 'AGT-001', tglCair: '2026-10-02' }), 'masih punya pinjaman berjalan');

melempar('setoran ke pinjaman tak ada ditolak', () => C.aksiSetoran({ pinjamanId: 'PJM-999', tgl: '2026-10-08', jumlah: 130000 }), 'tidak ditemukan');
melempar('setoran jumlah 0 ditolak', () => C.aksiSetoran({ pinjamanId: 'PJM-001', tgl: '2026-10-08', jumlah: 0 }), 'bilangan bulat');
melempar('setoran melebihi sisa ditolak', () => C.aksiSetoran({ pinjamanId: 'PJM-001', tgl: '2026-10-08', jumlah: 1300001 }), 'Melebihi sisa');
cek('setoran 1', C.aksiSetoran({ pinjamanId: 'PJM-001', tgl: '2026-10-08', jumlah: 130000, catatan: 'minggu 1' }).id, 'BYR-0001');
cek('koreksi minus', C.aksiSetoran({ pinjamanId: 'PJM-001', tgl: '2026-10-08', jumlah: -130000, catatan: 'salah input' }).id, 'BYR-0002');
melempar('koreksi melebihi terbayar ditolak', () => C.aksiSetoran({ pinjamanId: 'PJM-001', tgl: '2026-10-08', jumlah: -1 }), 'Koreksi melebihi');
cek('kolom jumlah (angka) tidak diformat teks', formats.Pembayaran[1], ['@', '@', '@', 'General', '@']);
cek('jumlah tersimpan sebagai angka, bukan teks', [typeof data.Pembayaran[1][3], typeof data.Pembayaran[2][3]], ['number', 'number']);

const state = C.getState();
cek('dashboard: anggota', state.dashboard.jumlahAnggota, 2);
cek('dashboard: pinjaman berjalan', state.dashboard.pinjamanBerjalan, 1);
cek('dashboard: kas keluar = pokok - admin', state.dashboard.kasKeluar, 900000);
cek('dashboard: kas masuk (setoran + koreksi) = 0', state.dashboard.kasMasuk, 0);
cek('break-even dari Parameter: 20jt / 370rb = 55', state.breakEven.anggotaBreakEven, 55);
const d = C.getDetail('PJM-001');
cek('detail: jadwal 10 baris', d.jadwal.length, 10);
cek('detail: riwayat 2 baris', d.riwayat.length, 2);
melempar('detail tak ada ditolak', () => C.getDetail('PJM-999'), 'tidak ditemukan');

data.Parameter[2][1] = 'abc';
melempar('parameter rusak ditolak jelas', () => C.getState(), 'bukan angka');
data.Parameter[2][1] = 100000;
data.Anggota[0][1] = 'nama_baru';
melempar('header berubah: kode menolak, tidak menulis ngawur', () => C.aksiTambahAnggota({ nama: 'Z', petugasId: 'PTG-001' }), 'tidak dikenali');

cek('setiap aksi memakai kunci dan melepasnya', kunciDiambil === kunciDilepas && kunciDiambil > 0, true);
console.log('\n' + lolos + ' lolos, ' + gagal + ' gagal (DATA TIRUAN, bukan uji Sheet sungguhan)');
process.exit(gagal ? 1 : 0);
