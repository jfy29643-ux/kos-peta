import express from 'express';
import {
  buatBooking,
  bookingSaya,
  bookingMasuk,
  ubahStatusBooking,
} from '../controllers/bookingController.js';
import { verifyToken, cekRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, cekRole('user'), buatBooking);
router.get('/saya', verifyToken, cekRole('user'), bookingSaya);
router.get('/masuk', verifyToken, cekRole('owner'), bookingMasuk);
router.patch('/:id/status', verifyToken, cekRole('owner'), ubahStatusBooking);

export default router;
