import { supabase } from '../config/supabase.js';
import { lampirkanReview } from './extraController.js';

// Kos yang tampil di pencarian publik hanya yang sudah disetujui Admin.
const STATUS_TAMPIL = 'aktif';

const SELECT_LENGKAP = `
  kos_id, owner_id, nama_kos, alamat, latitude, longitude, tipe_kos, status_verifikasi,
  foto_kos ( foto_id, path_foto ),
  kos_fasilitas ( fasilitas ( fasilitas_id, nama_fasilitas ) ),
  kamar ( kamar_id, no_kamar, tipe_kamar, harga, status_kamar ),
  users ( nama, no_wa )
`;

const rapikan = (k) => {
  const harga = (k.kamar ?? []).map((m) => m.harga).filter((h) => h != null);
  return {
    ...k,
    fasilitas: (k.kos_fasilitas ?? []).map((f) => f.fasilitas).filter(Boolean),
    harga_mulai: harga.length ? Math.min(...harga) : null,
    pemilik: k.users ?? null,
    kos_fasilitas: undefined,
    users: undefined,
  };
};

const TIPE_KOS = ['putra', 'putri', 'campur'];

// Buang karakter yang bisa merusak filter .or() milik PostgREST
const bersihkanQuery = (q) => String(q).replace(/[,()%*\\]/g, ' ').trim();

const validasiKoordinat = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

const simpanFasilitas = async (kosId, ids) => {
  await supabase.from('kos_fasilitas').delete().eq('kos_id', kosId);
  if (!ids.length) return null;
  const { error } = await supabase
    .from('kos_fasilitas')
    .insert(ids.map((fasilitas_id) => ({ kos_id: kosId, fasilitas_id })));
  return error;
};

// GET /api/kos  (publik) ?q=kata&tipe_kos=putra
export const daftarKos = async (req, res) => {
  try {
    const { q, tipe_kos } = req.query;

    let query = supabase.from('kos').select(SELECT_LENGKAP).order('kos_id', { ascending: false });
    if (STATUS_TAMPIL) query = query.eq('status_verifikasi', STATUS_TAMPIL);
    if (tipe_kos) query = query.eq('tipe_kos', String(tipe_kos).toLowerCase());
    const kata = q ? bersihkanQuery(q) : '';
    if (kata) query = query.or(`nama_kos.ilike.%${kata}%,alamat.ilike.%${kata}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ pesan: error.message });

    res.json({ jumlah: data.length, kos: await lampirkanReview(data.map(rapikan)) });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/kos/saya  (owner)
export const kosSaya = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kos')
      .select(SELECT_LENGKAP)
      .eq('owner_id', req.user.user_id)
      .order('kos_id', { ascending: false });

    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, kos: await lampirkanReview(data.map(rapikan)) });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/kos/:id  (publik)
export const detailKos = async (req, res) => {
  try {
    let query = supabase.from('kos').select(SELECT_LENGKAP).eq('kos_id', req.params.id);
    if (STATUS_TAMPIL) query = query.eq('status_verifikasi', STATUS_TAMPIL);

    const { data, error } = await query.maybeSingle();

    if (error) return res.status(500).json({ pesan: error.message });
    if (!data) return res.status(404).json({ pesan: 'Kos tidak ditemukan' });

    const [kos] = await lampirkanReview([rapikan(data)]);
    res.json({ kos });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// POST /api/kos  (owner)
export const tambahKos = async (req, res) => {
  try {
    const { nama_kos, alamat, latitude, longitude, tipe_kos, fasilitas_ids = [] } = req.body ?? {};

    if (!nama_kos || !alamat || latitude == null || longitude == null || !tipe_kos) {
      return res.status(400).json({
        pesan: 'nama_kos, alamat, latitude, longitude, dan tipe_kos wajib diisi',
      });
    }
    if (!validasiKoordinat(latitude, longitude)) {
      return res.status(400).json({ pesan: 'latitude/longitude tidak valid' });
    }
    if (!TIPE_KOS.includes(tipe_kos)) {
      return res.status(400).json({ pesan: `tipe_kos harus salah satu dari: ${TIPE_KOS.join(', ')}` });
    }
    if (!Array.isArray(fasilitas_ids)) {
      return res.status(400).json({ pesan: 'fasilitas_ids harus berupa array' });
    }

    const { data: pemilik, error: errPemilik } = await supabase
      .from('users')
      .select('status_verifikasi')
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (errPemilik) return res.status(500).json({ pesan: errPemilik.message });
    if (pemilik?.status_verifikasi !== 'terverifikasi') {
      return res.status(403).json({ pesan: 'Akun owner belum diverifikasi Admin' });
    }

    const { data, error } = await supabase
      .from('kos')
      .insert({
        owner_id: req.user.user_id,
        nama_kos,
        alamat,
        latitude: Number(latitude),
        longitude: Number(longitude),
        tipe_kos,
      })
      .select('kos_id')
      .single();

    if (error) return res.status(500).json({ pesan: error.message });

    const errFas = await simpanFasilitas(data.kos_id, fasilitas_ids);
    if (errFas) return res.status(500).json({ pesan: errFas.message });

    const { data: lengkap } = await supabase
      .from('kos')
      .select(SELECT_LENGKAP)
      .eq('kos_id', data.kos_id)
      .single();

    res.status(201).json({ pesan: 'Kos berhasil ditambahkan', kos: rapikan(lengkap) });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// Ambil kos dan pastikan milik owner yang login
const ambilKosMilik = async (kosId, userId) => {
  const { data, error } = await supabase
    .from('kos')
    .select('kos_id, owner_id')
    .eq('kos_id', kosId)
    .maybeSingle();

  if (error) return { status: 500, pesan: error.message };
  if (!data) return { status: 404, pesan: 'Kos tidak ditemukan' };
  if (data.owner_id !== userId) return { status: 403, pesan: 'Ini bukan kos milikmu' };
  return { kos: data };
};

// PUT /api/kos/:id  (owner pemilik)
export const ubahKos = async (req, res) => {
  try {
    const cek = await ambilKosMilik(req.params.id, req.user.user_id);
    if (cek.pesan) return res.status(cek.status).json({ pesan: cek.pesan });

    const { nama_kos, alamat, latitude, longitude, tipe_kos, fasilitas_ids } = req.body ?? {};

    const perubahan = {};
    if (nama_kos !== undefined) perubahan.nama_kos = nama_kos;
    if (alamat !== undefined) perubahan.alamat = alamat;
    if (tipe_kos !== undefined) {
      if (!TIPE_KOS.includes(tipe_kos)) {
        return res.status(400).json({ pesan: `tipe_kos harus salah satu dari: ${TIPE_KOS.join(', ')}` });
      }
      perubahan.tipe_kos = tipe_kos;
    }
    if (latitude !== undefined || longitude !== undefined) {
      if (!validasiKoordinat(latitude, longitude)) {
        return res.status(400).json({ pesan: 'latitude dan longitude harus dikirim berdua dan valid' });
      }
      perubahan.latitude = Number(latitude);
      perubahan.longitude = Number(longitude);
    }
    if (fasilitas_ids !== undefined && !Array.isArray(fasilitas_ids)) {
      return res.status(400).json({ pesan: 'fasilitas_ids harus berupa array' });
    }
    if (!Object.keys(perubahan).length && fasilitas_ids === undefined) {
      return res.status(400).json({ pesan: 'Tidak ada data yang diubah' });
    }

    if (Object.keys(perubahan).length) {
      const { error } = await supabase.from('kos').update(perubahan).eq('kos_id', req.params.id);
      if (error) return res.status(500).json({ pesan: error.message });
    }

    if (fasilitas_ids !== undefined) {
      const errFas = await simpanFasilitas(Number(req.params.id), fasilitas_ids);
      if (errFas) return res.status(500).json({ pesan: errFas.message });
    }

    const { data } = await supabase
      .from('kos')
      .select(SELECT_LENGKAP)
      .eq('kos_id', req.params.id)
      .single();

    res.json({ pesan: 'Kos berhasil diubah', kos: rapikan(data) });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// DELETE /api/kos/:id  (owner pemilik, atau admin)
export const hapusKos = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { data: ada } = await supabase.from('kos').select('kos_id').eq('kos_id', req.params.id).maybeSingle();
      if (!ada) return res.status(404).json({ pesan: 'Kos tidak ditemukan' });
    } else {
      const cek = await ambilKosMilik(req.params.id, req.user.user_id);
      if (cek.pesan) return res.status(cek.status).json({ pesan: cek.pesan });
    }

    // Cek dulu sebelum menghapus apa pun, supaya foto/fasilitas tidak hilang kalau kos gagal dihapus
    const { count, error: errKamar } = await supabase
      .from('kamar')
      .select('kamar_id', { count: 'exact', head: true })
      .eq('kos_id', req.params.id);

    if (errKamar) return res.status(500).json({ pesan: errKamar.message });
    if (count > 0) {
      return res.status(409).json({ pesan: 'Kos tidak bisa dihapus karena masih memiliki kamar. Hapus semua kamar terlebih dahulu.' });
    }

    await supabase.from('kos_fasilitas').delete().eq('kos_id', req.params.id);
    await supabase.from('foto_kos').delete().eq('kos_id', req.params.id);

    const { error } = await supabase.from('kos').delete().eq('kos_id', req.params.id);
    if (error) {
      return res.status(409).json({ pesan: `Kos tidak bisa dihapus: ${error.message}` });
    }

    res.json({ pesan: 'Kos berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};
