const express = require('express');
const router = express.Router();
const empruntController = require('../controllers/empruntController');
const { authenticateToken, isUser } = require('../../common/authMiddleware');

router.post('/', authenticateToken, isUser, empruntController.creerEmprunt);
router.get('/:id', authenticateToken, isUser, empruntController.consulterEmprunt);
router.patch('/:id/statut', authenticateToken, isUser, empruntController.mettreAJourStatutEmprunt);

module.exports = router;
