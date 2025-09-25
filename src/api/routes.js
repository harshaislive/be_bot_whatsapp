import express from 'express';
import { whatsappController } from './whatsappControl.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Middleware for API logging
router.use((req, res, next) => {
    logger.info(`API Request: ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// WhatsApp Control Routes
router.post('/whatsapp/disconnect', async (req, res) => {
    await whatsappController.forceDisconnect(req, res);
});

router.get('/whatsapp/status', async (req, res) => {
    await whatsappController.getStatus(req, res);
});

router.delete('/sessions/clear', async (req, res) => {
    await whatsappController.clearAllSessions(req, res);
});

router.get('/health', async (req, res) => {
    await whatsappController.healthCheck(req, res);
});

// API Info
router.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp Bot API',
        version: '1.0.0',
        endpoints: {
            'POST /api/whatsapp/disconnect': 'Force disconnect WhatsApp for re-login',
            'GET /api/whatsapp/status': 'Get WhatsApp connection status',
            'DELETE /api/sessions/clear': 'Clear all sessions',
            'GET /api/health': 'Health check'
        },
        timestamp: new Date().toISOString()
    });
});

export default router;