import { supabase } from '../config/supabase.js';

const STATUS_KAMAR = ['kosong', 'dalam_booking', 'terisi'];
const KOLOM = 'kamar_id, kos_id, no_kamar, tipe_kamar, harga, status_kamar';

// Pastikan kos ada dan milik owner yang login
const cekKosMilik = async (kosId, userId) => {
  const { data, error } = await supabase
    .from('kos')
    .select('kos_id, owner_id')
    .eq('kos_id', kosId)
    .maybeSingle();

  if (error) return { status: 500, pesan: error.message };
  if (!data) return { status: 404, pesan: 'Kos tidak ditemukan' };
  if (data.owner_id !== userId) return { status: 403, pesan: 'Ini bukan kos milikmu' };
  return {};
};

// Pastikan kamar ada dan kos-nya milik owner yang login
const cekKamarMilik = async (kamarId, userId) => {
  const { data, error } = await supabase
    .from('kamar')
    .select('kamar_id, kos ( owner_id )')
    .eq('kamar_id', kamarId)
    .maybeSingle();

  if (error) return { status: 500, pesan: error.message };
  if (!data) return { status: 404, pesan: 'Kamar tidak ditemukan' };
  if (data.kos?.owner_id !== userId) return { status: 403, pesan: 'Ini bukan kamar milikmu' };
  return {};
};

// GET /api/kos/:kosId/kamar  (publik)
export const daftarKamar = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kamar')
      .select(KOLOM)
      .eq('kos_id', req.params.kosId)
      .order('no_kamar', { ascending: true });

    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, kamar: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// POST /api/kos/:kosId/kamar  (owner pemilik)
export const tambahKamar = async (req, res) => {
  try {
    const cek = await cekKosMilik(req.params.kosId, req.user.user_id);
    if (cek.pesan) return res.status(cek.status).json({ pesan: cek.pesan });

    const { no_kamar, tipe_kamar, harga, status_kamar = 'kosong' } = req.body ?? {};

    if (!no_kamar || !tipe_kamar || harga == null) {
      return res.status(400).json({ pesan: 'no_kamar, tipe_kamar, dan harga wajib diisi' });
    }
    if (!Number.isInteger(Number(harga)) || Number(harga) < 0) {
      return res.status(400).json({ pesan: 'harga harus berupa angka bulat >= 0' });
    }
    if (!STATUS_KAMAR.includes(status_kamar)) {
      return res.status(400).json({ pesan: `status_kamar harus salah satu dari: ${STATUS_KAMAR.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('kamar')
      .insert({
        kos_id: Number(req.params.kosId),
        no_kamar,
        tipe_kamar,
        harga: Number(harga),
        status_kamar,
      })
      .select(KOLOM)
      .single();

    if (error) return res.status(500).json({ pesan: error.message });
    res.status(201).json({ pesan: 'Kamar berhasil ditambahkan', kamar: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// PUT /api/kamar/:id  (owner pemilik)
export const ubahKamar = async (req, res) => {
  try {
    const cek = await cekKamarMilik(req.params.id, req.user.user_id);
    if (cek.pesan) return res.status(cek.status).json({ pesan: cek.pesan });

    const { no_kamar, tipe_kamar, harga, status_kamar } = req.body ?? {};
    const perubahan = {};

    if (no_kamar !== undefined) perubahan.no_kamar = no_kamar;
    if (tipe_kamar !== undefined) perubahan.tipe_kamar = tipe_kamar;
    if (harga !== undefined) {
      if (!Number.isInteger(Number(harga)) || Number(harga) < 0) {
        return res.status(400).json({ pesan: 'harga harus berupa angka bulat >= 0' });
      }
      perubahan.harga = Number(harga);
    }
    if (status_kamar !== undefined) {
      if (!STATUS_KAMAR.includes(status_kamar)) {
        return res.status(400).json({ pesan: `status_kamar harus salah satu dari: ${STATUS_KAMAR.join(', ')}` });
      }
      perubahan.status_kamar = status_kamar;
    }
    if (!Object.keys(perubahan).length) {
      return res.status(400).json({ pesan: 'Tidak ada data yang diubah' });
    }

    const { data, error } = await supabase
      .from('kamar')
      .update(perubahan)
      .eq('kamar_id', req.params.id)
      .select(KOLOM)
      .single();

    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ pesan: 'Kamar berhasil diubah', kamar: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// DELETE /api/kamar/:id  (owner pemilik)
export const hapusKamar = async (req, res) => {
  try {
    const cek = await cekKamarMilik(req.params.id, req.user.user_id);
    if (cek.pesan) return res.status(cek.status).json({ pesan: cek.pesan });

    const { error } = await supabase.from('kamar').delete().eq('kamar_id', req.params.id);
    if (error) {
      return res.status(409).json({
        pesan: `Kamar tidak bisa dihapus (kemungkinan sudah punya booking): ${error.message}`,
      });
    }

    res.json({ pesan: 'Kamar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};
