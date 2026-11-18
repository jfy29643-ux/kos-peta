import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { haversineKm, rupiah, label } from '../utils.js';
import MapView from '../components/MapView.jsx';
import { Stars, Pesan } from '../components/ui.jsx';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function Peta() {
  const nav = useNavigate();
  const [semua, setSemua] = useState([]);
  const [fasilitas, setFasilitas] = useState([]);
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(true);
  const [f, setF] = useState({ tipe: '', min: '', max: '', fas: [], radius: 0 });
  const [acuan, setAcuan] = useState(null);
  const [modePilih, setModePilih] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/kos'), api.get('/fasilitas')])
      .then(([a, b]) => {
        setSemua(a.kos.map((k) => {
          const kamar = k.kamar || [];
          // Harga diambil dari data kamar (harga per kamar), jadi tidak bergantung pada field harga_mulai dari API
          const hargaList = kamar.map((m) => Number(m.harga)).filter((h) => Number.isFinite(h) && h > 0);
          const hargaApi = k.harga_mulai != null ? Number(k.harga_mulai) : null;
          return {
            ...k,
            kamar,
            fasilitas: k.fasilitas || [],
            latitude: Number(k.latitude),
            longitude: Number(k.longitude),
            hargaList,
            hargaMulai: hargaList.length ? Math.min(...hargaList) : hargaApi,
          };
        }));
        setFasilitas(b.fasilitas);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoad(false));
  }, []);

  const hasil = useMemo(() => {
    let r = semua.map((k) => ({ ...k, jarak: acuan ? haversineKm(acuan.lat, acuan.lng, k.latitude, k.longitude) : null }));
    if (f.tipe) r = r.filter((k) => String(k.tipe_kos ?? '').toLowerCase() === f.tipe);
    if (f.min !== '' || f.max !== '') {
      const min = f.min === '' ? 0 : +f.min;
      const max = f.max === '' ? Infinity : +f.max;
      // Kos lolos jika minimal ada satu kamar yang harganya masuk rentang
      r = r.filter((k) => {
        const hs = k.hargaList.length ? k.hargaList : k.hargaMulai != null ? [k.hargaMulai] : [];
        return hs.some((h) => h >= min && h <= max);
      });
    }
    if (f.fas.length) r = r.filter((k) => f.fas.every((id) => k.fasilitas.some((x) => x.fasilitas_id === id)));
    if (acuan && f.radius > 0) r = r.filter((k) => k.jarak <= f.radius);
    if (acuan) r.sort((a, b) => a.jarak - b.jarak);
    return r;
  }, [semua, f, acuan]);

  const markers = useMemo(
    () => hasil.map((k) => {
      const tersedia = k.kamar.some((m) => m.status_kamar === 'kosong');
      const foto = k.foto_kos?.[0]?.path_foto;
      const html = `
        ${foto ? `<img src="${esc(foto)}" onerror="this.style.display='none'" class="pop-img"/>` : '<div class="pop-noimg">Tanpa foto</div>'}
        <b>${esc(k.nama_kos)}</b>
        <div class="muted">${esc(label(k.tipe_kos))} · ${tersedia ? 'Kamar tersedia' : 'Penuh'}</div>
        <div>Mulai <b>${esc(rupiah(k.hargaMulai))}</b>/bulan</div>
        ${k.jarak != null ? `<div>📍 ${k.jarak.toFixed(2)} km dari titik acuan</div>` : ''}
        <button data-detail class="btn sm" style="margin-top:6px">Lihat detail</button>`;
      return {
        lat: k.latitude, lng: k.longitude,
        warna: tersedia ? '#16a34a' : '#9ca3af',
        popup: { html, onDetail: () => nav('/kos/' + k.kos_id) },
      };
    }),
    [hasil, nav]
  );

  const toggleFas = (id) =>
    setF((p) => ({ ...p, fas: p.fas.includes(id) ? p.fas.filter((x) => x !== id) : [...p.fas, id] }));

  const lokasiSaya = () => {
    if (!navigator.geolocation) return setErr('Browser tidak mendukung Geolocation');
    navigator.geolocation.getCurrentPosition(
      (p) => setAcuan({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr('Gagal mengambil lokasi. Izinkan akses lokasi atau pilih titik langsung di peta.')
    );
  };

  const onMapClick = modePilih ? (lat, lng) => { setAcuan({ lat, lng }); setModePilih(false); } : undefined;

  return (
    <div className="peta">
      <aside className="side">
        <h3>Cari Kos</h3>
        <Pesan>{err}</Pesan>

        <div className="box">
          <b>Titik acuan</b>
          <div className="row">
            <button className={'btn sm' + (modePilih ? ' on' : '')} onClick={() => setModePilih(!modePilih)}>
              {modePilih ? 'Klik di peta…' : '📌 Pilih di peta'}
            </button>
            <button className="btn sm ghost" onClick={lokasiSaya}>📡 Lokasi saya</button>
            {acuan && <button className="btn sm ghost" onClick={() => setAcuan(null)}>Hapus</button>}
          </div>
          <label>Radius: {f.radius > 0 ? f.radius + ' km' : 'semua jarak'}
            <input type="range" min="0" max="20" step="0.5" value={f.radius} disabled={!acuan}
              onChange={(e) => setF({ ...f, radius: +e.target.value })} />
          </label>
          {!acuan && <small className="muted">Tentukan titik acuan (mis. kampus) untuk memakai filter radius.</small>}
        </div>

        <div className="box">
          <label>Tipe kos
            <select value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value })}>
              <option value="">Semua</option><option value="putra">Putra</option>
              <option value="putri">Putri</option><option value="campur">Campur</option>
            </select>
          </label>
          <div className="row2">
            <label>Harga min<input type="number" min="0" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></label>
            <label>Harga maks<input type="number" min="0" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></label>
          </div>
          <b>Fasilitas</b>
          <div className="chips">
            {fasilitas.map((x) => (
              <label key={x.fasilitas_id} className={'chip' + (f.fas.includes(x.fasilitas_id) ? ' on' : '')}>
                <input type="checkbox" checked={f.fas.includes(x.fasilitas_id)} onChange={() => toggleFas(x.fasilitas_id)} />
                {x.nama_fasilitas}
              </label>
            ))}
          </div>
          <button className="btn sm ghost" onClick={() => setF({ tipe: '', min: '', max: '', fas: [], radius: 0 })}>Reset filter</button>
        </div>

        <div className="legend"><span><i style={{ background: '#16a34a' }} /> Tersedia kamar</span><span><i style={{ background: '#9ca3af' }} /> Penuh</span></div>
        <b>{load ? 'Memuat…' : `${hasil.length} kos ditemukan`}</b>
        <div className="list">
          {hasil.map((k) => (
            <div key={k.kos_id} className="kcard" onClick={() => nav('/kos/' + k.kos_id)}>
              <b>{k.nama_kos}</b>
              <div className="muted">{label(k.tipe_kos)} · {k.alamat}</div>
              <div>Mulai <b>{rupiah(k.hargaMulai)}</b>{k.jarak != null && <> · 📍 {k.jarak.toFixed(1)} km</>}</div>
              <Stars n={k.rata_rating} />
            </div>
          ))}
        </div>
      </aside>
      <section className="mapwrap">
        <MapView markers={markers} acuan={acuan} radiusKm={f.radius} onMapClick={onMapClick} height="calc(100vh - 64px)" fit />
      </section>
    </div>
  );
}
