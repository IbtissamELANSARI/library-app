const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key'; // Use environment variable in production!

// Mock user data (in a real app, this would come from a database)
const users = [
    { id: 1, username: 'user', password: 'password123', role: 'user' },
    { id: 2, username: 'admin', password: 'admin123', role: 'admin' }
];

// Simple function to generate a token (for testing purposes)
// In a real app, you'd have a dedicated /login endpoint
function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

// Example: generateToken(users[0]) or generateToken(users[1]) to get tokens for testing

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // If no token, unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // If token is not valid, forbidden
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden:Requires admin role' });
    }
}

function isUser(req, res, next) {
    if (req.user && (req.user.role === 'user' || req.user.role === 'admin')) { // Admins can also be users
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires authenticated user role' });
    }
}


module.exports = {
    authenticateToken,
    isAdmin,
    isUser,
    generateToken, // Export for testing token generation
    users // Export users for testing token generation
};
