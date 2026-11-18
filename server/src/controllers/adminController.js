import { supabase } from '../config/supabase.js';

const STATUS_USER = ['menunggu', 'terverifikasi'];
const STATUS_KOS = ['menunggu', 'aktif', 'nonaktif'];
const ROLE_LIST = ['admin', 'owner', 'user'];

// GET /api/admin/users?role=owner&status=menunggu
export const daftarUser = async (req, res) => {
  try {
    const { role = 'owner', status } = req.query;
    if (!ROLE_LIST.includes(role)) {
      return res.status(400).json({ pesan: `role harus salah satu dari: ${ROLE_LIST.join(', ')}` });
    }

    let query = supabase
      .from('users')
      .select('user_id, nama, email, role, no_wa, status_verifikasi')
      .eq('role', role)
      .order('user_id', { ascending: true });
    if (status) query = query.eq('status_verifikasi', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ pesan: error.message });

    res.json({ jumlah: data.length, users: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// PATCH /api/admin/users/:id/verifikasi   body: { "status_verifikasi": "terverifikasi" }
export const verifikasiUser = async (req, res) => {
  try {
    const { status_verifikasi } = req.body ?? {};
    if (!STATUS_USER.includes(status_verifikasi)) {
      return res.status(400).json({ pesan: `status_verifikasi harus salah satu dari: ${STATUS_USER.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ status_verifikasi })
      .eq('user_id', req.params.id)
      .eq('role', 'owner') // verifikasi hanya berlaku untuk Pemilik Kos
      .select('user_id, nama, email, role, status_verifikasi')
      .maybeSingle();

    if (error) return res.status(500).json({ pesan: error.message });
    if (!data) return res.status(404).json({ pesan: 'Pemilik kos tidak ditemukan' });

    res.json({ pesan: 'Status verifikasi user diperbarui', user: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/admin/kos?status=menunggu
export const daftarKosAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('kos')
      .select('kos_id, owner_id, nama_kos, alamat, latitude, longitude, tipe_kos, status_verifikasi, users ( nama, email, no_wa )')
      .order('kos_id', { ascending: false });
    if (status) query = query.eq('status_verifikasi', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ pesan: error.message });

    res.json({ jumlah: data.length, kos: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// PATCH /api/admin/kos/:id/status   body: { "status": "aktif" }
export const ubahStatusKos = async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!STATUS_KOS.includes(status)) {
      return res.status(400).json({ pesan: `status harus salah satu dari: ${STATUS_KOS.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('kos')
      .update({ status_verifikasi: status })
      .eq('kos_id', req.params.id)
      .select('kos_id, nama_kos, status_verifikasi')
      .maybeSingle();

    if (error) return res.status(500).json({ pesan: error.message });
    if (!data) return res.status(404).json({ pesan: 'Kos tidak ditemukan' });

    res.json({ pesan: 'Status kos diperbarui', kos: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

// GET /api/admin/kamar  (semua kamar, untuk ekspor/laporan admin)
export const daftarKamarAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kamar')
      .select('kamar_id, kos_id, no_kamar, tipe_kamar, harga, status_kamar, kos ( nama_kos, alamat, tipe_kos )')
      .order('kos_id', { ascending: true })
      .order('no_kamar', { ascending: true });

    if (error) return res.status(500).json({ pesan: error.message });
    res.json({ jumlah: data.length, kamar: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};
