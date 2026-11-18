import { supabase } from '../config/supabase.js';
import { hariIniWIB, selesaikanBookingKedaluwarsa } from '../utils/bookingOtomatis.js';

const SELECT_BOOKING = `
  booking_id, kamar_id, user_id, tanggal_survey, status_booking, dibuat_pada,
  review ( review_id ),
  kamar ( no_kamar, tipe_kamar, harga, status_kamar, kos_id, kos ( kos_id, nama_kos, alamat, tipe_kos, owner_id ) )
`;

const STATUS_BOOKING = ['disetujui', 'ditolak', 'selesai'];

// Perpindahan status yang diizinkan
const TRANSISI = {
  menunggu: ['disetujui', 'ditolak'],
  disetujui: ['selesai', 'ditolak'],
};

const FORMAT_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/booking  (user)  body: { kamar_id, tanggal_survey: "2026-11-05" }
export const buatBooking = async (req, res) => {
  try {
    const { kamar_id, tanggal_survey } = req.body ?? {};

    if (!kamar_id || !tanggal_survey) {
      return res.status(400).json({ pesan: 'kamar_id dan tanggal_survey wajib diisi' });
    }
    if (!FORMAT_TANGGAL.test(tanggal_survey) || Number.isNaN(new Date(tanggal_survey).getTime())) {
      return res.status(400).json({ pesan: 'tanggal_survey tidak valid (format YYYY-MM-DD)' });
    }
    if (tanggal_survey < hariIniWIB()) {
      return res.status(400).json({ pesan: 'tanggal_survey tidak boleh di masa lalu' });
    }

    const { data: kamar, error: errKamar } = await supabase
      .from('kamar')
      .select('kamar_id, status_kamar, kos ( status_verifikasi )')
      .eq('kamar_id', kamar_id)
      .maybeSingle();

    if (errKamar) return res.status(500).json({ pesan: errKamar.message });
    if (!kamar) return res.status(404).json({ pesan: 'Kamar tidak ditemukan' });
    if (kamar.kos?.status_verifikasi !== 'aktif') {
      return res.status(409).json({ pesan: 'Kos ini belum aktif' });
    }
    if (kamar.status_kamar !== 'kosong') {
      return res.status(409).json({ pesan: 'Kamar sedang tidak tersedia' });
    }

    // Cegah user mengajukan ulang kamar yang sama selagi masih diproses
    const { data: ganda } = await supabase
      .from('booking')
      .select('booking_id')
      .eq('kamar_id', kamar_id)
      .eq('user_id', req.user.user_id)
      .in('status_booking', ['menunggu', 'disetujui'])
      .limit(1);

    if (ganda?.length) {
      return res.status(409).json({ pesan: 'Kamu sudah punya booking aktif untuk kamar ini' });
    }

    const { data, error } = await supabase
      .from('booking')
      .insert({
        kamar_id,
        user_id: req.user.user_id,
        tanggal_survey,
        status_booking: 'menunggu',
      })
      .select(SELECT_BOOKING)
      .single();

    if (error) return res.status(500).json({ pesan: error.message });

    res.status(201).json({ pesan: 'Booking berhasil diajukan, menunggu persetujuan owner', booking: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/booking/saya  (user)
export const bookingSaya = async (req, res) => {
  try {
    await selesaikanBookingKedaluwarsa();

    const { data, error } = await supabase
      .from('booking')
      .select(SELECT_BOOKING)
      .eq('user_id', req.user.user_id)
      .order('booking_id', { ascending: false });

    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, booking: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/booking/masuk?status=menunggu  (owner)
export const bookingMasuk = async (req, res) => {
  try {
    const { status } = req.query;
    await selesaikanBookingKedaluwarsa();

    let query = supabase
      .from('booking')
      .select(`
        booking_id, kamar_id, user_id, tanggal_survey, status_booking, dibuat_pada,
        users ( nama, no_wa, email ),
        kamar!inner ( no_kamar, tipe_kamar, harga, kos!inner ( kos_id, nama_kos, alamat, tipe_kos, owner_id ) )
      `)
      .eq('kamar.kos.owner_id', req.user.user_id)
      .order('booking_id', { ascending: false });

    if (status) query = query.eq('status_booking', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ pesan: error.message });

    res.json({ jumlah: data.length, booking: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// PATCH /api/booking/:id/status  (owner pemilik kos)  body: { "status": "disetujui" }
export const ubahStatusBooking = async (req, res) => {
  try {
    const { status } = req.body ?? {};

    if (!STATUS_BOOKING.includes(status)) {
      return res.status(400).json({ pesan: `status harus salah satu dari: ${STATUS_BOOKING.join(', ')}` });
    }

    const { data: booking, error: errCari } = await supabase
      .from('booking')
      .select('booking_id, kamar_id, status_booking, kamar ( status_kamar, kos ( owner_id ) )')
      .eq('booking_id', req.params.id)
      .maybeSingle();

    if (errCari) return res.status(500).json({ pesan: errCari.message });
    if (!booking) return res.status(404).json({ pesan: 'Booking tidak ditemukan' });
    if (booking.kamar?.kos?.owner_id !== req.user.user_id) {
      return res.status(403).json({ pesan: 'Booking ini bukan untuk kosmu' });
    }

    const boleh = TRANSISI[booking.status_booking] ?? [];
    if (!boleh.includes(status)) {
      return res.status(409).json({
        pesan: `Status booking "${booking.status_booking}" tidak bisa diubah menjadi "${status}"`,
      });
    }

    // Satu kamar hanya boleh punya satu booking yang disetujui
    if (status === 'disetujui' && booking.kamar?.status_kamar !== 'kosong') {
      return res.status(409).json({ pesan: 'Kamar ini sudah tidak kosong, booking tidak bisa disetujui' });
    }

    // Status kamar mengikuti status booking: Kosong -> Dalam Booking -> Terisi.
    // Booking yang ditolak saat masih "menunggu" tidak boleh mengubah kamar
    // (kamar bisa saja sedang dipakai booking lain).
    let statusKamarBaru = null;
    if (status === 'disetujui') statusKamarBaru = 'dalam_booking';
    else if (status === 'selesai') statusKamarBaru = 'terisi';
    else if (status === 'ditolak' && booking.status_booking === 'disetujui') statusKamarBaru = 'kosong';

    // Update bersyarat: gagal jika status booking sudah berubah oleh proses lain
    const { data, error } = await supabase
      .from('booking')
      .update({ status_booking: status })
      .eq('booking_id', req.params.id)
      .eq('status_booking', booking.status_booking)
      .select('booking_id, kamar_id, status_booking')
      .maybeSingle();

    if (error) return res.status(500).json({ pesan: error.message });
    if (!data) return res.status(409).json({ pesan: 'Status booking sudah berubah, muat ulang halaman' });

    if (statusKamarBaru) {
      const { error: errKamar } = await supabase
        .from('kamar')
        .update({ status_kamar: statusKamarBaru })
        .eq('kamar_id', booking.kamar_id);

      if (errKamar) {
        // Kembalikan status booking supaya data tetap konsisten
        await supabase.from('booking').update({ status_booking: booking.status_booking }).eq('booking_id', req.params.id);
        return res.status(500).json({ pesan: errKamar.message });
      }
    }

    // Kamar sudah dipegang booking ini: pengajuan lain untuk kamar yang sama otomatis ditolak
    let otomatisDitolak = 0;
    if (status === 'disetujui') {
      const { data: lain } = await supabase
        .from('booking')
        .update({ status_booking: 'ditolak' })
        .eq('kamar_id', booking.kamar_id)
        .eq('status_booking', 'menunggu')
        .neq('booking_id', booking.booking_id)
        .select('booking_id');
      otomatisDitolak = lain?.length ?? 0;
    }

    res.json({ pesan: `Booking ${status}`, booking: data, otomatis_ditolak: otomatisDitolak });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};
