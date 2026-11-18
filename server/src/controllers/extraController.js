import { supabase } from '../config/supabase.js';
import { selesaikanBookingKedaluwarsa } from '../utils/bookingOtomatis.js';

/* ============ Fasilitas (master data) ============ */
export const daftarFasilitas = async (req, res) => {
  try {
    const { data, error } = await supabase.from('fasilitas').select('fasilitas_id, nama_fasilitas').order('nama_fasilitas');
    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, fasilitas: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

export const tambahFasilitas = async (req, res) => {
  try {
    const { nama_fasilitas } = req.body ?? {};
    if (!nama_fasilitas?.trim()) return res.status(400).json({ pesan: 'nama_fasilitas wajib diisi' });
    const { data, error } = await supabase.from('fasilitas').insert({ nama_fasilitas: nama_fasilitas.trim() }).select().single();
    if (error) return res.status(500).json({ pesan: error.message });
    res.status(201).json({ pesan: 'Fasilitas ditambahkan', fasilitas: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

export const ubahFasilitas = async (req, res) => {
  try {
    const { nama_fasilitas } = req.body ?? {};
    if (!nama_fasilitas?.trim()) return res.status(400).json({ pesan: 'nama_fasilitas wajib diisi' });
    const { data, error } = await supabase.from('fasilitas').update({ nama_fasilitas: nama_fasilitas.trim() }).eq('fasilitas_id', req.params.id).select().maybeSingle();
    if (error) return res.status(500).json({ pesan: error.message });
    if (!data) return res.status(404).json({ pesan: 'Fasilitas tidak ditemukan' });
    res.json({ pesan: 'Fasilitas diubah', fasilitas: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

export const hapusFasilitas = async (req, res) => {
  try {
    await supabase.from('kos_fasilitas').delete().eq('fasilitas_id', req.params.id);
    const { error } = await supabase.from('fasilitas').delete().eq('fasilitas_id', req.params.id);
    if (error) return res.status(409).json({ pesan: `Fasilitas tidak bisa dihapus: ${error.message}` });
    res.json({ pesan: 'Fasilitas dihapus' });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

/* ============ Foto kos (menyimpan URL/path gambar) ============ */
export const tambahFoto = async (req, res) => {
  try {
    const { path_foto } = req.body ?? {};
    if (!path_foto?.trim()) return res.status(400).json({ pesan: 'path_foto wajib diisi' });
    if (!/^https?:\/\//i.test(path_foto.trim())) return res.status(400).json({ pesan: 'path_foto harus berupa URL gambar (http/https)' });

    const { data: kos } = await supabase.from('kos').select('owner_id').eq('kos_id', req.params.kosId).maybeSingle();
    if (!kos) return res.status(404).json({ pesan: 'Kos tidak ditemukan' });
    if (kos.owner_id !== req.user.user_id) return res.status(403).json({ pesan: 'Ini bukan kos milikmu' });

    const { data, error } = await supabase.from('foto_kos').insert({ kos_id: Number(req.params.kosId), path_foto: path_foto.trim() }).select().single();
    if (error) return res.status(500).json({ pesan: error.message });
    res.status(201).json({ pesan: 'Foto ditambahkan', foto: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

export const hapusFoto = async (req, res) => {
  try {
    const { data: foto } = await supabase.from('foto_kos').select('foto_id, kos ( owner_id )').eq('foto_id', req.params.id).maybeSingle();
    if (!foto) return res.status(404).json({ pesan: 'Foto tidak ditemukan' });
    if (foto.kos?.owner_id !== req.user.user_id) return res.status(403).json({ pesan: 'Ini bukan fotomu' });
    const { error } = await supabase.from('foto_kos').delete().eq('foto_id', req.params.id);
    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ pesan: 'Foto dihapus' });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

/* ============ Review & rating ============ */
// POST /api/review  (user)  body: { booking_id, rating (1-5), komentar }
export const buatReview = async (req, res) => {
  try {
    const { booking_id, rating, komentar } = req.body ?? {};
    const nilai = Number(rating);
    if (!booking_id || !Number.isInteger(nilai) || nilai < 1 || nilai > 5) {
      return res.status(400).json({ pesan: 'booking_id wajib diisi dan rating harus bilangan bulat 1-5' });
    }

    const { data: bk } = await supabase.from('booking').select('booking_id, user_id, status_booking').eq('booking_id', booking_id).maybeSingle();
    if (!bk) return res.status(404).json({ pesan: 'Booking tidak ditemukan' });
    if (bk.user_id !== req.user.user_id) return res.status(403).json({ pesan: 'Ini bukan bookingmu' });
    if (bk.status_booking !== 'selesai') return res.status(409).json({ pesan: 'Review hanya bisa diberikan setelah booking selesai' });

    const { data: ada } = await supabase.from('review').select('review_id').eq('booking_id', booking_id).maybeSingle();
    if (ada) return res.status(409).json({ pesan: 'Booking ini sudah diulas' });

    const { data, error } = await supabase
      .from('review')
      .insert({ booking_id, rating: nilai, komentar: komentar ?? '' })
      .select().single();
    if (error) return res.status(500).json({ pesan: error.message });
    res.status(201).json({ pesan: 'Terima kasih atas ulasanmu', review: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};

/**
 * Menempelkan `reviews` dan `rata_rating` ke daftar kos (hasil rapikan()).
 * Dipanggil di kosController: daftarKos, kosSaya, detailKos.
 */
export const lampirkanReview = async (daftar) => {
  const ids = daftar.map((k) => k.kos_id);
  if (!ids.length) return daftar;

  const { data } = await supabase
    .from('review')
    .select('rating, komentar, dibuat_pada, booking!inner ( users ( nama ), kamar!inner ( kos_id ) )')
    .in('booking.kamar.kos_id', ids);

  const peta = {};
  (data ?? []).forEach((r) => {
    const id = r.booking?.kamar?.kos_id;
    (peta[id] ||= []).push({ rating: r.rating, komentar: r.komentar, dibuat_pada: r.dibuat_pada, nama: r.booking?.users?.nama });
  });

  return daftar.map((k) => {
    const rv = peta[k.kos_id] ?? [];
    return { ...k, reviews: rv, rata_rating: rv.length ? Number((rv.reduce((a, x) => a + x.rating, 0) / rv.length).toFixed(1)) : null };
  });
};

/* ============ Admin: semua booking (untuk dashboard) ============ */
export const daftarBookingAdmin = async (req, res) => {
  try {
    await selesaikanBookingKedaluwarsa();
    const { data, error } = await supabase
      .from('booking')
      .select('booking_id, kamar_id, user_id, tanggal_survey, status_booking, dibuat_pada, users ( nama ), kamar ( no_kamar, tipe_kamar, harga, kos ( kos_id, nama_kos, alamat, tipe_kos ) )')
      .order('booking_id', { ascending: false });
    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, booking: data });
  } catch (err) { res.status(500).json({ pesan: err.message }); }
};
