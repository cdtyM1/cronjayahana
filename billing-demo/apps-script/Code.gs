// Billing API - tempel di Google Apps Script yang terhubung ke spreadsheet.
// ADMIN_KEY diisi di Project Settings > Script properties (JANGAN ditulis di kode ini).
const TZ = 'Asia/Jakarta';
const HDR = {
  Pelanggan: ['id', 'nama', 'wa', 'email', 'dibuat'],
  Tagihan: ['nomor', 'pelanggan_id', 'deskripsi', 'nominal', 'jatuh_tempo', 'status', 'dibayar_pada', 'dibuat'],
  Log: ['waktu', 'aksi', 'detail']
};

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HDR).forEach(function (n) {
    let sh = ss.getSheetByName(n);
    if (sh) return;
    sh = ss.insertSheet(n);
    sh.getRange(1, 1, 1, HDR[n].length).setValues([HDR[n]]).setFontWeight('bold');
    sh.getRange(2, 1, 999, HDR[n].length).setNumberFormat('@'); // semua teks, rumus tidak dieksekusi
    if (n === 'Tagihan') sh.getRange('D2:D1000').setNumberFormat('0');
    sh.setFrozenRows(1);
    if (n === 'Pelanggan') {
      sh.getRange(2, 1, 3, 5).setValues([
        ['c001', 'Budi Santoso (contoh)', '6281200000001', 'budi@example.com', now()],
        ['c002', 'Siti Aminah (contoh)', '6281200000002', 'siti@example.com', now()],
        ['c003', 'Andi Wijaya (contoh)', '6281200000003', 'andi@example.com', now()]]);
    }
    if (n === 'Tagihan') {
      sh.getRange(2, 1, 3, 8).setValues([
        ['INV-DEMO-001', 'c001', 'Langganan bulan ini', 1500000, '2026-10-25', 'belum', '', now()],
        ['INV-DEMO-002', 'c002', 'Biaya layanan', 750000, '2026-10-01', 'belum', '', now()],
        ['INV-DEMO-003', 'c003', 'Paket tahunan', 2250000, '2026-09-20', 'lunas', '2026-09-18 10:00', now()]]);
    }
  });
}

function now() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return out({ ok: true, pesan: 'Billing API aktif' }); }

function doPost(e) {
  try { return out(route(JSON.parse(e.postData.contents))); }
  catch (err) { return out({ ok: false, error: String(err.message || err) }); }
}

function auth(k) {
  const c = CacheService.getScriptCache(), n = Number(c.get('fail') || 0);
  if (n >= 10) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 10 menit.');
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!real) throw new Error('ADMIN_KEY belum diisi di Script properties.');
  if (!k || k !== real) { c.put('fail', String(n + 1), 600); Utilities.sleep(1000); throw new Error('Kunci admin salah.'); }
}

function route(r) {
  if (r.action === 'cek') return cek(r);
  auth(r.key);
  if (r.action === 'login') return { ok: true };
  if (r.action === 'list') return { ok: true, pelanggan: rows('Pelanggan'), tagihan: rows('Tagihan') };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    switch (r.action) {
      case 'addCustomer': return addCustomer(r);
      case 'addInvoice': return addInvoice(r);
      case 'markPaid': return markPaid(r);
      case 'deleteInvoice': return del('Tagihan', r.nomor, 'deleteInvoice');
      case 'deleteCustomer': return deleteCustomer(r);
    }
  } finally { lock.releaseLock(); }
  throw new Error('Aksi tidak dikenal.');
}

function norm(x) { return x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd HH:mm') : x; }
function rows(n) {
  const v = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n).getDataRange().getValues(), h = v.shift();
  return v.filter(function (r) { return r[0] !== ''; }).map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = norm(r[i]); }); return o; });
}
function sheet(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function log(a, d) { sheet('Log').appendRow([now(), a, d]); }
function txt(s, max) { return String(s || '').trim().slice(0, max); }

function addCustomer(r) {
  const nama = txt(r.nama, 120), email = txt(r.email, 150); let wa = String(r.wa || '').replace(/\D/g, '');
  if (wa.charAt(0) === '0') wa = '62' + wa.slice(1);
  if (!nama || wa.length < 10 || wa.length > 15 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Nama, nomor WhatsApp (10-15 digit), dan email yang valid wajib diisi.');
  const id = 'c' + Utilities.getUuid().slice(0, 6);
  sheet('Pelanggan').appendRow([id, nama, wa, email, now()]); log('addCustomer', id);
  return { ok: true };
}

function addInvoice(r) {
  const nom = Math.floor(Number(r.nominal)), d = String(r.jatuh_tempo || '');
  if (!rows('Pelanggan').some(function (p) { return p.id === r.pelanggan_id; })) throw new Error('Pelanggan tidak ditemukan.');
  if (!(nom > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Nominal dan tanggal jatuh tempo wajib diisi dengan benar.');
  const nomor = 'INV-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
  sheet('Tagihan').appendRow([nomor, r.pelanggan_id, txt(r.deskripsi, 255), nom, d, 'belum', '', now()]); log('addInvoice', nomor);
  return { ok: true };
}

function find(n, col, val) {
  const v = sheet(n).getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][col]) === String(val)) return i + 1;
  return 0;
}
function markPaid(r) {
  const i = find('Tagihan', 0, r.nomor); if (!i) throw new Error('Tagihan tidak ditemukan.');
  sheet('Tagihan').getRange(i, 6, 1, 2).setValues([['lunas', now()]]); log('markPaid', r.nomor);
  return { ok: true };
}
function del(n, val, aksi) {
  const i = find(n, 0, val); if (!i) throw new Error('Data tidak ditemukan.');
  sheet(n).deleteRow(i); log(aksi, val); return { ok: true };
}
function deleteCustomer(r) {
  if (rows('Tagihan').some(function (t) { return t.pelanggan_id === r.id; })) throw new Error('Pelanggan masih punya tagihan. Hapus tagihannya dulu.');
  return del('Pelanggan', r.id, 'deleteCustomer');
}

function cek(r) {
  const nomor = txt(r.nomor, 40).toUpperCase(), l4 = String(r.wa4 || '').replace(/\D/g, '');
  const t = rows('Tagihan').filter(function (x) { return String(x.nomor).toUpperCase() === nomor; })[0];
  const p = t && rows('Pelanggan').filter(function (x) { return x.id === t.pelanggan_id; })[0];
  if (!t || !p || l4.length !== 4 || String(p.wa).slice(-4) !== l4) { Utilities.sleep(800); throw new Error('Tagihan tidak ditemukan. Periksa nomor tagihan dan 4 digit terakhir nomor WhatsApp.'); }
  return { ok: true, tagihan: { nomor: t.nomor, nama: p.nama, deskripsi: t.deskripsi, nominal: t.nominal, jatuh_tempo: t.jatuh_tempo, status: t.status } };
}
