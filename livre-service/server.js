const express = require('express');
const livreRoutes = require('./routes/livreRoutes');
const { initRabbitMQ } = require('./rabbitmq_producer');
const { generateToken, users } = require('../common/authMiddleware');

const app = express();
const PORT = process.env.LIVRE_SERVICE_PORT || 3001;

app.use(express.json());

app.get('/get-admin-token', (req, res) => {
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) return res.status(404).json({ message: "Admin user not found for token generation."});
    res.json({ token: generateToken(adminUser) })
});
app.get('/get-user-token', (req, res) => {
    const regularUser = users.find(u => u.role === 'user');
    if (!regularUser) return res.status(404).json({ message: "Regular user not found for token generation."});
    res.json({ token: generateToken(regularUser) })
});

app.use('/livres', livreRoutes);

async function startServer() {
    try {
        await initRabbitMQ();
        app.listen(PORT, () => {
            console.log(`Livre Service running on port ${PORT}`);
            console.log(`Admin Token Generation: GET http://localhost:${PORT}/get-admin-token`);
            console.log(`User Token Generation: GET http://localhost:${PORT}/get-user-token`);
        });
    } catch (error) {
        console.error("Failed to start Livre Service:", error);
        process.exit(1);
    }
}

startServer();
