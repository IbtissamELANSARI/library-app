# Library Management System

This is a microservices-based library management system consisting of multiple services for handling books, loans, and availability status.

## Project Structure
```
library-app/
├── api-gateway/
│   ├── server.js
│   └── package.json
├── livre-service/                 # Book Service
│   ├── controllers/
│   │   └── livreController.js
│   ├── models/
│   │   └── Livre.js
│   ├── routes/
│   │   └── livreRoutes.js
│   ├── rabbitmq_producer.js
│   ├── server.js
│   └── package.json
├── emprunt-service/               # Loan Service
│   ├── controllers/
│   │   └── empruntController.js
│   ├── models/
│   │   └── Emprunt.js
│   ├── routes/
│   │   └── empruntRoutes.js
│   ├── rabbitmq_consumer.js
│   ├── rabbitmq_producer.js
│   ├── server.js
│   └── package.json
├── disponibilite-service/         # Availability Service
│   ├── controllers/
│   │   └── disponibiliteController.js
│   ├── models/
│   │   └── Disponibilite.js
│   ├── routes/
│   │   └── disponibiliteRoutes.js
│   ├── rabbitmq_consumer.js
│   ├── server.js
│   └── package.json
└── common/
    ├── authMiddleware.js
    └── rabbitmq_setup.js
```

## Prerequisites

- Node.js
- Docker
- RabbitMQ

## Setup Instructions

### 1. Start RabbitMQ Server

Run the following Docker command to start RabbitMQ:

```bash
docker run -d --hostname my-rabbit --name some-rabbit -p 15672:15672 -p 5672:5672 rabbitmq:3-management
```

### 2. Install Dependencies

Navigate to each service directory and install dependencies:

```bash
cd library-app/livre-service && npm install
cd library-app/emprunt-service && npm install
cd library-app/disponibilite-service && npm install
cd library-app/api-gateway && npm install
```

### 3. Configuration (Optional)

Set environment variables if you need different values from defaults:
- `PORT`
- `JWT_SECRET`
- `RABBITMQ_URL`

### 4. Start Services

Start each service in a separate terminal:

```bash
# In livre-service directory
npm start

# In emprunt-service directory
npm start

# In disponibilite-service directory
npm start

# In api-gateway directory
npm start
```

### 5. Testing

Access the API through the API Gateway:
- Default URL: `http://localhost:3000/api/`

## Services

- Livre Service: Book management
- Emprunt Service: Loan management
- Disponibilite Service: Availability tracking
- API Gateway: Central access point for all services