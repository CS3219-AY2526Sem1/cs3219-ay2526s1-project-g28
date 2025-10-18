import express from 'express';
import { startMatchmaking, cancelMatching } from '../controller/matching-controller.js';

const router = express.Router();

router.post('/', startMatchmaking);

router.delete('/:userId', cancelMatching);

export default router;