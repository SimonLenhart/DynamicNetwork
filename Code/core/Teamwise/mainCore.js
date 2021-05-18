import {initSync} from "./sync/syncModules.js";
import {startupHandler, onEntityChanged, onTimeChanged, onDataSourceChanged} from "./handlers.js";
import {addDataSourceOption, getInterpolationOptions} from "./menu.js";

/** The reference to the bird model. */
const modelURI = "/Teamwise/models/storch_model_2017__1_7lq90.glb";

/** Will hold environment variables like keys, IP address, etc. */
const CONFIG = {};

/** The Cesium instance. To be initialized in the startup function. */
let viewer;

const systemState = {
    cameraAttachedToEntity : false,
    cameraOrientationAttachedToEntity : false,
    gamePadActivated : false,
    cameraTrackedEntity : undefined
};

// Activate the handlers on their respective action.
startupHandler.addAfterStartup(viewer => {
    // Add the handler for switching between data sources.
    const dsCollection = viewer.dataSources;
    dsCollection.dataSourceMoved.addEventListener((dataSource, index) => {
        // Only watch datasources moved to bottom (which means "switch to").
        if (index === 0) {
            onDataSourceChanged.run(dataSource, viewer);
        }
    });
    dsCollection.dataSourceAdded.addEventListener((collection, dataSource) => {
        // If the data source was not added first, its index must be set to 0.
        if (collection.indexOf(dataSource) === 0) {
            // Data source is added on index 0, so `moved` event won't trigger.
            onDataSourceChanged.run(dataSource, viewer);
        } else {
            // Moving the data source will trigger the event.
            viewer.dataSources.lowerToBottom(dataSource);
        }
    });

    // Add the handler for switching the selected entity.
    viewer.selectedEntityChanged.addEventListener(entity =>
        onEntityChanged.run(entity, viewer)
    );

    // Add the handler for changes in time.
    // (Whether the time changes is checked on every tick).
    viewer.clock.onTick.addEventListener(clock =>
        onTimeChanged.run(clock.currentTime, viewer)
    );
});

// Load the config file from the server.
startupHandler.addBeforeStartup(new Promise(resolve => {
    $.getJSON("/Teamwise/config.json", data => {
        // Copy entries of the loaded config into the CONFIG object.
        // Note: No simple assignment to keep the object `const`.
        for (const prop in data) {
            CONFIG[prop] = data[prop];
        }
        resolve();
    });
}));


// Add the basic behaviour to switching data sources (adjust clock, fly to new).
onDataSourceChanged.add((newDataSource, _oldDataSource, viewer) => {
    // Deselect any entity from the old dataset.
    viewer.selectedEntity = undefined;

    if (newDataSource) {
        // Stop the clock (if it was running before).
        viewer.clock.shouldAnimate = false;

        // Adjust the clock to fit the data source and fly to the entities.
        viewer.clockTrackedDataSource = newDataSource;
        viewer.flyTo(newDataSource);

        // If we want to hide data that is not in the focus.
    //     newDataSource.show = true;
    // }
    // if (oldDataSource) {
    //     oldDataSource.show = false;
    }
});


/**
 * Creates an html text that is shown in the info box of the selected entity.
 * @param {Cesium.Entity} data the entity to create the description for
 * @returns {string} the description
 */
function createDescriptionString(data) {
    let descriptionString = "Bird" + " Information:" +
        '<div style="text-align:left; padding:5px">' + "</div>";

    // [SE] I reswitched id and name, errors from files should be handled there.
    descriptionString += "Bird ID: " + data.id + "<br/>"; //'<div style="text-align:center; padding:15px">Zoom to all</div>';
    descriptionString += "Bird Name: " + data.name + "<br/>";
    const resStart = data.position.getValue(data.availability.start);
    const resStop = data.position.getValue(data.availability.stop);

    // Get start and end altitude
    const startAlt = Cesium.Cartographic.fromCartesian(resStart).height;
    const stopAlt = Cesium.Cartographic.fromCartesian(resStop).height;
    const altGain = stopAlt - startAlt;
    descriptionString += "  Altitude gain: " + altGain + "<br/>" +
    '<div style="text-align:left; padding:5px">' + "</div>";

    return descriptionString;
}

/**
 * Returns an html string that shows a qr code to connect to the server.
 * @param {string} ip the ip to the server
 * @returns {string} the html image with the code
 */
function createQrCode(ip) {
    const qrString = "http%3A%2F%2F" + ip + "%3A8080%2FTeamwise%2Fmain.html%3Fmode%3Dvr";
    return '<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' +
        qrString + '" alt="QR" height="128" width="128"><br/>';
}

/**
 * Initializes a created dataSource by adding it to the viewer and adjusts some
 * of the entity properties:
 * - adding the bird model (currently always a stork)
 * - adjusting position interpolation options
 * - adding the info box description
 * @param {Promise<Cesium.DataSource>} dataSource the data source in creation
 * @param {string} modelPath the path to the bird model to use
 */
async function initEntities(dataSource, modelPath) {
    // Add the data source to the viewer and wait until it is ready.
    dataSource = await viewer.dataSources.add(dataSource); //birds2 bird70 2014-08-07-70.kml

    const entities = dataSource.entities;

    // Get the current setting (linear / polynomal) from the menu.
    const interpolationOptions = getInterpolationOptions();

    for (const [index, animal] of entities.values.entries()) {
        animal.model = new Cesium.ModelGraphics({
            uri: modelPath,
            minimumPixelSize: 32,
            color: Cesium.Color.CORNSILK,
            colorBlendMode: Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.6,
            HeightReference: Cesium.HeightReference.NONE,
        });
        animal.orientation = new Cesium.VelocityOrientationProperty(animal.position);
        animal.position.setInterpolationOptions(interpolationOptions);
        animal.description = createDescriptionString(animal);
        animal.addProperty("myIndex");
        animal.myIndex = index;

        const minutesPerDay = 24 * 60;
        animal.path.trailTime = minutesPerDay * 60;
        animal.path.resolution = Math.min(
            animal.path.trailTime,
            Cesium.JulianDate.secondsDifference(
                animal.availability.stop,
                animal.availability.start
            )
        ) / minutesPerDay;
    }

    // Add an entry for the selection of loaded data in the user interface.
    addDataSourceOption(dataSource.name, entities.id);
}

/**
 * Starts the Teamwise application.
 *
 * Initialization that has to be done before Cesium is started or needs the
 * viewer must be added to the `startupHandler`.
 */
function startup() {
    "use strict";

    // Decide in which sync mode the application should run.
    // The mode is given as a url encoded option "mode" when calling the page.
    const url = new URL(window.location.href);
    let mode = url.searchParams.get("mode");

    // Shortcuts are allowed, all other (invalid) input defaults to "basic".
    if (mode === "master" || mode === "m") {
        mode = "master";
    } else if (mode === "slave" || mode === "s") {
        mode = "slave";
    } else if (mode === "vr") {
        mode = "vr";
    } else {
        mode = "basic";
    }

    // After all tasks are complete, Cesium can be started.
    startupHandler.tasksFinished().then(() => {
        // Use the Ion key that was loaded from the config file, if supplied.
        if (CONFIG.ionKey) {
            Cesium.Ion.defaultAccessToken = CONFIG.ionKey;
        } else {
            alert("Please specify a Cesium ion access token. You can do so either by" +
                " navigating to Menu > Settings > General and type it into the form - or by" +
                " directly placing it in the config.json file that is located in" +
                " core/Teamwise/config.json.");
        }

        /*eslint-disable-next-line no-global-assign*/
        viewer = createViewer(mode);

        // DEBUG ONLY, allows accessing the visualization from the console.
        window.viewer = viewer;

        // Make terrain see-through, we can't deal with "under ground" data yet.
        viewer.scene.globe.depthTestAgainstTerrain = false;
        // Let the viewer adapt to the browser size (needed for 4K resolution).
        viewer.resolutionScale = window.devicePixelRatio;

        /* TODO debug only */
        viewer.scene.debugShowFramesPerSecond = true;

        // Initialize websocket connections.
        initSync(viewer, CONFIG, mode);

        // Show the qr code to the session in the menu.
        $("#qrCodePosition").html(createQrCode(CONFIG.ip));

        // Hide the loading panel for slaves.
        // if (mode === "slave" || mode === "vr") {
        //     $("#navbar")
        //         .children("a")
        //         .filter((_i, e) => e.name === "loadPanel")
        //         .hide();
        // }

        // Execute the registered initialization tasks.
        startupHandler.afterViewerInit(viewer, mode);
    });
}

/**
 * Creates an appropriate Cesium instance for this application.
 * The appearance depends on the mode Teamwise is running in:
 * - `"basic"` (no synchronisation)
 * - `"master"` (synchronized, control)
 * - `"slave"` (synchronized, no control)
 * - `"vr"` (like slave but can switch to stereoscopic 3D)
 * @param {string} mode the mode in which the session is running
 * @returns {Cesium.Viewer} the created viewer
 */
function createViewer(mode) {
    return new Cesium.Viewer("cesiumContainer", {
        // Was deactivated because of own imagery provider in older versions.
        baseLayerPicker: true,

        // Creates the terrain, with Cesium / Ion default terrain data.
        terrainProvider: Cesium.createWorldTerrain(),

        vrButton: mode === "vr",
        selectionIndicator: mode !== "vr",
        infoBox: mode !== "vr",
        homeButton: mode !== "vr",

        // Stop the browser from rendering if the app is idling.
        requestRenderMode: true,

        // Whether the clock widget is shown, slaves should have no control.
        animation: mode !== "slave" && mode !== "vr"
    });
}

/**
 * Creates a data source from the specified KML file.
 * @param {string | File} file the file or the path to the file to load
 */
async function loadKmlFile(file) {
    if (!file) {
        console.warn("No file selected.");
        return;
    }

    const options = {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas
    };

    const dataSource = await Cesium.KmlDataSource.load(file, options);

    // The name created from the KML is nonsense ("Flight path" everytime).
    dataSource.name = file.name || file.split("/").pop();

    // Override the clock multiplier that might be in the file.
    dataSource.clock.multiplier = 1;

    // Add the data source to the viewer.
    initEntities(dataSource, modelURI);
}

/**
 * Set the focus on the data source containing the given entity collection.
 * @param {string} entityCollectionId the id of the entity collection
 */
function switchToDataSource(entityCollectionId) {
    if (!Cesium.defined(viewer)) {
        throw Error("Viewer is not defined.");
    }

    // Find the data source in the viewer's collection.
    const dataSource = getById(entityCollectionId, viewer.dataSources);

    if (!dataSource) {
        console.warn("No data source selected, abort switching.");
        return;
    }

    // Set the index to 0 (other features may also rely on this).
    // This will trigger the `datasource changed` event.
    viewer.dataSources.lowerToBottom(dataSource);


    /**
     * Find the data source containing the entity collection with the given id
     * (as data sources have no id themselves).
     * @param {string} id the id of the data source's entity collection
     * @param {Cesium.DataSourceCollection} dataSources the data sources
     * @returns {Cesium.DataSource} the data source or `undefined` if not found
     */
    function getById(id, dataSources) {
        for (let i = 0; i < dataSources.length; i++) {
            const dataSource = dataSources.get(i);
            // Data source found.
            if (dataSource.entities.id === id) {
                return dataSource;
            }
        }
        // Data source not found.
    }
}


// Startup Cesium only after the document is loaded.
// This ensures that all startup tasks are already assigned to the handler.
$(function() {
    startup();
});

export {
    CONFIG,
    initEntities,
    loadKmlFile,
    switchToDataSource,
    systemState,
    viewer,
    modelURI
};
