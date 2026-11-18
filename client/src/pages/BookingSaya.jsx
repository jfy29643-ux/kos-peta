import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { rupiah, tanggalIndo } from '../utils.js';
import { Badge, Modal, Pesan } from '../components/ui.jsx';
import Bukti from '../components/Bukti.jsx';

export default function BookingSaya() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [bukti, setBukti] = useState(null);
  const [rv, setRv] = useState(null);

  const muat = () => api.get('/booking/saya').then((d) => setList(d.booking)).catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, []);

  const sudahReview = (b) => (Array.isArray(b.review) ? b.review.length > 0 : !!b.review);

  const cetak = async (b) => {
    let pemilik = '-';
    try { pemilik = (await api.get('/kos/' + b.kamar.kos.kos_id)).kos.pemilik?.nama; } catch { /* kos mungkin nonaktif */ }
    setBukti({ b, pemilik });
  };

  const kirimReview = async (e) => {
    e.preventDefault();
    try {
      const d = await api.post('/review', { booking_id: rv.b.booking_id, rating: rv.rating, komentar: rv.komentar });
      setOk(d.pesan); setRv(null); muat();
    } catch (e2) { setErr(e2.message); setRv(null); }
  };

  return (
    <div className="page">
      <h2>Booking Saya</h2>
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>
      <table className="tbl">
        <thead><tr><th>Kos</th><th>Kamar</th><th>Harga</th><th>Tgl survey</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.booking_id}>
              <td><Link to={'/kos/' + b.kamar?.kos?.kos_id}>{b.kamar?.kos?.nama_kos}</Link></td>
              <td>No. {b.kamar?.no_kamar} ({b.kamar?.tipe_kamar})</td>
              <td>{rupiah(b.kamar?.harga)}</td>
              <td>{tanggalIndo(b.tanggal_survey)}</td>
              <td><Badge s={b.status_booking} /></td>
              <td className="aksi">
                {['disetujui', 'selesai'].includes(b.status_booking) && <button className="btn sm ghost" onClick={() => cetak(b)}>Bukti</button>}
                {b.status_booking === 'selesai' && !sudahReview(b) && <button className="btn sm" onClick={() => setRv({ b, rating: 5, komentar: '' })}>Beri ulasan</button>}
                {b.status_booking === 'selesai' && sudahReview(b) && <span className="muted">Sudah diulas</span>}
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="6" className="muted">Belum ada booking.</td></tr>}
        </tbody>
      </table>

      {bukti && (
        <Modal judul="Bukti Konfirmasi Booking" onClose={() => setBukti(null)} cetak lebar={720}>
          <Bukti b={bukti.b} pemilik={bukti.pemilik} pencari={user.nama} />
        </Modal>
      )}
      {rv && (
        <Modal judul={`Ulasan untuk ${rv.b.kamar?.kos?.nama_kos}`} onClose={() => setRv(null)}>
          <form onSubmit={kirimReview}>
            <label>Rating
              <select value={rv.rating} onChange={(e) => setRv({ ...rv, rating: +e.target.value })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
              </select>
            </label>
            <label>Komentar<textarea rows="4" value={rv.komentar} onChange={(e) => setRv({ ...rv, komentar: e.target.value })} /></label>
            <button className="btn full">Kirim ulasan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
