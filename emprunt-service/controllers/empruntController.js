const { v4: uuidv4 } = require('uuid');
let { emprunts } = require('../models/Emprunt');
const { publishEmpruntCreated } = require('../rabbitmq_producer');
const axios = require('axios');

const LIVRE_SERVICE_URL = process.env.LIVRE_SERVICE_URL || 'http://localhost:3001/livres';

exports.creerEmprunt = async (req, res) => {
    const { livreIds } = req.body;
    const authenticatedUserId = req.user.id;

    if (!livreIds || !Array.isArray(livreIds) || livreIds.length === 0) {
        return res.status(400).json({ message: "livreIds (array) is required" });
    }

    try {
        let booksDetails = [];
        for (const livreId of livreIds) {
            try {
                const response = await axios.get(`${LIVRE_SERVICE_URL}/${livreId}`);
                const livre = response.data;
                if (!livre.disponible) {
                    return res.status(400).json({ message: `Livre ${livre.titre} (ID: ${livreId}) n'est pas disponible pour emprunt.` });
                }
                booksDetails.push(livre);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                     return res.status(404).json({ message: `Livre avec ID ${livreId} non trouvé.` });
                }
                console.error(`Error fetching book ${livreId}:`, error.message);
                return res.status(500).json({ message: `Erreur lors de la vérification du livre ${livreId}.` });
            }
        }

        const dateEmprunt = new Date();
        const dateRetourPrevu = new Date(dateEmprunt);
        dateRetourPrevu.setDate(dateEmprunt.getDate() + 14);

        const nouvelEmprunt = {
            id: uuidv4(),
            userId: authenticatedUserId,
            livreIds,
            livresDetails: booksDetails.map(b => ({id: b.id, titre: b.titre })),
            dateEmprunt: dateEmprunt.toISOString(),
            dateRetourPrevu: dateRetourPrevu.toISOString(),
            statut: 'en cours'
        };
        emprunts.push(nouvelEmprunt);

        await publishEmpruntCreated({
            empruntId: nouvelEmprunt.id,
            livreIds: nouvelEmprunt.livreIds,
            userId: nouvelEmprunt.userId,
            statutMessage: 'emprunté' // Differentiate from loan status for clarity for consumer
        });

        res.status(201).json(nouvelEmprunt);
    } catch (error) {
        console.error("Error creating emprunt:", error);
        res.status(500).json({ message: "Internal server error creating emprunt" });
    }
};

exports.consulterEmprunt = (req, res) => {
    const { id } = req.params;
    const emprunt = emprunts.find(e => e.id === id);
    if (!emprunt) {
        return res.status(404).json({ message: "Emprunt non trouvé" });
    }
    if (req.user.role !== 'admin' && String(req.user.id) !== String(emprunt.userId)) {
        return res.status(403).json({ message: "Forbidden: You can only view your own emprunts." });
    }
    res.status(200).json(emprunt);
};

exports.mettreAJourStatutEmprunt = async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;
    const empruntIndex = emprunts.findIndex(e => e.id === id);

    if (empruntIndex === -1) {
        return res.status(404).json({ message: "Emprunt non trouvé" });
    }
    const emprunt = emprunts[empruntIndex];

    if (req.user.role !== 'admin' && String(req.user.id) !== String(emprunt.userId)) {
         return res.status(403).json({ message: "Forbidden: You cannot update this emprunt." });
    }
    // More granular control: only admin can set 'en retard'
    if (statut === 'en retard' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only admins can mark an emprunt as 'en retard'." });
    }


    const oldStatut = emprunt.statut;
    emprunt.statut = statut;

    if (statut === 'retourné' && oldStatut !== 'retourné') {
        await publishEmpruntCreated({
            empruntId: id,
            livreIds: emprunt.livreIds,
            userId: emprunt.userId,
            statutMessage: 'retourné'
        });
    }
    res.status(200).json(emprunt);
};
