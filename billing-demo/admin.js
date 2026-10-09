const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
let KEY = sessionStorage.getItem('k') || '', D = { pelanggan: [], tagihan: [] }, tab = 'ringkasan', MSG = '', IN = false;
$('#brand').textContent = APP_NAME;

async function api(action, p) {
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, key: KEY }, p || {})) });
  const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Gagal'); return j;
}
const tag = t => { const k = t.status === 'lunas' ? ['lunas', 'Lunas'] : (t.jatuh_tempo < today() ? ['telat', 'Terlambat'] : ['belum', 'Belum bayar']); return '<span class="tag ' + k[0] + '">' + k[1] + '</span>'; };
const nama = id => (D.pelanggan.find(p => p.id === id) || {}).nama || '-';
const msg = () => { const m = MSG ? '<p class="msg">' + esc(MSG) + '</p>' : ''; MSG = ''; return m; };

function render() {
  $('#bar').hidden = !IN;
  const a = $('#app');
  if (!IN) { a.innerHTML = '<div class="card narrow"><h1>Login admin</h1>' + msg() + '<form data-a="login"><label for="key">Kunci admin</label><input id="key" name="key" type="password" required autocomplete="current-password"><button class="btn">Masuk</button></form></div>'; return; }
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  a.innerHTML = msg() + ({ ringkasan: ringkasan, pelanggan: pelanggan, tagihan: tagihan }[tab])();
}
function ringkasan() {
  const T = D.tagihan, belum = T.filter(t => t.status !== 'lunas'), telat = belum.filter(t => t.jatuh_tempo < today());
  const next = belum.slice().sort((x, y) => x.jatuh_tempo < y.jatuh_tempo ? -1 : 1).slice(0, 10);
  return '<h1>Ringkasan</h1><div class="stats"><div class="card"><b>' + rp(belum.reduce((s, t) => s + Number(t.nominal), 0)) + '</b><span>Belum dibayar</span></div><div class="card"><b>' + telat.length + '</b><span>Tagihan terlambat</span></div><div class="card"><b>' + (T.length - belum.length) + '</b><span>Tagihan lunas</span></div><div class="card"><b>' + D.pelanggan.length + '</b><span>Pelanggan</span></div></div>' +
    '<h2>10 tagihan terdekat jatuh tempo</h2><div class="wrap"><table class="tbl"><tr><th>Nomor</th><th>Pelanggan</th><th>Nominal</th><th>Jatuh tempo</th><th>Status</th></tr>' +
    (next.map(t => '<tr><td>' + esc(t.nomor) + '</td><td>' + esc(nama(t.pelanggan_id)) + '</td><td>' + rp(t.nominal) + '</td><td>' + esc(t.jatuh_tempo) + '</td><td>' + tag(t) + '</td></tr>').join('') || '<tr><td colspan="5">Belum ada tagihan. Tambahkan pelanggan, lalu buat tagihan pertama.</td></tr>') + '</table></div>';
}
function pelanggan() {
  return '<h1>Pelanggan</h1><form class="card" data-a="addCustomer"><div class="grid2"><div><label>Nama</label><input name="nama" required></div><div><label>Nomor WhatsApp</label><input name="wa" inputmode="tel" placeholder="08123456789" required></div><div><label>Email</label><input type="email" name="email" required></div></div><button class="btn">Simpan pelanggan</button></form>' +
    '<div class="wrap"><table class="tbl"><tr><th>Nama</th><th>WhatsApp</th><th>Email</th><th></th></tr>' +
    (D.pelanggan.map(p => '<tr><td>' + esc(p.nama) + '</td><td>' + esc(p.wa) + '</td><td>' + esc(p.email) + '</td><td><button class="btn sm red" data-act="deleteCustomer" data-id="' + esc(p.id) + '">Hapus</button></td></tr>').join('') || '<tr><td colspan="4">Belum ada pelanggan. Isi formulir di atas.</td></tr>') + '</table></div>';
}
function tagihan() {
  const opt = D.pelanggan.map(p => '<option value="' + esc(p.id) + '">' + esc(p.nama) + '</option>').join('');
  const rows = D.tagihan.slice().sort((x, y) => x.jatuh_tempo < y.jatuh_tempo ? 1 : -1);
  return '<h1>Tagihan</h1><form class="card" data-a="addInvoice"><div class="grid2"><div><label>Pelanggan</label><select name="pelanggan_id" required><option value="">Pilih pelanggan</option>' + opt + '</select></div><div><label>Nominal (Rp)</label><input type="number" name="nominal" min="1" required></div><div><label>Jatuh tempo</label><input type="date" name="jatuh_tempo" required></div><div><label>Keterangan</label><input name="deskripsi" maxlength="255"></div></div><button class="btn">Simpan tagihan</button></form>' +
    '<div class="wrap"><table class="tbl"><tr><th>Nomor</th><th>Pelanggan</th><th>Nominal</th><th>Jatuh tempo</th><th>Status</th><th></th></tr>' +
    (rows.map(t => '<tr><td>' + esc(t.nomor) + '</td><td>' + esc(nama(t.pelanggan_id)) + '</td><td>' + rp(t.nominal) + '</td><td>' + esc(t.jatuh_tempo) + '</td><td>' + tag(t) + '</td><td class="act">' + (t.status !== 'lunas' ? '<button class="btn sm" data-act="markPaid" data-id="' + esc(t.nomor) + '">Tandai lunas</button>' : '') + '<button class="btn sm red" data-act="deleteInvoice" data-id="' + esc(t.nomor) + '">Hapus</button></td></tr>').join('') || '<tr><td colspan="6">Belum ada tagihan. Pilih pelanggan di formulir di atas.</td></tr>') + '</table></div>';
}
async function load() { try { D = await api('list'); IN = true; } catch (e) { IN = false; KEY = ''; sessionStorage.removeItem('k'); MSG = e.message; } render(); }

document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, a = f.dataset.a, d = Object.fromEntries(new FormData(f)), b = f.querySelector('button'); b.disabled = true;
  try {
    if (a === 'login') { KEY = d.key; await api('login'); sessionStorage.setItem('k', KEY); await load(); return; }
    await api(a, d); MSG = 'Tersimpan.'; await load();
  } catch (err) { MSG = err.message; if (a === 'login') KEY = ''; render(); }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; render(); return; }
  const act = b.dataset.act; if (!act) return;
  if (act === 'keluar') { KEY = ''; IN = false; sessionStorage.removeItem('k'); render(); return; }
  if ((act === 'deleteInvoice' || act === 'deleteCustomer') && !confirm('Hapus data ini?')) return;
  try { await api(act, act === 'deleteCustomer' ? { id: b.dataset.id } : { nomor: b.dataset.id }); MSG = 'Selesai.'; await load(); } catch (err) { MSG = err.message; render(); }
});
if (KEY) load(); else render();
