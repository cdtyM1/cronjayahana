const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
document.getElementById('t').textContent = APP_NAME;
document.getElementById('f').addEventListener('submit', async e => {
  e.preventDefault();
  const o = document.getElementById('out'), b = e.target.querySelector('button');
  b.disabled = true; o.innerHTML = '<p class="msg">Memeriksa...</p>';
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'cek', nomor: e.target.nomor.value, wa4: e.target.wa4.value }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error);
    const t = j.tagihan, k = t.status === 'lunas' ? ['lunas', 'Lunas'] : (t.jatuh_tempo < today() ? ['telat', 'Terlambat'] : ['belum', 'Belum bayar']);
    o.innerHTML = '<div class="msg"><b>' + esc(t.nomor) + '</b> untuk ' + esc(t.nama) + '<br>' + esc(t.deskripsi) + '<br>Rp ' + Number(t.nominal).toLocaleString('id-ID') + ', jatuh tempo ' + esc(t.jatuh_tempo) + '<br><span class="tag ' + k[0] + '">' + k[1] + '</span></div>';
  } catch (err) { o.innerHTML = '<p class="msg">' + esc(err.message) + '</p>'; }
  b.disabled = false;
});
