import { supabase } from '../config/supabase.js';

// Tanggal hari ini (YYYY-MM-DD) menurut zona waktu WIB
export const hariIniWIB = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

/**
 * Soal: "Sistem mengubah status booking menjadi Selesai setelah masa sewa/survey berlangsung."
 * Booking berstatus 'disetujui' yang tanggal_survey-nya sudah lewat otomatis menjadi 'selesai',
 * dan kamarnya menjadi 'terisi'. Fungsi ini tidak pernah melempar error.
 */
export const selesaikanBookingKedaluwarsa = async () => {
  try {
    const { data, error } = await supabase
      .from('booking')
      .select('booking_id, kamar_id')
      .eq('status_booking', 'disetujui')
      .lt('tanggal_survey', hariIniWIB());

    if (error || !data?.length) return 0;

    const bookingIds = data.map((b) => b.booking_id);
    const kamarIds = [...new Set(data.map((b) => b.kamar_id))];

    const { error: errBooking } = await supabase
      .from('booking')
      .update({ status_booking: 'selesai' })
      .in('booking_id', bookingIds)
      .eq('status_booking', 'disetujui');
    if (errBooking) return 0;

    await supabase.from('kamar').update({ status_kamar: 'terisi' }).in('kamar_id', kamarIds);
    return bookingIds.length;
  } catch (err) {
    console.error('selesaikanBookingKedaluwarsa gagal:', err.message);
    return 0;
  }
};
