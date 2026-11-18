import express from 'express';
import {
  daftarUser,
  verifikasiUser,
  daftarKosAdmin,
  ubahStatusKos,
  daftarKamarAdmin,
} from '../controllers/adminController.js';
import { verifyToken, cekRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken, cekRole('admin'));

router.get('/users', daftarUser);
router.patch('/users/:id/verifikasi', verifikasiUser);
router.get('/kos', daftarKosAdmin);
router.patch('/kos/:id/status', ubahStatusKos);
router.get('/kamar', daftarKamarAdmin);

export default router;
