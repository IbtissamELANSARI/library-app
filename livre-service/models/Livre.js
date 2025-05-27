// In-memory store for books
// In a real app, this would connect to a database (e.g., MongoDB, PostgreSQL)
let livres = [
    { id: "1", titre: "Le Seigneur des Anneaux", auteur: "J.R.R. Tolkien", annee: 1954, disponible: true },
    { id: "2", titre: "1984", auteur: "George Orwell", annee: 1949, disponible: true },
];

module.exports = {
    livres
};
