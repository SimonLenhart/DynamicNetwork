/*eslint-env node*/

/**
UNDERLYING PROTOCOL IS A STRINGIFIED JSON FILE LIKE THE FOLLOWING EXAMPLE:
    {
        "type": "update",
        "time": "2015-04-19T09:51:26Z",
        "multiplier": 1.0,
        "shouldAnimate": true | false
    },
    {
        "type": "upload_notification",
        "filePath": string
    }
*/

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8081});

/** The list of active clients. */
const connections = [];

/** The list of loaded files. */
const files = [];

wss.on("connection", function connection(client) {
    // Add the client to the list of active connections.
    connections.push(client);
    console.log("Client connected,", connections.length, "active connections.");

    // Tell the new client what files have to be loaded.
    files.forEach(file => sendFilePath(client, file));

    // React on incomming messages.
    client.on("message", function incoming(messageText) {
        const message = JSON.parse(messageText);
        const receivers = connections.filter(ws => ws !== client);

        switch (message.type) {
            // Update animation state and time.
            case "update":
                broadcast(message, receivers);
                break;

            // A file is added to the data history.
            case "upload_notification":
                if (!files.includes(message.filePath)) {
                    files.push(message.filePath);
                    broadcast(message, receivers);
                } else {
                    console.log("file exists already:", message.filePath);
                }
                break;
        }
    });

    // Remove a client from the session.
    client.on("close", function close() {
        connections.splice(connections.indexOf(client), 1);
        console.log("Client disconnected,", connections.length, "clients left.");
    });
});

/**
 * Sends a message to the receiver that a file was uploaded to the given path.
 * @param {Websocket} receiver the receiver of the message
 * @param {string} filePath the filePath to load
 */
function sendFilePath(receiver, filePath) {
    const message = {
        type: "upload_notification",
        filePath: filePath
    };
    receiver.send(JSON.stringify(message));
}

/**
 * Sends a message to all active clients, except for the original sender.
 * @param {SyncMessage} message the message to send
 * @param {Array<Websocket>} receivers the receivers of the message
 */
function broadcast(message, receivers) {
    const text = JSON.stringify(message);
    receivers.forEach(ws => ws.send(text));
}
