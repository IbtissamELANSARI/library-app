const { consumeMessage, connectRabbitMQ } = require('../common/rabbitmq_setup');
let { livreDisponibilites } = require('./models/Disponibilite'); // Use let for reassignment if needed, though direct mutation is common
const axios = require('axios');

const EMPRUNT_CREATED_QUEUE = 'emprunt_created_queue';
const LIVRE_UPDATED_QUEUE = 'livre_updated_queue';

const LIVRE_SERVICE_URL = process.env.LIVRE_SERVICE_URL || 'http://localhost:3001/livres';

async function ensureBookDetails(livreId) {
    if (!livreDisponibilites[livreId] || !livreDisponibilites[livreId].titre) {
        try {
            console.log(`[Disponibilite Service] Ensuring details for book ${livreId}...`);
            const response = await axios.get(`${LIVRE_SERVICE_URL}/${livreId}`);
            const book = response.data;
            livreDisponibilites[livreId] = {
                ...livreDisponibilites[livreId],
                id: book.id,
                titre: book.titre,
                statut: livreDisponibilites[livreId]?.statut || (book.disponible ? 'disponible' : 'indisponible_source')
            };
            console.log(`[Disponibilite Service] Fetched and stored details for book ${livreId}: ${book.titre}`);
        } catch (error) {
            console.error(`[Disponibilite Service] Failed to fetch details for book ${livreId}:`, error.message);
            if (!livreDisponibilites[livreId]) {
                 livreDisponibilites[livreId] = { id: livreId, titre: `Unknown (ID: ${livreId})`, statut: 'unknown' };
            }
        }
    }
}

async function handleEmpruntEvent(message) { // Renamed to be more generic
    console.log('[Disponibilite Service] Received emprunt event:', message);
    const { livreIds, statutMessage } = message; // 'emprunté' or 'retourné'

    for (const livreId of livreIds) {
        await ensureBookDetails(livreId);

        if (livreDisponibilites[livreId]) {
            if (statutMessage === 'emprunté') {
                livreDisponibilites[livreId].statut = 'emprunté';
                console.log(`[Disponibilite Service] Book ${livreId} (${livreDisponibilites[livreId].titre}) marked as 'emprunté'.`);
            } else if (statutMessage === 'retourné') {
                livreDisponibilites[livreId].statut = 'disponible'; // Assuming it's not 'indisponible_source'
                // If it was 'indisponible_source', it means the book itself is an issue, return doesn't make it available.
                // This logic might need refinement based on desired precedence.
                console.log(`[Disponibilite Service] Book ${livreId} (${livreDisponibilites[livreId].titre}) marked as 'disponible' after return.`);
            }
        } else {
            console.warn(`[Disponibilite Service] Book ${livreId} not found in local store while processing emprunt event.`);
        }
    }
}

async function handleLivreUpdated(message) {
    console.log('[Disponibilite Service] Received livre_updated message:', message);
    const { id: livreId, titre, auteur, annee, disponible, deleted } = message;

    if (deleted) {
        if (livreDisponibilites[livreId]) {
            livreDisponibilites[livreId].statut = 'supprimé';
            livreDisponibilites[livreId].titre = titre || livreDisponibilites[livreId].titre;
            console.log(`[Disponibilite Service] Book ${livreId} (${livreDisponibilites[livreId].titre}) marked as 'supprimé'.`);
        }
        return;
    }

    const currentEntry = livreDisponibilites[livreId];
    if (!currentEntry) {
        livreDisponibilites[livreId] = { id: livreId, titre, statut: disponible ? 'disponible' : 'indisponible_source' };
        console.log(`[Disponibilite Service] New book ${livreId} (${titre}) added/updated. Status: ${livreDisponibilites[livreId].statut}.`);
    } else {
        currentEntry.titre = titre || currentEntry.titre;
        // Availability from LivreService (e.g. damaged book) should take precedence over 'emprunté' or 'réservé' in some cases.
        // If LivreService says "disponible: false", it means the book is fundamentally unavailable.
        if (disponible === false) {
            currentEntry.statut = 'indisponible_source';
            console.log(`[Disponibilite Service] Book ${livreId} (${currentEntry.titre}) marked as 'indisponible_source'.`);
        } else if (disponible === true && currentEntry.statut === 'indisponible_source') {
            // If it was unavailable from source, and now it's available again AND not currently borrowed/reserved.
            currentEntry.statut = 'disponible';
            console.log(`[Disponibilite Service] Book ${livreId} (${currentEntry.titre}) marked as 'disponible' (was 'indisponible_source').`);
        } else if (disponible === true && (currentEntry.statut !== 'emprunté' && currentEntry.statut !== 'réservé')) {
            // If book is available from source and not currently borrowed/reserved, ensure it's marked as disponible
             currentEntry.statut = 'disponible';
        }
        // If 'disponible' is true, but the book is 'emprunté' or 'réservé', its status remains as is.
        // The 'emprunté' status is managed by emprunt events.
        console.log(`[Disponibilite Service] Book ${livreId} (${currentEntry.titre}) updated. Current status: ${currentEntry.statut}.`);
    }
}

async function initializeDisponibilites() {
    try {
        console.log('[Disponibilite Service] Initializing book list from Livre Service...');
        // Use the '?all=true' query parameter we added in Livre service
        const response = await axios.get(`${LIVRE_SERVICE_URL}?all=true`);
        const allLivresFromSource = response.data;

        allLivresFromSource.forEach(livre => {
            if (!livreDisponibilites[livre.id]) {
                livreDisponibilites[livre.id] = {
                    id: livre.id,
                    titre: livre.titre,
                    statut: livre.disponible ? 'disponible' : 'indisponible_source'
                };
            } else { // Update existing entry's title if needed, but preserve current status if already set by events
                livreDisponibilites[livre.id].titre = livre.titre;
                // Don't override a status like 'emprunté' with 'disponible' from initial load
                if (livre.disponible && livreDisponibilites[livre.id].statut === 'indisponible_source') {
                    livreDisponibilites[livre.id].statut = 'disponible';
                } else if (!livre.disponible) {
                     livreDisponibilites[livre.id].statut = 'indisponible_source';
                }
            }
        });
        console.log('[Disponibilite Service] Initial book list synchronized/updated. Current count:', Object.keys(livreDisponibilites).length);
    } catch (error) {
        console.error('[Disponibilite Service] Failed to initialize book list from Livre Service:', error.message);
    }
}

async function startConsumingMessages() {
    try {
        await connectRabbitMQ(); // Ensure connection before initializing and consuming
        await initializeDisponibilites(); // Attempt to populate initial state
        await consumeMessage(EMPRUNT_CREATED_QUEUE, handleEmpruntEvent);
        await consumeMessage(LIVRE_UPDATED_QUEUE, handleLivreUpdated);
    } catch (error) {
        console.error("[Disponibilite Service] Failed to start consuming messages initially:", error);
        // consumeMessage has its own retry, but this catches errors from connectRabbitMQ or initializeDisponibilites
    }
}

module.exports = {
    startConsumingMessages,
    ensureBookDetails // Export for controller if needed, though PATCH should ideally just update
};
