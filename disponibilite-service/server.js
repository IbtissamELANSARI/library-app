const express = require('express');
const disponibiliteRoutes = require('./routes/disponibiliteRoutes');
const { startConsumingMessages } = require('./rabbitmq_consumer');

const app = express();
const PORT = process.env.DISPONIBILITE_SERVICE_PORT || 3003;

app.use(express.json());
app.use('/disponibilites', disponibiliteRoutes);

async function startServer() {
    try {
        await startConsumingMessages();
        app.listen(PORT, () => {
            console.log(`Disponibilité Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start Disponibilité Service:", error);
        process.exit(1);
    }
}

startServer();
