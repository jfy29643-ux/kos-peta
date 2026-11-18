import { terbilang, label } from '../utils.js';

// Bukti Konfirmasi Booking Survey / Sewa Kos (sesuai lampiran soal)
export default function Bukti({ b, pemilik, pencari }) {
  const t = new Date(b.dibuat_pada || Date.now());
  const hari = t.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
  const bulan = t.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();
  const T = (n) => terbilang(n).toUpperCase();

  return (
    <div className="bukti">
      <div className="no">KOS/BKG-01/BOOK{String(b.booking_id).padStart(5, '0')}</div>
      <h2>BUKTI KONFIRMASI BOOKING<br />SURVEY / SEWA KOS</h2>
      <p>
        Pada hari ini <b>{hari}</b> tanggal <b>{T(t.getDate())}</b> bulan <b>{bulan}</b> tahun <b>{T(t.getFullYear())}</b>,
        telah dilakukan konfirmasi booking antara pihak <b>PEMILIK KOS</b> dengan <b>PENCARI KOS</b> melalui
        Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta. Adapun rincian booking sebagai berikut :
      </p>
      <table>
        <thead><tr><th>No.</th><th>Nama Kos</th><th>Kamar</th><th>Status</th></tr></thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td>{b.kamar?.kos?.nama_kos}</td>
            <td>No. {b.kamar?.no_kamar} - Tipe {b.kamar?.tipe_kamar}</td>
            <td>{label(b.status_booking)}</td>
          </tr>
        </tbody>
      </table>
      <p>Demikian bukti konfirmasi booking ini dibuat dengan sebenar-benarnya dan berlaku sebagai bukti sah persetujuan kedua belah pihak.</p>
      <div className="ttd">
        <div>Pemilik Kos<br /><br /><br /><br />Nama : {pemilik || '-'}</div>
        <div>Pencari Kos<br /><br /><br /><br />Nama : {pencari || '-'}</div>
      </div>
      <button className="btn no-print" onClick={() => window.print()}>🖨 Cetak / Simpan PDF</button>
    </div>
  );
}
