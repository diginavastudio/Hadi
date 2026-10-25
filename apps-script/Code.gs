// Aplikasi admin koperasi mikro. Data hanya di Google Sheet (SHEET_ID).
// Nama kolom dibaca dari baris header Sheet; Sheet adalah satu-satunya sumber struktur dan parameter.
// Rumus ada di Finance.gs. Web app dideploy "hanya saya" sehingga pengaksesnya adalah akun pemilik.

var SHEET_ID = '1IAvF5AeaKR_mimb9xt7U2nZNi07TGAtSEvMijKzERD8';
var TZ = 'Asia/Jakarta';
var TGL_RE = /^\d{4}-\d{2}-\d{2}$/;
// Kunci parameter yang dipakai kode (nilainya hanya di tab Parameter).
var KUNCI_PARAMETER = ['pokok', 'admin', 'bunga_persen', 'tenor_minggu', 'biaya_petugas_siklus', 'gagal_bayar_persen', 'biaya_dana_persen'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Koperasi Mikro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- akses Sheet ----------

function norm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return v;
}

function tabel_(nama) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" tidak ada di Sheet.');
  var v = sh.getDataRange().getValues();
  var header = v[0].map(String);
  var rows = v.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
    .map(function (r) {
      var o = {};
      header.forEach(function (h, i) { o[h] = norm_(r[i]); });
      return o;
    });
  return { sh: sh, header: header, rows: rows };
}

/** Menambah satu baris. Teks disimpan sebagai teks (format '@') supaya "=..." tidak dieksekusi sebagai rumus. */
function tambah_(nama, obj) {
  var t = tabel_(nama);
  var baris = t.header.map(function (h) {
    if (!(h in obj)) throw new Error('Kolom "' + h + '" di tab ' + nama + ' tidak dikenali kode. Cek header Sheet.');
    return obj[h];
  });
  var r = t.sh.getLastRow() + 1;
  var rng = t.sh.getRange(r, 1, 1, baris.length);
  rng.setNumberFormats([baris.map(function (v) { return typeof v === 'string' ? '@' : 'General'; })]);
  rng.setValues([baris]);
}

function idBerikut_(prefix, rows, pad) {
  var max = 0;
  rows.forEach(function (r) {
    var n = Number(String(r.id).replace(/\D/g, '')) || 0;
    if (n > max) max = n;
  });
  var s = String(max + 1);
  while (s.length < pad) s = '0' + s;
  return prefix + '-' + s;
}

function denganKunci_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function bacaParameter_() {
  var map = {};
  tabel_('Parameter').rows.forEach(function (r) { map[String(r.key)] = r.value; });
  KUNCI_PARAMETER.forEach(function (k) {
    if (!(k in map) || map[k] === '' || isNaN(Number(map[k]))) {
      throw new Error('Parameter "' + k + '" tidak ada atau bukan angka di tab Parameter.');
    }
  });
  return {
    syarat: { pokok: Number(map.pokok), admin: Number(map.admin), bungaPersen: Number(map.bunga_persen), tenor: Number(map.tenor_minggu) },
    asumsi: {
      biayaPetugasSiklus: Number(map.biaya_petugas_siklus),
      gagalBayarPersen: Number(map.gagal_bayar_persen),
      biayaDanaPersen: Number(map.biaya_dana_persen)
    }
  };
}

function pinjamanDariRow_(r) {
  return {
    id: String(r.id), anggotaId: String(r.anggota_id), petugasId: String(r.petugas_id), tglCair: String(r.tgl_cair),
    syarat: { pokok: Number(r.pokok), admin: Number(r.admin), bungaPersen: Number(r.bunga_persen), tenor: Number(r.tenor_minggu) }
  };
}

function bayarPerPinjaman_(pembayaran) {
  var m = {};
  pembayaran.forEach(function (b) { m[b.pinjaman_id] = (m[b.pinjaman_id] || 0) + Number(b.jumlah); });
  return m;
}

// ---------- data untuk tampilan ----------

function getState() {
  var p = bacaParameter_();
  var anggota = tabel_('Anggota').rows;
  var petugas = tabel_('Petugas').rows;
  var pembayaran = tabel_('Pembayaran').rows;
  var pinjaman = tabel_('Pinjaman').rows.map(pinjamanDariRow_);
  var by = bayarPerPinjaman_(pembayaran);
  var hari = hariIniWIB();
  var namaAnggota = {};
  anggota.forEach(function (a) { namaAnggota[a.id] = a.nama; });

  var daftar = pinjaman.map(function (x) {
    var s = statusPinjaman(x.tglCair, x.syarat, by[x.id] || 0, hari);
    return { id: x.id, anggotaId: x.anggotaId, anggota: namaAnggota[x.anggotaId] || x.anggotaId, tglCair: x.tglCair, status: s };
  });
  var aktif = daftar.filter(function (d) { return !d.status.lunas; });

  var kasKeluar = 0, kasMasuk = 0, adminDiterima = 0, bungaTerealisasi = 0;
  pinjaman.forEach(function (x) {
    kasKeluar += x.syarat.pokok - x.syarat.admin;
    adminDiterima += x.syarat.admin;
    var bunga = hitungPinjaman(x.syarat).bunga;
    bungaTerealisasi += Math.min(bunga, Math.max(0, (by[x.id] || 0) - x.syarat.pokok));
  });
  pembayaran.forEach(function (b) { kasMasuk += Number(b.jumlah); });

  var h = hitungPinjaman(p.syarat);
  var be = breakEven(p.syarat, p.asumsi);
  var parameter = tabel_('Parameter').rows.map(function (r) { return { key: r.key, value: r.value, keterangan: r.keterangan }; });

  return {
    hari: hari,
    parameter: parameter,
    syarat: p.syarat,
    ekonomi: h,
    breakEven: be,
    petugas: petugas.map(function (r) { return { id: r.id, nama: r.nama, aktif: String(r.aktif).toLowerCase() !== 'tidak' }; }),
    anggota: anggota.map(function (a) {
      return { id: a.id, nama: a.nama, noHp: a.no_hp, usaha: a.usaha, petugasId: a.petugas_id, tglDaftar: a.tgl_daftar, status: a.status };
    }),
    pinjaman: daftar,
    setoranTerakhir: pembayaran.slice(-20).reverse().map(function (b) {
      return { id: b.id, tgl: b.tgl, pinjamanId: b.pinjaman_id, jumlah: Number(b.jumlah), catatan: b.catatan };
    }),
    dashboard: {
      jumlahAnggota: anggota.length,
      pinjamanBerjalan: aktif.length,
      outstanding: aktif.reduce(function (a, d) { return a + d.status.sisa; }, 0),
      tunggakan: daftar.reduce(function (a, d) { return a + d.status.tunggakan; }, 0),
      telatLebih30: aktif.filter(function (d) { return d.status.hariTerlambat > 30; }).length,
      kasKeluar: kasKeluar,
      kasMasuk: kasMasuk,
      adminDiterima: adminDiterima,
      bungaTerealisasi: bungaTerealisasi
    }
  };
}

function getDetail(id) {
  var row = tabel_('Pinjaman').rows.filter(function (r) { return String(r.id) === String(id); })[0];
  if (!row) throw new Error('Pinjaman tidak ditemukan.');
  var x = pinjamanDariRow_(row);
  var bayar = tabel_('Pembayaran').rows.filter(function (b) { return String(b.pinjaman_id) === x.id; });
  var terbayar = bayar.reduce(function (a, b) { return a + Number(b.jumlah); }, 0);
  var hari = hariIniWIB();
  var kum = 0;
  var jadwal = buatJadwal(x.tglCair, x.syarat).map(function (j) {
    kum += j.jumlah;
    var tertutup = terbayar >= kum;
    var telat = !tertutup && j.jatuhTempo <= hari;
    return { ke: j.ke, jatuhTempo: j.jatuhTempo, jumlah: j.jumlah, status: tertutup ? 'Tertutup' : telat ? 'Menunggak' : 'Belum jatuh tempo' };
  });
  var anggota = tabel_('Anggota').rows.filter(function (a) { return String(a.id) === x.anggotaId; })[0];
  return {
    id: x.id,
    anggota: anggota ? anggota.nama : x.anggotaId,
    status: statusPinjaman(x.tglCair, x.syarat, terbayar, hari),
    jadwal: jadwal,
    riwayat: bayar.map(function (b) { return { id: b.id, tgl: b.tgl, jumlah: Number(b.jumlah), catatan: b.catatan }; })
  };
}

// ---------- aksi (semua melalui kunci supaya ID tidak kembar) ----------

function teks_(v, nama, wajib, maks) {
  var s = v === undefined || v === null ? '' : String(v).trim();
  if (wajib && !s) throw new Error(nama + ' wajib diisi.');
  if (s.length > (maks || 200)) throw new Error(nama + ' terlalu panjang.');
  return s;
}

function aksiTambahAnggota(d) {
  return denganKunci_(function () {
    var nama = teks_(d.nama, 'Nama', true);
    var petugasId = teks_(d.petugasId, 'Petugas', true);
    var petugas = tabel_('Petugas').rows.filter(function (r) { return String(r.id) === petugasId && String(r.aktif).toLowerCase() !== 'tidak'; });
    if (!petugas.length) throw new Error('Petugas tidak ditemukan atau tidak aktif. Isi tab Petugas dulu.');
    var t = tabel_('Anggota');
    var id = idBerikut_('AGT', t.rows, 3);
    tambah_('Anggota', {
      id: id, nama: nama, no_hp: teks_(d.noHp, 'No. HP', false, 30), alamat: teks_(d.alamat, 'Alamat', false, 300),
      usaha: teks_(d.usaha, 'Usaha', false, 100), petugas_id: petugasId, tgl_daftar: hariIniWIB(), status: 'aktif'
    });
    return { ok: true, id: id };
  });
}

function aksiCairkan(d) {
  return denganKunci_(function () {
    var anggotaId = teks_(d.anggotaId, 'Anggota', true);
    var tglCair = teks_(d.tglCair, 'Tanggal cair', true);
    if (!TGL_RE.test(tglCair)) throw new Error('Format tanggal harus YYYY-MM-DD.');
    var anggota = tabel_('Anggota').rows.filter(function (a) { return String(a.id) === anggotaId; })[0];
    if (!anggota) throw new Error('Anggota tidak ditemukan.');
    if (String(anggota.status) !== 'aktif') throw new Error('Anggota tidak berstatus aktif.');
    var pinjamanRows = tabel_('Pinjaman').rows;
    var by = bayarPerPinjaman_(tabel_('Pembayaran').rows);
    var hari = hariIniWIB();
    var berjalan = pinjamanRows.map(pinjamanDariRow_).filter(function (x) {
      return x.anggotaId === anggotaId && !statusPinjaman(x.tglCair, x.syarat, by[x.id] || 0, hari).lunas;
    })[0];
    if (berjalan) throw new Error('Anggota masih punya pinjaman berjalan (' + berjalan.id + '). Lunasi dulu.');
    var s = bacaParameter_().syarat; // disalin sebagai snapshot ke baris pinjaman
    var id = idBerikut_('PJM', pinjamanRows, 3);
    tambah_('Pinjaman', {
      id: id, anggota_id: anggotaId, petugas_id: anggota.petugas_id, tgl_cair: tglCair,
      pokok: s.pokok, admin: s.admin, bunga_persen: s.bungaPersen, tenor_minggu: s.tenor
    });
    return { ok: true, id: id };
  });
}

function aksiSetoran(d) {
  return denganKunci_(function () {
    var pinjamanId = teks_(d.pinjamanId, 'Pinjaman', true);
    var tgl = teks_(d.tgl, 'Tanggal', true);
    if (!TGL_RE.test(tgl)) throw new Error('Format tanggal harus YYYY-MM-DD.');
    var jumlah = Number(d.jumlah);
    var row = tabel_('Pinjaman').rows.filter(function (r) { return String(r.id) === pinjamanId; })[0];
    if (!row) throw new Error('Pinjaman tidak ditemukan.');
    var x = pinjamanDariRow_(row);
    var pembayaran = tabel_('Pembayaran').rows;
    var terbayar = bayarPerPinjaman_(pembayaran)[x.id] || 0;
    var total = hitungPinjaman(x.syarat).totalKewajiban;
    var err = validasiSetoran(total, terbayar, jumlah);
    if (err) throw new Error(err);
    var id = idBerikut_('BYR', pembayaran, 4);
    tambah_('Pembayaran', { id: id, tgl: tgl, pinjaman_id: pinjamanId, jumlah: jumlah, catatan: teks_(d.catatan, 'Catatan', false, 300) });
    return { ok: true, id: id };
  });
}
