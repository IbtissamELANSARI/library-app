const { consumeMessage, connectRabbitMQ } = require('../common/rabbitmq_setup');
const LIVRE_UPDATED_QUEUE = 'livre_updated_queue';
const { emprunts } = require('./models/Emprunt');

async function handleLivreUpdated(message) {
    console.log('[Emprunt Service] Received livre_updated message:', message);
    const { id: livreId, disponible, deleted, titre } = message;

    emprunts.forEach(emprunt => {
        if (emprunt.livreIds.includes(livreId) && emprunt.statut === 'en cours') {
            if (deleted) {
                console.warn(`[Emprunt Service] WARNING: Book ${livreId} (Titre: ${titre || 'N/A'}) in active loan ${emprunt.id} has been deleted by Livre Service.`);
                // Potentially update the loan status or add a note
                // emprunt.notes = emprunt.notes ? emprunt.notes + ... : ... ;
            } else if (disponible === false) {
                console.warn(`[Emprunt Service] WARNING: Book ${livreId} (Titre: ${titre || 'N/A'}) in active loan ${emprunt.id} is now marked as unavailable by Livre Service.`);
            }
            // Update book details if stored within the loan (e.g., title if it changed)
            if (emprunt.livresDetails) {
                const bookDetail = emprunt.livresDetails.find(b => b.id === livreId);
                if (bookDetail && titre && bookDetail.titre !== titre) {
                    console.log(`[Emprunt Service] Updating title for book ${livreId} in loan ${emprunt.id} to "${titre}".`);
                    bookDetail.titre = titre;
                }
            }
        }
    });
}

async function startListeningLivreUpdates() {
    // No need to call connectRabbitMQ() here if main server.js does it for the producer
    // and consumeMessage handles its own connection needs.
    // However, to ensure the consumer starts robustly:
    try {
        await connectRabbitMQ(); // Ensure connection is attempted at least once before setting up consumer
        await consumeMessage(LIVRE_UPDATED_QUEUE, handleLivreUpdated);
    } catch (error) {
        console.error("[Emprunt Service] Failed to start listening for livre updates initially:", error);
        // The consumeMessage function itself has a retry mechanism
    }
}

module.exports = {
    startListeningLivreUpdates
};
