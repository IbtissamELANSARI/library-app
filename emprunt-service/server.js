const express = require('express');
const empruntRoutes = require('./routes/empruntRoutes');
const { initRabbitMQProducer } = require('./rabbitmq_producer');
const { startListeningLivreUpdates } = require('./rabbitmq_consumer');

const app = express();
const PORT = process.env.EMPRUNT_SERVICE_PORT || 3002;

app.use(express.json());
app.use('/emprunts', empruntRoutes);

async function startServer() {
    try {
        await initRabbitMQProducer(); // Connect for publishing
        await startListeningLivreUpdates(); // Start listening for livre_updated messages
        app.listen(PORT, () => {
            console.log(`Emprunt Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start Emprunt Service:", error);
        process.exit(1);
    }
}

startServer();
