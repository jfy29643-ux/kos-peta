import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Pesan } from '../components/ui.jsx';

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ nama: '', email: '', password: '', no_wa: '', role: 'user' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.post('/auth/register', f);
      nav('/login', {
        state: {
          info: f.role === 'owner'
            ? 'Registrasi berhasil. Akun Pemilik Kos harus diverifikasi Admin sebelum dapat mempublikasikan kos.'
            : 'Registrasi berhasil, silakan masuk.',
        },
      });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth card">
      <h2>Daftar Akun</h2>
      <Pesan>{err}</Pesan>
      <form onSubmit={submit}>
        <label>Daftar sebagai
          <select value={f.role} onChange={(e) => set('role', e.target.value)}>
            <option value="user">Pencari Kos</option>
            <option value="owner">Pemilik Kos</option>
          </select>
        </label>
        <label>Nama lengkap<input required value={f.nama} onChange={(e) => set('nama', e.target.value)} /></label>
        <label>Email<input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label>Password<input type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} /></label>
        <label>No. WhatsApp (opsional)<input value={f.no_wa} onChange={(e) => set('no_wa', e.target.value)} /></label>
        <button className="btn full" disabled={busy}>{busy ? 'Memproses…' : 'Daftar'}</button>
      </form>
      <p className="muted">Sudah punya akun? <Link to="/login">Masuk</Link></p>
    </div>
  );
}
