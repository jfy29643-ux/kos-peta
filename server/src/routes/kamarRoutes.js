import express from 'express';
import {
  daftarKamar,
  tambahKamar,
  ubahKamar,
  hapusKamar,
} from '../controllers/kamarController.js';
import { verifyToken, cekRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/kos/:kosId/kamar', daftarKamar);
router.post('/kos/:kosId/kamar', verifyToken, cekRole('owner'), tambahKamar);
router.put('/kamar/:id', verifyToken, cekRole('owner'), ubahKamar);
router.delete('/kamar/:id', verifyToken, cekRole('owner'), hapusKamar);

export default router;
