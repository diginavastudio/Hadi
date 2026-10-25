// Mesin hitung keuangan. Fungsi murni tanpa konstanta bisnis: semua angka datang dari argumen
// (tab Parameter atau snapshot di tab Pinjaman). Tidak memanggil layanan Google, sehingga bisa diuji di Node.

function hitungPinjaman(s) {
  var bunga = Math.round((s.pokok * s.bungaPersen) / 100);
  var totalKewajiban = s.pokok + bunga;
  var angsuran = Math.floor(totalKewajiban / s.tenor);
  var angsuranTerakhir = totalKewajiban - angsuran * (s.tenor - 1); // menyerap sisa pembulatan
  return {
    bunga: bunga,
    totalKewajiban: totalKewajiban,
    angsuran: angsuran,
    angsuranTerakhir: angsuranTerakhir,
    danaCairBersih: s.pokok - s.admin,
    pendapatanKotor: s.admin + bunga,
    biayaEfektifPersen: ((s.admin + bunga) / (s.pokok - s.admin)) * 100
  };
}

function addDays(tgl, n) {
  var d = new Date(tgl + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function selisihHari(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/** Tanggal hari ini di WIB (UTC+7), format YYYY-MM-DD */
function hariIniWIB(now) {
  return new Date((now === undefined ? Date.now() : now) + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Angsuran ke-1 jatuh tempo 7 hari setelah tanggal cair. */
function buatJadwal(tglCair, s) {
  var h = hitungPinjaman(s);
  var out = [];
  for (var i = 1; i <= s.tenor; i++) {
    out.push({ ke: i, jatuhTempo: addDays(tglCair, 7 * i), jumlah: i === s.tenor ? h.angsuranTerakhir : h.angsuran });
  }
  return out;
}

/** Status diturunkan dari jadwal + total pembayaran; tidak disimpan di mana pun. */
function statusPinjaman(tglCair, s, terbayar, hariIni) {
  var jadwal = buatJadwal(tglCair, s);
  var total = 0, jatuhTempoSampai = 0;
  jadwal.forEach(function (j) {
    total += j.jumlah;
    if (j.jatuhTempo <= hariIni) jatuhTempoSampai += j.jumlah;
  });
  var kum = 0, tertua = null, berikut = null;
  jadwal.forEach(function (j) {
    kum += j.jumlah;
    if (kum > terbayar) {
      if (j.jatuhTempo <= hariIni && !tertua) tertua = j;
      if (j.jatuhTempo > hariIni && !berikut) berikut = j;
    }
  });
  return {
    totalKewajiban: total,
    terbayar: terbayar,
    sisa: Math.max(0, total - terbayar),
    lunas: terbayar >= total,
    tunggakan: Math.max(0, jatuhTempoSampai - terbayar),
    hariTerlambat: tertua ? selisihHari(tertua.jatuhTempo, hariIni) : 0,
    angsuranBerikutnya: berikut
  };
}

/** Margin per peminjam per siklus = pendapatan kotor - kerugian gagal bayar - biaya dana. */
function breakEven(s, a) {
  var h = hitungPinjaman(s);
  var kerugian = (s.pokok * a.gagalBayarPersen) / 100;
  var biayaDana = (s.pokok * a.biayaDanaPersen) / 100;
  var margin = h.pendapatanKotor - kerugian - biayaDana;
  var diisi = a.biayaPetugasSiklus > 0;
  return {
    kerugian: kerugian,
    biayaDana: biayaDana,
    marginPerPeminjam: margin,
    diisi: diisi,
    anggotaBreakEven: diisi && margin > 0 ? Math.ceil(a.biayaPetugasSiklus / margin) : null
  };
}

/** Mengembalikan teks error, atau null bila setoran boleh dicatat. */
function validasiSetoran(totalKewajiban, terbayarSekarang, jumlah) {
  if (typeof jumlah !== 'number' || !isFinite(jumlah) || jumlah === 0 || Math.floor(jumlah) !== jumlah) {
    return 'Jumlah harus bilangan bulat Rupiah bukan nol (minus = koreksi).';
  }
  if (terbayarSekarang + jumlah > totalKewajiban) {
    return 'Melebihi sisa tagihan (sisa ' + (totalKewajiban - terbayarSekarang) + ').';
  }
  if (terbayarSekarang + jumlah < 0) {
    return 'Koreksi melebihi total yang sudah dibayar.';
  }
  return null;
}
