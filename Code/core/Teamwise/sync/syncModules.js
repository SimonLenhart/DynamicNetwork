import { loadKmlFile } from "../mainCore.js";

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


let ws;


/**
 * Uploads the given file on the server to share it with the slaves.
 * @param {File} file the file to upload
 * @returns {Promise<string>} the path to the file on the server
 */
function uploadFile(file) {
    const fileData = new FormData();
    fileData.append("file", file);

    return new Promise((resolve, reject) => {
        $.ajax("/tmp", {
            method: "PUT",
            data: fileData,
            cache: false,
            contentType: false,
            processData: false,
            error: req => reject(new Error(req.responseText)),
            success: path => resolve(path)
        });
    });
}

/**
 * Sends the given filepAth to the websocket as an `upload notification`.
 * @param {string} filePath the file path to send
 */
function sendFilePath(filePath) {
    const message = JSON.stringify({
        type: "upload_notification",
        filePath: filePath
    });

    ws.send(message);
}

/**
 * Uploads the given file to the server and sends a message with the path to it
 * to the websocket.
 * @param {File} file the file that was loaded
 */
async function uploadAndSendFile(file) {
    try {
        const filePath = await uploadFile(file);
        sendFilePath(filePath);
    } catch (error) {
        console.warn("Could not upload file.\n", error.message);
    }
}

/**
 * This function initialises the synchronisation mode. It creates the client-side websocket and registers the necessary event listeners.
 * @param {Cesium.Viewer} viewer The viewer.
 * @param {Object} config The config object.
 * @param {string} mode The synchronisation role of the current browser window.
 */
function initSync(viewer, config, mode) {
    // Basic mode has no synchronisation, so no websocket is created.
    if (!mode || mode === "basic") {
        return;
    }

    /*
    |   - Establish connection to WebSocket server
    |   - Register the necessary listeners/observers
    */
    ws = new WebSocket("ws://" + config.ip + ":" + config.wsPort);
    ws.onmessage = handleMessage;

    if (mode === "master") {
        // The timeline observation relies on the assumption that the standard cesium callback that updates the currentTime
        // is executed before our callback function.
        viewer.timeline.addEventListener("settime", collectAndBroadcast, false);
        Cesium.knockout.getObservable(viewer.animation.viewModel.clockViewModel, "shouldAnimate").subscribe(collectAndBroadcast);
        Cesium.knockout.getObservable(viewer.animation.viewModel.clockViewModel, "multiplier").subscribe(collectAndBroadcast);
        setInterval(collectAndBroadcast, 2000);
    }

    /**
     * This function collects the current state of all the synchronised information (e.g. multiplier, time, ...)
     * and then sends it to the websocket server that will then distribute it.
     */
    function collectAndBroadcast() {
        const msgObj = {};
        msgObj.type = "update";
        msgObj.time = Cesium.JulianDate.toIso8601(viewer.clock.currentTime);
        msgObj.multiplier = viewer.clock.multiplier;
        msgObj.shouldAnimate = viewer.clock.shouldAnimate;
        ws.send(JSON.stringify(msgObj));
    }

    /**
     * This function is called when the current browser window receives a message from the websocket server.
     * The message is parsed and then accordingly reacted.
     * @param {string} msg The message that has been received from the websocket server.
     */
    function handleMessage(msg) {
        msg = JSON.parse(msg.data);
        switch (msg.type) {
            case "update":
                update(msg);
                break;

            case "upload_notification":
                loadKmlFile(msg.filePath);
                break;
        }
    }

    /**
     * This function reads all of the synchronised information from the message and updates the local state accordingly.
     * @param {Object} message The parsed JSON-message from the websocket server.
     */
    function update(message) {
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(message.time);
        viewer.clock.multiplier = message.multiplier;
        viewer.clock.shouldAnimate = message.shouldAnimate;
    }
}


export {
    initSync,
    uploadAndSendFile
};
