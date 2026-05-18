import { Router } from 'express';
import { inferenceController } from '../controllers/inference.controller';

const router = Router();

router.post('/analyze', inferenceController.startAnalysis);

export default router;
