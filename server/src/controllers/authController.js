import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

// Hanya Pemilik Kos dan Pencari Kos yang boleh mendaftar sendiri.
// Akun Admin dibuat langsung di database, tidak lewat endpoint publik.
const ROLE_DAFTAR = ['owner', 'user'];
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res) => {
  try {
    const { nama, email, password, role, no_wa } = req.body ?? {};

    if (!nama?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({ pesan: 'nama, email, password, dan role wajib diisi' });
    }
    if (!ROLE_DAFTAR.includes(role)) {
      return res.status(400).json({ pesan: `role harus salah satu dari: ${ROLE_DAFTAR.join(', ')}` });
    }
    if (!FORMAT_EMAIL.test(email.trim())) {
      return res.status(400).json({ pesan: 'Format email tidak valid' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ pesan: 'Password minimal 6 karakter' });
    }

    const emailBersih = email.trim();

    const { data: ada, error: errCek } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', emailBersih)
      .maybeSingle();

    if (errCek) return res.status(500).json({ pesan: errCek.message });
    if (ada) return res.status(409).json({ pesan: 'Email sudah terdaftar' });

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        nama: nama.trim(),
        email: emailBersih,
        password: hash,
        role,
        no_wa: no_wa?.trim() || null,
        // Pemilik Kos baru wajib menunggu verifikasi Admin (tidak bisa diatur dari client)
        ...(role === 'owner' && { status_verifikasi: 'menunggu' }),
      })
      .select('user_id, nama, email, role, no_wa, status_verifikasi')
      .single();

    if (error) return res.status(500).json({ pesan: error.message });

    res.status(201).json({ pesan: 'Registrasi berhasil', user: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ pesan: 'email dan password wajib diisi' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim())
      .maybeSingle();

    if (error) return res.status(500).json({ pesan: error.message });
    if (!user) return res.status(401).json({ pesan: 'Email atau password salah' });

    const cocok = await bcrypt.compare(password, user.password);
    if (!cocok) return res.status(401).json({ pesan: 'Email atau password salah' });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      pesan: 'Login berhasil',
      token,
      user: {
        user_id: user.user_id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        no_wa: user.no_wa,
        status_verifikasi: user.status_verifikasi,
      },
    });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};

export const me = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, nama, email, role, no_wa, status_verifikasi')
      .eq('user_id', req.user.user_id)
      .single();

    if (error) return res.status(500).json({ pesan: error.message });

    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
};
