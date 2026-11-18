import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { rupiah } from '../../utils.js';
import { Badge, Pesan } from '../../components/ui.jsx';

const KOSONG = { no_kamar: '', tipe_kamar: '', harga: '', status_kamar: 'kosong' };

export default function KelolaKos() {
  const { id } = useParams();
  const [kos, setKos] = useState(null);
  const [f, setF] = useState(KOSONG);
  const [edit, setEdit] = useState(null);
  const [foto, setFoto] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const muat = () =>
    api.get('/kos/saya').then((d) => {
      const k = d.kos.find((x) => String(x.kos_id) === id);
      if (!k) setErr('Kos tidak ditemukan'); else setKos(k);
    }).catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, [id]);

  const aksi = async (fn, pesan) => {
    setErr(''); setOk('');
    try { await fn(); setOk(pesan); muat(); } catch (e) { setErr(e.message); }
  };

  const simpanKamar = (e) => {
    e.preventDefault();
    aksi(async () => {
      if (edit) await api.put('/kamar/' + edit, f); else await api.post(`/kos/${id}/kamar`, f);
      setF(KOSONG); setEdit(null);
    }, 'Kamar tersimpan');
  };

  if (!kos) return <div className="page"><Pesan>{err}</Pesan>Memuat…</div>;

  return (
    <div className="page">
      <Link to="/owner/kos">← Kos saya</Link>
      <h2>{kos.nama_kos} <Badge s={kos.status_verifikasi} /></h2>
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>

      <h3>Kamar</h3>
      <form className="inline" onSubmit={simpanKamar}>
        <input required placeholder="No. kamar" value={f.no_kamar} onChange={(e) => setF({ ...f, no_kamar: e.target.value })} />
        <input required placeholder="Tipe kamar" value={f.tipe_kamar} onChange={(e) => setF({ ...f, tipe_kamar: e.target.value })} />
        <input required type="number" min="0" placeholder="Harga / bulan" value={f.harga} onChange={(e) => setF({ ...f, harga: e.target.value })} />
        <select value={f.status_kamar} onChange={(e) => setF({ ...f, status_kamar: e.target.value })}>
          <option value="kosong">Kosong</option><option value="dalam_booking">Dalam Booking</option><option value="terisi">Terisi</option>
        </select>
        <button className="btn">{edit ? 'Simpan' : '+ Tambah'}</button>
        {edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setF(KOSONG); }}>Batal</button>}
      </form>
      <table className="tbl">
        <thead><tr><th>No.</th><th>Tipe</th><th>Harga</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {kos.kamar.map((m) => (
            <tr key={m.kamar_id}>
              <td>{m.no_kamar}</td><td>{m.tipe_kamar}</td><td>{rupiah(m.harga)}</td><td><Badge s={m.status_kamar} /></td>
              <td className="aksi">
                <button className="btn sm ghost" onClick={() => { setEdit(m.kamar_id); setF({ no_kamar: m.no_kamar, tipe_kamar: m.tipe_kamar, harga: m.harga, status_kamar: m.status_kamar }); }}>Ubah</button>
                <button className="btn sm danger" onClick={() => confirm('Hapus kamar ini?') && aksi(() => api.del('/kamar/' + m.kamar_id), 'Kamar dihapus')}>Hapus</button>
              </td>
            </tr>
          ))}
          {!kos.kamar.length && <tr><td colSpan="5" className="muted">Belum ada kamar.</td></tr>}
        </tbody>
      </table>

      <h3>Foto Kos</h3>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); aksi(async () => { await api.post(`/kos/${id}/foto`, { path_foto: foto }); setFoto(''); }, 'Foto ditambahkan'); }}>
        <input required type="url" placeholder="URL gambar (https://…)" value={foto} onChange={(e) => setFoto(e.target.value)} style={{ flex: 1 }} />
        <button className="btn">+ Tambah foto</button>
      </form>
      <div className="galeri">
        {kos.foto_kos.map((x) => (
          <div key={x.foto_id} className="fotoitem">
            <img src={x.path_foto} alt="" onError={(e) => (e.target.style.opacity = 0.3)} />
            <button className="btn sm danger" onClick={() => aksi(() => api.del('/foto/' + x.foto_id), 'Foto dihapus')}>Hapus</button>
          </div>
        ))}
        {!kos.foto_kos.length && <p className="muted">Belum ada foto.</p>}
      </div>
    </div>
  );
}
