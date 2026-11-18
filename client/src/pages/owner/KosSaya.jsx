import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { label } from '../../utils.js';
import MapView from '../../components/MapView.jsx';
import { Badge, Modal, Pesan } from '../../components/ui.jsx';

function KosForm({ awal, fasilitas, onDone, onClose }) {
  const [f, setF] = useState(
    awal
      ? { nama_kos: awal.nama_kos, alamat: awal.alamat, tipe_kos: awal.tipe_kos, latitude: +awal.latitude, longitude: +awal.longitude, fasilitas_ids: awal.fasilitas.map((x) => x.fasilitas_id) }
      : { nama_kos: '', alamat: '', tipe_kos: 'putra', latitude: '', longitude: '', fasilitas_ids: [] }
  );
  const [err, setErr] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (id) => set('fasilitas_ids', f.fasilitas_ids.includes(id) ? f.fasilitas_ids.filter((x) => x !== id) : [...f.fasilitas_ids, id]);
  const markers = useMemo(() => (f.latitude === '' ? [] : [{ lat: +f.latitude, lng: +f.longitude, warna: '#2563eb' }]), [f.latitude, f.longitude]);

  const simpan = async (e) => {
    e.preventDefault();
    if (f.latitude === '') return setErr('Klik pada peta untuk menentukan lokasi kos');
    try {
      if (awal) await api.put('/kos/' + awal.kos_id, f); else await api.post('/kos', f);
      onDone();
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <Modal judul={awal ? 'Ubah Kos' : 'Tambah Kos'} onClose={onClose} lebar={760}>
      <form onSubmit={simpan}>
        <Pesan>{err}</Pesan>
        <div className="row2">
          <label>Nama kos<input required value={f.nama_kos} onChange={(e) => set('nama_kos', e.target.value)} /></label>
          <label>Tipe kos
            <select value={f.tipe_kos} onChange={(e) => set('tipe_kos', e.target.value)}>
              <option value="putra">Putra</option><option value="putri">Putri</option><option value="campur">Campur</option>
            </select>
          </label>
        </div>
        <label>Alamat lengkap<textarea required rows="2" value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></label>
        <small className="muted">Tips: akhiri alamat dengan nama wilayah, mis. "Jl. Melati No. 5, Cikarang Utara" (dipakai untuk laporan per wilayah).</small>
        <b>Titik lokasi (klik pada peta)</b>
        <MapView markers={markers} onMapClick={(la, lo) => setF((p) => ({ ...p, latitude: +la.toFixed(7), longitude: +lo.toFixed(7) }))}
          center={f.latitude === '' ? [-6.3, 107.15] : [+f.latitude, +f.longitude]} zoom={f.latitude === '' ? 11 : 16} height={280} />
        <div className="row2">
          <label>Latitude<input readOnly value={f.latitude} placeholder="otomatis dari peta" /></label>
          <label>Longitude<input readOnly value={f.longitude} placeholder="otomatis dari peta" /></label>
        </div>
        <b>Fasilitas</b>
        <div className="chips">
          {fasilitas.map((x) => (
            <label key={x.fasilitas_id} className={'chip' + (f.fasilitas_ids.includes(x.fasilitas_id) ? ' on' : '')}>
              <input type="checkbox" checked={f.fasilitas_ids.includes(x.fasilitas_id)} onChange={() => toggle(x.fasilitas_id)} />
              {x.nama_fasilitas}
            </label>
          ))}
        </div>
        <button className="btn full">Simpan</button>
      </form>
    </Modal>
  );
}

export default function KosSaya() {
  const { user, refresh } = useAuth();
  const [list, setList] = useState([]);
  const [fasilitas, setFasilitas] = useState([]);
  const [form, setForm] = useState(null); // null | 'baru' | kos
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const muat = () => api.get('/kos/saya').then((d) => setList(d.kos)).catch((e) => setErr(e.message));
  useEffect(() => { refresh(); muat(); api.get('/fasilitas').then((d) => setFasilitas(d.fasilitas)); }, []);

  const terverif = user.status_verifikasi === 'terverifikasi';

  const hapus = async (k) => {
    if (!confirm(`Hapus kos "${k.nama_kos}"?`)) return;
    try { await api.del('/kos/' + k.kos_id); setOk('Kos dihapus'); muat(); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="page">
      <div className="bar"><h2>Kos Saya</h2>
        <button className="btn" disabled={!terverif} onClick={() => setForm('baru')}>+ Tambah Kos</button>
      </div>
      {!terverif && <Pesan tipe="warn">Akun Anda belum diverifikasi Admin, sehingga belum dapat menambahkan kos.</Pesan>}
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>
      <div className="cards">
        {list.map((k) => (
          <div key={k.kos_id} className="card">
            <div className="bar"><b>{k.nama_kos}</b><Badge s={k.status_verifikasi} /></div>
            <p className="muted">{label(k.tipe_kos)} · {k.alamat}</p>
            <p>{k.kamar.length} kamar · {k.kamar.filter((m) => m.status_kamar === 'kosong').length} kosong</p>
            {k.status_verifikasi === 'menunggu' && <small className="muted">Menunggu persetujuan Admin sebelum tampil di peta.</small>}
            <div className="aksi">
              <Link className="btn sm" to={'/owner/kos/' + k.kos_id}>Kamar & Foto</Link>
              <button className="btn sm ghost" onClick={() => setForm(k)}>Ubah</button>
              <button className="btn sm danger" onClick={() => hapus(k)}>Hapus</button>
            </div>
          </div>
        ))}
        {!list.length && <p className="muted">Belum ada kos.</p>}
      </div>
      {form && (
        <KosForm awal={form === 'baru' ? null : form} fasilitas={fasilitas} onClose={() => setForm(null)}
          onDone={() => { setForm(null); setOk('Data kos tersimpan'); muat(); }} />
      )}
    </div>
  );
}
