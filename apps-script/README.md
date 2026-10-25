# Koperasi Mikro: versi Apps Script (semua di Google)

Web app admin yang berjalan di akun Google pemilik Sheet. Data hanya di Google Sheet `SHEET_ID` (lihat `Code.gs`).

## Berkas
- `Finance.gs`: semua rumus (fungsi murni, tanpa layanan Google).
- `Code.gs`: akses Sheet, validasi, aksi. Nama kolom dibaca dari baris header Sheet.
- `Index.html`: tampilan.
- `appsscript.json`: manifest. Web app dijalankan sebagai pemilik, akses "hanya saya".
- `test/test.js`: uji lokal dengan Sheet tiruan di memori (`node test/test.js`).

## Satu sumber kebenaran
- Parameter produk dan asumsi: tab `Parameter` di Sheet.
- Struktur kolom: baris header tiap tab di Sheet. Kode menolak menulis bila header tidak dikenali.
- Status pinjaman, tunggakan, sisa: dihitung dari jadwal dan buku `Pembayaran`, tidak disimpan.
- Buku `Pembayaran` hanya bertambah; koreksi = baris minus.
- Pinjaman menyimpan salinan syarat saat cair.
- Penulisan memakai kunci skrip supaya ID tidak kembar.
