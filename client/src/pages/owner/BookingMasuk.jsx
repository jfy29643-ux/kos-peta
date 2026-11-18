import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { rupiah, tanggalIndo } from '../../utils.js';
import { Badge, Modal, Pesan } from '../../components/ui.jsx';
import Bukti from '../../components/Bukti.jsx';

export default function BookingMasuk() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [bukti, setBukti] = useState(null);

  const muat = () => api.get('/booking/masuk' + (status ? '?status=' + status : '')).then((d) => setList(d.booking)).catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, [status]);

  const ubah = async (b, s) => {
    setErr(''); setOk('');
    try { const d = await api.patch(`/booking/${b.booking_id}/status`, { status: s }); setOk(d.pesan); muat(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="page">
      <div className="bar"><h2>Booking Masuk</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option>
          <option value="ditolak">Ditolak</option><option value="selesai">Selesai</option>
        </select>
      </div>
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>
      <table className="tbl">
        <thead><tr><th>Pencari</th><th>Kos / Kamar</th><th>Harga</th><th>Tgl survey</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.users?.nama}<br /><small className="muted">{b.users?.no_wa || b.users?.email}</small></td>
              <td>{b.kamar?.kos?.nama_kos}<br /><small>No. {b.kamar?.no_kamar} · {b.kamar?.tipe_kamar}</small></td>
              <td>{rupiah(b.kamar?.harga)}</td>
              <td>{tanggalIndo(b.tanggal_survey)}</td>
              <td><Badge s={b.status_booking} /></td>
              <td className="aksi">
                {b.status_booking === 'menunggu' && (<>
                  <button className="btn sm" onClick={() => ubah(b, 'disetujui')}>Setujui</button>
                  <button className="btn sm danger" onClick={() => ubah(b, 'ditolak')}>Tolak</button>
                </>)}
                {b.status_booking === 'disetujui' && (<>
                  <button className="btn sm" onClick={() => ubah(b, 'selesai')}>Tandai selesai</button>
                  <button className="btn sm danger" onClick={() => ubah(b, 'ditolak')}>Batalkan</button>
                </>)}
                {['disetujui', 'selesai'].includes(b.status_booking) && <button className="btn sm ghost" onClick={() => setBukti(b)}>Bukti</button>}
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="6" className="muted">Tidak ada booking.</td></tr>}
        </tbody>
      </table>
      {bukti && (
        <Modal judul="Bukti Konfirmasi Booking" onClose={() => setBukti(null)} cetak lebar={720}>
          <Bukti b={bukti} pemilik={user.nama} pencari={bukti.users?.nama} />
        </Modal>
      )}
    </div>
  );
}
