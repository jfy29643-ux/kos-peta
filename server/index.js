import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase } from './src/config/supabase.js';
import authRoutes from './src/routes/authRoutes.js';
import kosRoutes from './src/routes/kosRoutes.js';
import kamarRoutes from './src/routes/kamarRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import extraRoutes from './src/routes/extraRoutes.js';
import { selesaikanBookingKedaluwarsa } from './src/utils/bookingOtomatis.js';

for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`Variabel ${k} belum diisi di file .env`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Boleh lebih dari satu origin, pisahkan dengan koma. Default: Vite dev server.
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ pesan: 'API pencarian & pemesanan kos berjalan' });
});

app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('users').select('user_id').limit(1);
  res.json({ server: 'ok', database: error ? error.message : 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/kos', kosRoutes);
app.use('/api', kamarRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', extraRoutes);

// 404 untuk endpoint yang tidak ada (JSON, bukan HTML)
app.use((req, res) => {
  res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
});

// Penangan error global (mis. JSON body rusak)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ pesan: 'Format JSON tidak valid' });
  }
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan pada server' });
});

// Di komputer sendiri: jalankan server biasa.
// Di Vercel: tidak boleh pakai listen/setInterval.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
  });

  // Booking kedaluwarsa dicek saat start, lalu tiap 5 menit.
  selesaikanBookingKedaluwarsa();
  setInterval(selesaikanBookingKedaluwarsa, 5 * 60 * 1000);
}

// Wajib untuk Vercel
export default app;