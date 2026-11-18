import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pesan } from '../../components/ui.jsx';

export default function Fasilitas() {
  const [list, setList] = useState([]);
  const [nama, setNama] = useState('');
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const muat = () => api.get('/fasilitas').then((d) => setList(d.fasilitas)).catch((e) => setErr(e.message));
  useEffect(() => { muat(); }, []);

  const aksi = async (fn, pesan) => {
    setErr(''); setOk('');
    try { await fn(); setOk(pesan); muat(); } catch (e) { setErr(e.message); }
  };

  const simpan = (e) => {
    e.preventDefault();
    aksi(async () => {
      if (edit) await api.put('/fasilitas/' + edit, { nama_fasilitas: nama });
      else await api.post('/fasilitas', { nama_fasilitas: nama });
      setNama(''); setEdit(null);
    }, 'Fasilitas tersimpan');
  };

  return (
    <div className="page">
      <h2>Master Data Fasilitas</h2>
      <Pesan>{err}</Pesan><Pesan tipe="ok">{ok}</Pesan>
      <form className="inline" onSubmit={simpan}>
        <input required placeholder="Nama fasilitas (WiFi, AC, …)" value={nama} onChange={(e) => setNama(e.target.value)} style={{ flex: 1 }} />
        <button className="btn">{edit ? 'Simpan' : '+ Tambah'}</button>
        {edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setNama(''); }}>Batal</button>}
      </form>
      <table className="tbl">
        <thead><tr><th>#</th><th>Nama fasilitas</th><th></th></tr></thead>
        <tbody>
          {list.map((x, i) => (
            <tr key={x.fasilitas_id}>
              <td>{i + 1}</td><td>{x.nama_fasilitas}</td>
              <td className="aksi">
                <button className="btn sm ghost" onClick={() => { setEdit(x.fasilitas_id); setNama(x.nama_fasilitas); }}>Ubah</button>
                <button className="btn sm danger" onClick={() => confirm(`Hapus "${x.nama_fasilitas}"?`) && aksi(() => api.del('/fasilitas/' + x.fasilitas_id), 'Fasilitas dihapus')}>Hapus</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="3" className="muted">Belum ada fasilitas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
