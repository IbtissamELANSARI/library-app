const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let connection = null;
let channel = null;

async function connectRabbitMQ() {
    if (channel && connection) return { connection, channel }; // Return existing if already connected
    try {
        console.log(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}...`);
        connection = await amqp.connect(RABBITMQ_URL);
        connection.on('error', (err) => {
            console.error('RabbitMQ Connection Error:', err.message);
            channel = null; // Reset channel on connection error
            connection = null;
            // Consider attempting to reconnect here or in dependent functions
        });
        connection.on('close', () => {
            console.warn('RabbitMQ connection closed. Attempting to reconnect...');
            channel = null;
            connection = null;
            // Optionally implement a retry mechanism here
        });
        channel = await connection.createChannel();
        channel.on('error', (err) => {
            console.error('RabbitMQ Channel Error:', err.message);
            channel = null; // Reset channel on error
        });
        console.log('Successfully connected to RabbitMQ and channel created.');
        return { connection, channel };
    } catch (error) {
        console.error('Failed to connect to RabbitMQ initially:', error);
        channel = null;
        connection = null;
        // Implement retry logic or allow failure to propagate
        // For script simplicity, we might not have robust retries here
        // but in a real app, this is crucial.
        throw error; // Rethrow to indicate failure to connect
    }
}

async function getChannel() {
    if (!channel || !connection || connection.connection === null) { // check if connection is actually open
        console.log('No active RabbitMQ channel or connection. Attempting to (re)connect...');
        await connectRabbitMQ();
    }
    return channel;
}


async function sendMessage(queueName, message) {
    try {
        const currentChannel = await getChannel();
        if (!currentChannel) {
            console.error(`Cannot send message to ${queueName}: RabbitMQ channel not available.`);
            return;
        }
        await currentChannel.assertQueue(queueName, { durable: true });
        currentChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`Sent message to ${queueName}:`, message);
    } catch (error) {
        console.error(`Error sending message to ${queueName}:`, error);
        // Potentially re-throw or handle, maybe try to reconnect and resend once.
    }
}

async function consumeMessage(queueName, callback) {
    try {
        const currentChannel = await getChannel();
         if (!currentChannel) {
            console.error(`Cannot consume message from ${queueName}: RabbitMQ channel not available. Will retry...`);
            // Simple retry mechanism for consumer setup
            setTimeout(() => consumeMessage(queueName, callback), 5000);
            return;
        }
        await currentChannel.assertQueue(queueName, { durable: true });
        console.log(`Waiting for messages in ${queueName}.`);
        currentChannel.consume(queueName, (msg) => {
            if (msg !== null) {
                try {
                    const messageContent = JSON.parse(msg.content.toString());
                    callback(messageContent); // Process the message
                    currentChannel.ack(msg); // Acknowledge after successful processing
                } catch (parseError) {
                    console.error('Error parsing message or in callback:', parseError);
                    // Decide whether to nack and requeue, or nack and discard
                    currentChannel.nack(msg, false, false); // Message won't be requeued for parsing error
                }
            }
        }, { noAck: false }); // Ensure manual acknowledgement
    } catch (error) {
        console.error(`Error consuming messages from ${queueName}:`, error);
        // Consider retrying consumer setup if critical
        console.log(`Retrying consumer setup for ${queueName} in 5 seconds...`);
        setTimeout(() => consumeMessage(queueName, callback), 5000);
    }
}

module.exports = {
    connectRabbitMQ, // expose connect if services want to manage connection state more directly
    sendMessage,
    consumeMessage,
    getChannel // Expose getChannel for more advanced scenarios if needed
};
