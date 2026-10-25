# Koperasi Mikro (admin)

Next.js 16 + Google Sheets sebagai database. Satu admin, penagihan per individu.

## Satu sumber kebenaran
- **Parameter produk** (pokok, admin, bunga, tenor, asumsi biaya): hanya di tab `Parameter`. Kode tidak punya konstanta bisnis.
- **Struktur tab dan header**: hanya `lib/schema.ts`.
- **Rumus**: hanya `lib/finance.ts` (diuji: `npm run test:finance`).
- **Status pinjaman, tunggakan, sisa**: tidak disimpan; selalu dihitung dari jadwal + buku `Pembayaran`.
- **Buku Pembayaran** hanya bertambah. Koreksi = baris baru bernilai minus.
- `Pinjaman` menyimpan salinan syarat saat cair, supaya mengubah Parameter tidak mengubah pinjaman berjalan.

## Uji lokal dengan data tiruan
    npm install
    $env:ADMIN_PASSWORD="uji"; $env:SESSION_SECRET="uji-secret-minimal-16"; $env:MOCK="1"; npm run dev
Buka http://localhost:3000. Banner kuning menandakan data tiruan.

## Sambung ke Google Sheet
Lihat `.env.example`. Sheet harus dibagikan (Editor) ke email service account. Setelah login, buka halaman **Setup** untuk membuat tab dan header otomatis.
