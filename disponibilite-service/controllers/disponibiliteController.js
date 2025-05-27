let { livreDisponibilites } = require('../models/Disponibilite');
const { ensureBookDetails } = require('../rabbitmq_consumer'); // For ensuring book exists before patching

exports.listerDisponibilites = (req, res) => {
    const disponibilitesArray = Object.values(livreDisponibilites);
    res.status(200).json(disponibilitesArray);
};

exports.marquerStatutLivre = async (req, res) => {
    const { id } = req.params;
    let { statut } = req.body;

    // Ensure book details are known to this service if not already present
    // This helps if an admin tries to patch a status for a book ID not yet seen via events/init
    if (!livreDisponibilites[id]) {
        await ensureBookDetails(id); // Attempt to fetch if unknown
    }

    if (!livreDisponibilites[id] || livreDisponibilites[id].statut === 'unknown' || livreDisponibilites[id].statut === 'supprimé') {
        return res.status(404).json({ message: `Livre avec ID ${id} non suivi activement ou supprimé.` });
    }

    const allowedStatuses = ['disponible', 'emprunté', 'réservé', 'indisponible_maintenance'];
    if (!allowedStatuses.includes(statut)) {
        return res.status(400).json({ message: `Statut '${statut}' non valide pour une mise à jour manuelle.` });
    }

    // Note: 'retourné' is an event action, maps to 'disponible' state here.
    // This PATCH is for direct state setting by an admin.

    livreDisponibilites[id].statut = statut;
    console.log(`[Disponibilite Service] Book ${id} (${livreDisponibilites[id].titre}) status manually updated by admin to '${statut}'.`);
    res.status(200).json(livreDisponibilites[id]);
};
