import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { label } from '../../utils.js';
import { Badge, Pesan } from '../../components/ui.jsx';

export default function Verifikasi() {
  const [owners, setOwners] = useState([]);
  const [kos, setKos] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const muat = () =>
    Promise.all([api.get('/admin/users?role=owner'), api.get('/admin/kos')])
      .then(([a, b]) => { setOwners(a.users); setKos(b.kos); })
      .catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, []);

  const kirim = async (fn, pesan) => {
    setErr(''); setOk('');
    try { await fn(); setOk(pesan); muat(); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="page">
      <h2>Verifikasi</h2>
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>

      <h3>Akun Pemilik Kos</h3>
      <table className="tbl">
        <thead><tr><th>Nama</th><th>Email</th><th>No. WA</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {owners.map((u) => (
            <tr key={u.user_id}>
              <td>{u.nama}</td><td>{u.email}</td><td>{u.no_wa || '-'}</td><td><Badge s={u.status_verifikasi} /></td>
              <td className="aksi">
                {u.status_verifikasi === 'menunggu'
                  ? <button className="btn sm" onClick={() => kirim(() => api.patch(`/admin/users/${u.user_id}/verifikasi`, { status_verifikasi: 'terverifikasi' }), 'Owner diverifikasi')}>Verifikasi</button>
                  : <button className="btn sm ghost" onClick={() => kirim(() => api.patch(`/admin/users/${u.user_id}/verifikasi`, { status_verifikasi: 'menunggu' }), 'Verifikasi dicabut')}>Cabut</button>}
              </td>
            </tr>
          ))}
          {!owners.length && <tr><td colSpan="5" className="muted">Belum ada pemilik kos.</td></tr>}
        </tbody>
      </table>

      <h3>Data Kos</h3>
      <table className="tbl">
        <thead><tr><th>Kos</th><th>Pemilik</th><th>Tipe</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {kos.map((k) => (
            <tr key={k.kos_id}>
              <td>{k.nama_kos}<br /><small className="muted">{k.alamat}</small></td>
              <td>{k.users?.nama}</td><td>{label(k.tipe_kos)}</td><td><Badge s={k.status_verifikasi} /></td>
              <td className="aksi">
                {k.status_verifikasi !== 'aktif' && <button className="btn sm" onClick={() => kirim(() => api.patch(`/admin/kos/${k.kos_id}/status`, { status: 'aktif' }), 'Kos diaktifkan')}>Aktifkan</button>}
                {k.status_verifikasi !== 'nonaktif' && <button className="btn sm danger" onClick={() => kirim(() => api.patch(`/admin/kos/${k.kos_id}/status`, { status: 'nonaktif' }), 'Kos dinonaktifkan')}>Nonaktifkan</button>}
              </td>
            </tr>
          ))}
          {!kos.length && <tr><td colSpan="5" className="muted">Belum ada kos.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
