import { Router } from 'express';
import { verifyJWT } from '../middlewares/jwt.middleware';
import { connectWallet, getProfile, updateProfile } from '../controllers/user.controller';
    
const router = Router();

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               stellarPublicKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid fields or no valid fields to update
 *       401:
 *         description: Unauthorized
 */

router.get('/me', verifyJWT, getProfile);
router.put('/me', verifyJWT, updateProfile);
router.put('/connect-wallet', verifyJWT, connectWallet);

export default router;
