const express = require('express');
const proxy = require('express-http-proxy');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

const LIVRE_SERVICE_URL = process.env.LIVRE_SERVICE_URL || 'http://localhost:3001';
const EMPRUNT_SERVICE_URL = process.env.EMPRUNT_SERVICE_URL || 'http://localhost:3002';
const DISPONIBILITE_SERVICE_URL = process.env.DISPONIBILITE_SERVICE_URL || 'http://localhost:3003';

app.use(express.json());

app.use((req, res, next) => {
    console.log(`[API Gateway] Incoming Request: ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
});

app.use('/api/livres', proxy(LIVRE_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/livres${req.url}`
}));

app.use('/api/emprunts', proxy(EMPRUNT_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/emprunts${req.url}`
}));

app.use('/api/disponibilites', proxy(DISPONIBILITE_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/disponibilites${req.url}`
}));

// Proxy token generation routes (assuming they are on Livre service)
app.use('/get-admin-token', proxy(LIVRE_SERVICE_URL, {
     proxyReqPathResolver: () => '/get-admin-token'
}));
app.use('/get-user-token', proxy(LIVRE_SERVICE_URL, {
     proxyReqPathResolver: () => '/get-user-token'
}));

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Proxying /api/livres to ${LIVRE_SERVICE_URL}`);
    console.log(`Proxying /api/emprunts to ${EMPRUNT_SERVICE_URL}`);
    console.log(`Proxying /api/disponibilites to ${DISPONIBILITE_SERVICE_URL}`);
    console.log("---");
    console.log("Test Token Generation (via Gateway from Livre service):");
    console.log(`Admin Token: GET http://localhost:${PORT}/get-admin-token`);
    console.log(`User Token: GET http://localhost:${PORT}/get-user-token`);
});
