import express from 'express';
import { startMatchmaking, cancelMatching, acceptMatching } from '../controller/matching-controller.js';

const router = express.Router();

router.post('/', startMatchmaking);

router.post('/accept', acceptMatching);

router.delete('/:userId', cancelMatching);



export default router;