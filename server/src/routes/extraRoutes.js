import express from 'express';
import {
  daftarFasilitas, tambahFasilitas, ubahFasilitas, hapusFasilitas,
  tambahFoto, hapusFoto, buatReview, daftarBookingAdmin,
} from '../controllers/extraController.js';
import { verifyToken, cekRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Fasilitas: daftar publik, kelola oleh admin
router.get('/fasilitas', daftarFasilitas);
router.post('/fasilitas', verifyToken, cekRole('admin'), tambahFasilitas);
router.put('/fasilitas/:id', verifyToken, cekRole('admin'), ubahFasilitas);
router.delete('/fasilitas/:id', verifyToken, cekRole('admin'), hapusFasilitas);

// Foto kos (owner)
router.post('/kos/:kosId/foto', verifyToken, cekRole('owner'), tambahFoto);
router.delete('/foto/:id', verifyToken, cekRole('owner'), hapusFoto);

// Review (user)
router.post('/review', verifyToken, cekRole('user'), buatReview);

// Semua booking untuk dashboard admin
router.get('/admin/booking', verifyToken, cekRole('admin'), daftarBookingAdmin);

export default router;
