import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <header className="nav no-print">
        <NavLink to="/" className="brand">🏠 Kos<span>Peta</span></NavLink>
        <nav>
          <NavLink to="/" end>Cari Kos</NavLink>
          {user?.role === 'user' && <NavLink to="/booking-saya">Booking Saya</NavLink>}
          {user?.role === 'owner' && (<>
            <NavLink to="/owner" end>Dashboard</NavLink>
            <NavLink to="/owner/kos">Kos Saya</NavLink>
            <NavLink to="/owner/booking">Booking Masuk</NavLink>
          </>)}
          {user?.role === 'admin' && (<>
            <NavLink to="/admin" end>Dashboard</NavLink>
            <NavLink to="/admin/verifikasi">Verifikasi</NavLink>
            <NavLink to="/admin/fasilitas">Fasilitas</NavLink>
          </>)}
        </nav>
        <div className="nav-r">
          {user ? (<>
            <span className="muted">{user.nama} · {user.role}</span>
            <button className="btn sm ghost" onClick={() => { logout(); nav('/login'); }}>Keluar</button>
          </>) : (<>
            <NavLink to="/login" className="btn sm ghost">Masuk</NavLink>
            <NavLink to="/register" className="btn sm">Daftar</NavLink>
          </>)}
        </div>
      </header>
      <main><Outlet /></main>
    </>
  );
}
