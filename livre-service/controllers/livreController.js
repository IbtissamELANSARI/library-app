const { v4: uuidv4 } = require('uuid');
let { livres } = require('../models/Livre'); // Note: 'livres' is mutable here
const { publishLivreUpdated } = require('../rabbitmq_producer');

exports.ajouterLivre = async (req, res) => {
    const { titre, auteur, annee } = req.body;
    if (!titre || !auteur || !annee) {
        return res.status(400).json({ message: "Titre, auteur, et annee are required" });
    }
    const nouveauLivre = { id: uuidv4(), titre, auteur, annee: parseInt(annee), disponible: true };
    livres.push(nouveauLivre);
    // No RabbitMQ message on creation as per spec, only on update.
    res.status(201).json(nouveauLivre);
};

exports.listerLivres = (req, res) => {
    const all = req.query.all === 'true'; // For Disponibilite service initialization
    if (all) {
        res.status(200).json(livres);
    } else {
        res.status(200).json(livres.filter(l => l.disponible)); // Only available books for public listing
    }
};

exports.modifierLivre = async (req, res) => {
    const { id } = req.params;
    const { titre, auteur, annee, disponible } = req.body;
    const livreIndex = livres.findIndex(l => l.id === id);

    if (livreIndex === -1) {
        return res.status(404).json({ message: "Livre non trouvé" });
    }

    livres[livreIndex] = {
        ...livres[livreIndex],
        titre: titre !== undefined ? titre : livres[livreIndex].titre,
        auteur: auteur !== undefined ? auteur : livres[livreIndex].auteur,
        annee: annee !== undefined ? parseInt(annee) : livres[livreIndex].annee,
        disponible: disponible !== undefined ? disponible : livres[livreIndex].disponible,
    };

    const livreModifie = livres[livreIndex];
    await publishLivreUpdated({
        id: livreModifie.id,
        titre: livreModifie.titre,
        auteur: livreModifie.auteur,
        annee: livreModifie.annee,
        disponible: livreModifie.disponible,
    });

    res.status(200).json(livreModifie);
};

exports.supprimerLivre = async (req, res) => {
    const { id } = req.params;
    const livreIndex = livres.findIndex(l => l.id === id);

    if (livreIndex === -1) {
        return res.status(404).json({ message: "Livre non trouvé" });
    }

    const livreSupprime = livres[livreIndex];
    livres.splice(livreIndex, 1);

    await publishLivreUpdated({
        id: livreSupprime.id,
        deleted: true,
        disponible: false
    });

    res.status(200).json({ message: "Livre supprimé avec succès" });
};

exports.getLivreById = (req, res) => {
    const { id } = req.params;
    const livre = livres.find(l => l.id === id);
    if (!livre) {
        return res.status(404).json({ message: "Livre non trouvé" });
    }
    res.status(200).json(livre);
};

module.exports.updateLivreAvailability = (livreId, isDisponible) => {
    const livreIndex = livres.findIndex(l => l.id === livreId);
    if (livreIndex !== -1) {
        livres[livreIndex].disponible = isDisponible;
        console.log(`Livre service updated availability for ${livreId} to ${isDisponible}`);
    }
};
