const { sendMessage, connectRabbitMQ } = require('../common/rabbitmq_setup');
const LIVRE_UPDATED_QUEUE = 'livre_updated_queue';

async function publishLivreUpdated(livreData) {
    await sendMessage(LIVRE_UPDATED_QUEUE, livreData);
}

module.exports = {
    publishLivreUpdated,
    initRabbitMQ: connectRabbitMQ // To ensure connection is established on service start
};
