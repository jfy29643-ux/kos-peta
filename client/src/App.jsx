import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Peta from './pages/Peta.jsx';
import DetailKos from './pages/DetailKos.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BookingSaya from './pages/BookingSaya.jsx';
import DashboardOwner from './pages/owner/DashboardOwner.jsx';
import KosSaya from './pages/owner/KosSaya.jsx';
import KelolaKos from './pages/owner/KelolaKos.jsx';
import BookingMasuk from './pages/owner/BookingMasuk.jsx';
import DashboardAdmin from './pages/admin/DashboardAdmin.jsx';
import Verifikasi from './pages/admin/Verifikasi.jsx';
import Fasilitas from './pages/admin/Fasilitas.jsx';

function Guard({ roles, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ dari: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Peta />} />
        <Route path="/kos/:id" element={<DetailKos />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/booking-saya" element={<Guard roles={['user']}><BookingSaya /></Guard>} />

        <Route path="/owner" element={<Guard roles={['owner']}><DashboardOwner /></Guard>} />
        <Route path="/owner/kos" element={<Guard roles={['owner']}><KosSaya /></Guard>} />
        <Route path="/owner/kos/:id" element={<Guard roles={['owner']}><KelolaKos /></Guard>} />
        <Route path="/owner/booking" element={<Guard roles={['owner']}><BookingMasuk /></Guard>} />

        <Route path="/admin" element={<Guard roles={['admin']}><DashboardAdmin /></Guard>} />
        <Route path="/admin/verifikasi" element={<Guard roles={['admin']}><Verifikasi /></Guard>} />
        <Route path="/admin/fasilitas" element={<Guard roles={['admin']}><Fasilitas /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
