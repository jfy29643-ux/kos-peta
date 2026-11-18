import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Pesan } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(f.email, f.password);
      nav(loc.state?.dari || (u.role === 'admin' ? '/admin' : u.role === 'owner' ? '/owner' : '/'), { replace: true });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth card">
      <h2>Masuk</h2>
      <Pesan tipe="ok">{loc.state?.info}</Pesan>
      <Pesan>{err}</Pesan>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn full" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
      </form>
      <p className="muted">Belum punya akun? <Link to="/register">Daftar</Link></p>
    </div>
  );
}
