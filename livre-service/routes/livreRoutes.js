const express = require('express');
const router = express.Router();
const livreController = require('../controllers/livreController');
const { authenticateToken, isAdmin } = require('../../common/authMiddleware');

router.post('/', authenticateToken, isAdmin, livreController.ajouterLivre);
router.get('/', livreController.listerLivres);
router.get('/:id', livreController.getLivreById);
router.put('/:id', authenticateToken, isAdmin, livreController.modifierLivre);
router.delete('/:id', authenticateToken, isAdmin, livreController.supprimerLivre);

module.exports = router;
