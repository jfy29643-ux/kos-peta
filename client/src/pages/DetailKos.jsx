import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { rupiah, label, tanggalIndo } from '../utils.js';
import MapView from '../components/MapView.jsx';
import { Badge, Stars, Modal, Pesan } from '../components/ui.jsx';

export default function DetailKos() {
  const { id } = useParams();
  const { user } = useAuth();
  const [kos, setKos] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [booking, setBooking] = useState(null);
  const [tgl, setTgl] = useState('');
  const [errB, setErrB] = useState('');

  const muat = () => api.get('/kos/' + id).then((d) => setKos(d.kos)).catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, [id]);

  const markers = useMemo(
    () => (kos ? [{ lat: +kos.latitude, lng: +kos.longitude, warna: kos.kamar.some((m) => m.status_kamar === 'kosong') ? '#16a34a' : '#9ca3af' }] : []),
    [kos]
  );

  const kirim = async (e) => {
    e.preventDefault();
    setErrB('');
    try {
      const d = await api.post('/booking', { kamar_id: booking.kamar_id, tanggal_survey: tgl });
      setOk(d.pesan); setBooking(null); setTgl(''); muat();
    } catch (e2) { setErrB(e2.message); }
  };

  if (err) return <div className="page"><Pesan>{err}</Pesan><Link to="/">← Kembali</Link></div>;
  if (!kos) return <div className="page">Memuat…</div>;

  const hariIni = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <Link to="/">← Kembali ke peta</Link>
      <h2>{kos.nama_kos} <span className="badge b-info">{label(kos.tipe_kos)}</span></h2>
      <p className="muted">{kos.alamat}</p>
      <Stars n={kos.rata_rating} /> <span className="muted">({kos.reviews.length} ulasan)</span>
      <Pesan tipe="ok">{ok}</Pesan>

      <div className="grid2">
        <div>
          <div className="galeri">
            {kos.foto_kos.length
              ? kos.foto_kos.map((f) => <img key={f.foto_id} src={f.path_foto} alt="" onError={(e) => (e.target.style.display = 'none')} />)
              : <div className="noimg">Belum ada foto</div>}
          </div>
          <h3>Fasilitas</h3>
          <div className="chips">{kos.fasilitas.map((x) => <span key={x.fasilitas_id} className="chip on">{x.nama_fasilitas}</span>)}</div>
          {!kos.fasilitas.length && <p className="muted">-</p>}
          <h3>Pemilik</h3>
          <p>{kos.pemilik?.nama} {kos.pemilik?.no_wa && <a href={'https://wa.me/' + kos.pemilik.no_wa.replace(/\D/g, '')} target="_blank" rel="noreferrer">· WhatsApp</a>}</p>
        </div>
        <div><MapView markers={markers} center={[+kos.latitude, +kos.longitude]} zoom={16} height={300} /></div>
      </div>

      <h3>Daftar Kamar</h3>
      <table className="tbl">
        <thead><tr><th>No. Kamar</th><th>Tipe</th><th>Harga / bulan</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {kos.kamar.map((m) => (
            <tr key={m.kamar_id}>
              <td>{m.no_kamar}</td><td>{m.tipe_kamar}</td><td>{rupiah(m.harga)}</td>
              <td><Badge s={m.status_kamar} /></td>
              <td>
                {m.status_kamar === 'kosong' && (
                  user?.role === 'user'
                    ? <button className="btn sm" onClick={() => { setBooking(m); setErrB(''); }}>Booking</button>
                    : !user && <Link className="btn sm ghost" to="/login" state={{ dari: '/kos/' + id }}>Masuk untuk booking</Link>
                )}
              </td>
            </tr>
          ))}
          {!kos.kamar.length && <tr><td colSpan="5" className="muted">Belum ada kamar.</td></tr>}
        </tbody>
      </table>

      <h3>Ulasan</h3>
      {kos.reviews.map((r, i) => (
        <div key={i} className="card ulasan">
          <b>{r.nama}</b> · <Stars n={r.rating} /> <span className="muted">{r.dibuat_pada && tanggalIndo(r.dibuat_pada)}</span>
          <p>{r.komentar || <i className="muted">Tanpa komentar</i>}</p>
        </div>
      ))}
      {!kos.reviews.length && <p className="muted">Belum ada ulasan.</p>}

      {booking && (
        <Modal judul={`Booking kamar ${booking.no_kamar}`} onClose={() => setBooking(null)}>
          <form onSubmit={kirim}>
            <Pesan>{errB}</Pesan>
            <p>{kos.nama_kos} · {booking.tipe_kamar} · {rupiah(booking.harga)}/bulan</p>
            <label>Tanggal survey / kunjungan
              <input type="date" required min={hariIni} value={tgl} onChange={(e) => setTgl(e.target.value)} />
            </label>
            <button className="btn full">Ajukan Booking</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
