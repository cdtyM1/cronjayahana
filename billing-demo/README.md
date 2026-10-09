# Billing demo (GitHub Pages + Google Sheets) - tahap 1

Pakai DATA CONTOH dulu. Jangan masukkan data pelanggan asli sebelum keamanannya ditinjau.

## Pasang (urut)
1. Buat Google Sheet baru (kosong). Buka Extensions > Apps Script, hapus isi bawaan, tempel isi `apps-script/Code.gs`, klik Save.
2. Pilih fungsi `setupSheets` lalu Run. Setujui izin akses. Tiga sheet (Pelanggan, Tagihan, Log) terbuat dengan data contoh.
3. Project Settings (ikon roda gigi) > Script properties > Add script property:
   Property: `ADMIN_KEY`, Value: kunci rahasia pilihanmu (panjang, acak). Jangan kirim ke chat atau tulis di repo.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy, salin URL yang berakhiran `/exec`.
5. Buka `config.js`, ganti `GANTI_DENGAN_URL_WEB_APP` dengan URL tadi.
6. GitHub: buat repo baru `billing-demo` (publik). Upload `index.html`, `admin.html`, `cek.js`, `admin.js`, `config.js`, `style.css`.
7. Settings > Pages > Deploy from a branch > main / (root). Tunggu 1-2 menit.

## Coba
- Publik: `index.html`. Nomor `INV-DEMO-001`, 4 digit `0001` (contoh lain: `INV-DEMO-002` / `0002`).
- Admin: `admin.html`, masuk memakai ADMIN_KEY.

## Catatan
- Setiap kali `Code.gs` diubah: Deploy > Manage deployments > Edit > New version > Deploy.
- 10 kali salah kunci akan mengunci login 10 menit (berlaku untuk semua orang).
- Tahap berikutnya: email, WhatsApp, dan jadwal harian lewat Apps Script.
