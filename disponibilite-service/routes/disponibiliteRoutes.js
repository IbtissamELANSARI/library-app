const express = require('express');
const router = express.Router();
const disponibiliteController = require('../controllers/disponibiliteController');
const { authenticateToken, isAdmin } = require('../../common/authMiddleware');

router.get('/', disponibiliteController.listerDisponibilites);
router.patch('/:id/statut', authenticateToken, isAdmin, disponibiliteController.marquerStatutLivre);

module.exports = router;
