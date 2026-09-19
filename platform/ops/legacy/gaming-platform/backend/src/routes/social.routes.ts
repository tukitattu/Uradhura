import { Router } from 'express';
import { getSocialHome } from '../controllers/social.controller';

const router = Router();
router.get('/home', getSocialHome);

export default router;