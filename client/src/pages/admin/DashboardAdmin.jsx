import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { label, wilayah, bulanKey, namaBulan, tanggalIndo } from '../../utils.js';
import { Bar, Line } from '../../charts.jsx';
import { ExportBar, Pesan } from '../../components/ui.jsx';

export default function DashboardAdmin() {
  const [kos, setKos] = useState([]);
  const [bk, setBk] = useState([]);
  const [err, setErr] = useState('');
  const [fw, setFw] = useState('');
  const [ft, setFt] = useState('');
  const [fs, setFs] = useState('');

  useEffect(() => {
    Promise.all([api.get('/admin/kos'), api.get('/admin/booking')])
      .then(([a, b]) => { setKos(a.kos); setBk(b.booking); })
      .catch((e) => setErr(e.message));
  }, []);

  const daftarWilayah = useMemo(() => [...new Set(kos.map((k) => wilayah(k.alamat)))].sort(), [kos]);

  const kosF = useMemo(() => kos.filter((k) => (!fw || wilayah(k.alamat) === fw) && (!ft || k.tipe_kos === ft)), [kos, fw, ft]);
  const bkF = useMemo(
    () => bk.filter((b) => {
      const k = b.kamar?.kos;
      return (!fw || wilayah(k?.alamat) === fw) && (!ft || k?.tipe_kos === ft) && (!fs || b.status_booking === fs);
    }),
    [bk, fw, ft, fs]
  );

  const perWilayah = useMemo(() => {
    const m = {};
    kosF.forEach((k) => { const w = wilayah(k.alamat); m[w] = (m[w] || 0) + 1; });
    const keys = Object.keys(m).sort();
    return { labels: keys, datasets: [{ label: 'Jumlah kos', data: keys.map((k) => m[k]), backgroundColor: '#2563eb' }] };
  }, [kosF]);

  const pertumbuhan = useMemo(() => {
    const m = {};
    bkF.forEach((b) => { const k = bulanKey(b.dibuat_pada); m[k] = (m[k] || 0) + 1; });
    const keys = Object.keys(m).sort();
    return { labels: keys.map(namaBulan), datasets: [{ label: 'Jumlah booking', data: keys.map((k) => m[k]), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.15)', fill: true, tension: 0.3 }] };
  }, [bkF]);

  const sumber = {
    kos: () => kosF.map((k) => ({ ID: k.kos_id, 'Nama Kos': k.nama_kos, Pemilik: k.users?.nama, Alamat: k.alamat, Wilayah: wilayah(k.alamat), Tipe: label(k.tipe_kos), Status: label(k.status_verifikasi) })),
    booking: () => bkF.map((b) => ({ ID: b.booking_id, Kos: b.kamar?.kos?.nama_kos, Kamar: b.kamar?.no_kamar, Pencari: b.users?.nama, 'Tanggal Survey': tanggalIndo(b.tanggal_survey), Status: label(b.status_booking) })),
  };

  return (
    <div className="page">
      <div className="bar"><h2>Dashboard Admin</h2>
        <div className="row">
          <select value={fw} onChange={(e) => setFw(e.target.value)}>
            <option value="">Semua wilayah</option>{daftarWilayah.map((w) => <option key={w}>{w}</option>)}
          </select>
          <select value={ft} onChange={(e) => setFt(e.target.value)}>
            <option value="">Semua tipe kos</option><option value="putra">Putra</option><option value="putri">Putri</option><option value="campur">Campur</option>
          </select>
          <select value={fs} onChange={(e) => setFs(e.target.value)}>
            <option value="">Semua status booking</option><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option><option value="selesai">Selesai</option>
          </select>
        </div>
      </div>
      <Pesan>{err}</Pesan>
      <div className="stats">
        <div className="card"><small>Kos terdaftar</small><b>{kosF.length}</b></div>
        <div className="card"><small>Kos aktif</small><b>{kosF.filter((k) => k.status_verifikasi === 'aktif').length}</b></div>
        <div className="card"><small>Menunggu verifikasi</small><b>{kosF.filter((k) => k.status_verifikasi === 'menunggu').length}</b></div>
        <div className="card"><small>Total booking</small><b>{bkF.length}</b></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Kos Terdaftar per Wilayah</h3><Bar data={perWilayah} options={{ scales: { y: { ticks: { precision: 0 } } } }} /></div>
        <div className="card"><h3>Pertumbuhan Booking</h3><Line data={pertumbuhan} options={{ scales: { y: { ticks: { precision: 0 } } } }} /></div>
      </div>
      <div className="card"><h3>Ekspor & Backup Data</h3><ExportBar sumber={sumber} /></div>
    </div>
  );
}
