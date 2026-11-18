import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { rupiah, label, bulanKey, namaBulan, tanggalIndo } from '../../utils.js';
import { Bar } from '../../charts.jsx';
import { ExportBar, Pesan } from '../../components/ui.jsx';

export default function DashboardOwner() {
  const [kos, setKos] = useState([]);
  const [bk, setBk] = useState([]);
  const [err, setErr] = useState('');
  const [tipe, setTipe] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    Promise.all([api.get('/kos/saya'), api.get('/booking/masuk')])
      .then(([a, b]) => { setKos(a.kos); setBk(b.booking); })
      .catch((e) => setErr(e.message));
  }, []);

  const kosF = useMemo(() => kos.filter((k) => !tipe || k.tipe_kos === tipe), [kos, tipe]);
  const bkF = useMemo(
    () => bk.filter((b) => (!tipe || b.kamar?.kos?.tipe_kos === tipe) && (!status || b.status_booking === status)),
    [bk, tipe, status]
  );

  const hitung = (s) => kosF.map((k) => k.kamar.filter((m) => m.status_kamar === s).length);
  const okupansi = {
    labels: kosF.map((k) => k.nama_kos),
    datasets: [
      { label: 'Kosong', data: hitung('kosong'), backgroundColor: '#16a34a' },
      { label: 'Dalam Booking', data: hitung('dalam_booking'), backgroundColor: '#f59e0b' },
      { label: 'Terisi', data: hitung('terisi'), backgroundColor: '#2563eb' },
    ],
  };

  // Estimasi pendapatan: harga kamar dari booking Disetujui + Selesai, per bulan
  const pendapatan = useMemo(() => {
    const m = {};
    bkF.filter((b) => ['disetujui', 'selesai'].includes(b.status_booking)).forEach((b) => {
      const k = bulanKey(b.dibuat_pada);
      m[k] = (m[k] || 0) + (b.kamar?.harga || 0);
    });
    const keys = Object.keys(m).sort();
    return { labels: keys.map(namaBulan), datasets: [{ label: 'Estimasi pendapatan (Rp)', data: keys.map((k) => m[k]), backgroundColor: '#2563eb' }] };
  }, [bkF]);

  const totalKamar = kosF.reduce((a, k) => a + k.kamar.length, 0);
  const terisi = kosF.reduce((a, k) => a + k.kamar.filter((m) => m.status_kamar !== 'kosong').length, 0);
  const total = pendapatan.datasets[0].data.reduce((a, b) => a + b, 0);

  const sumber = {
    kos: () => kosF.map((k) => ({ ID: k.kos_id, 'Nama Kos': k.nama_kos, Alamat: k.alamat, Tipe: label(k.tipe_kos), Status: label(k.status_verifikasi), Latitude: k.latitude, Longitude: k.longitude, 'Jumlah Kamar': k.kamar.length })),
    kamar: () => kosF.flatMap((k) => k.kamar.map((m) => ({ Kos: k.nama_kos, 'No Kamar': m.no_kamar, Tipe: m.tipe_kamar, Harga: m.harga, Status: label(m.status_kamar) }))),
    booking: () => bkF.map((b) => ({ ID: b.booking_id, Kos: b.kamar?.kos?.nama_kos, Kamar: b.kamar?.no_kamar, Pencari: b.users?.nama, 'Tanggal Survey': tanggalIndo(b.tanggal_survey), Harga: b.kamar?.harga, Status: label(b.status_booking) })),
  };

  return (
    <div className="page">
      <div className="bar"><h2>Dashboard Pemilik Kos</h2>
        <div className="row">
          <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
            <option value="">Semua tipe kos</option><option value="putra">Putra</option><option value="putri">Putri</option><option value="campur">Campur</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status booking</option><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option><option value="selesai">Selesai</option>
          </select>
        </div>
      </div>
      <Pesan>{err}</Pesan>
      <div className="stats">
        <div className="card"><small>Jumlah kos</small><b>{kosF.length}</b></div>
        <div className="card"><small>Okupansi kamar</small><b>{totalKamar ? Math.round((terisi / totalKamar) * 100) : 0}%</b></div>
        <div className="card"><small>Booking</small><b>{bkF.length}</b></div>
        <div className="card"><small>Estimasi pendapatan</small><b>{rupiah(total)}</b></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Okupansi Kamar per Kos</h3>
          <Bar data={okupansi} options={{ scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } } }} /></div>
        <div className="card"><h3>Estimasi Pendapatan per Bulan</h3><Bar data={pendapatan} /></div>
      </div>
      <div className="card"><h3>Ekspor & Backup Data</h3><ExportBar sumber={sumber} /></div>
    </div>
  );
}
