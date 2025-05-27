const { sendMessage, connectRabbitMQ } = require('../common/rabbitmq_setup');
const EMPRUNT_CREATED_QUEUE = 'emprunt_created_queue';

async function publishEmpruntCreated(empruntData) {
    await sendMessage(EMPRUNT_CREATED_QUEUE, empruntData);
}

module.exports = {
    publishEmpruntCreated,
    initRabbitMQProducer: connectRabbitMQ
};
