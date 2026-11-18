import express from 'express';
import {
  daftarKos,
  kosSaya,
  detailKos,
  tambahKos,
  ubahKos,
  hapusKos,
} from '../controllers/kosController.js';
import { verifyToken, cekRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publik
router.get('/', daftarKos);

// Owner (harus di atas '/:id' supaya 'saya' tidak dianggap id)
router.get('/saya', verifyToken, cekRole('owner'), kosSaya);
router.post('/', verifyToken, cekRole('owner'), tambahKos);

// Publik
router.get('/:id', detailKos);

// Owner pemilik / admin
router.put('/:id', verifyToken, cekRole('owner'), ubahKos);
router.delete('/:id', verifyToken, cekRole('owner', 'admin'), hapusKos);

export default router;