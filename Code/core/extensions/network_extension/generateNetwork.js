/*
 * In this file, the distance network, the orientation network as well as
 the combination of them are created as graphs using graphlib and are drawn
 using the polylines from Cesium. First, you see some helper methodes like creating
 the graph, resetting it or removing the trails of the birds and a method for drawing lines.
 Finally, there are methods for generating the networks.
 Melissa wrote the orientation network, the creation of the network arrays, and the coloring
 of the visualization of the network
 Nicolai the distance network as well as the visualization of the networks.
 */
/* global graphlib */
import { viewer } from "../../Teamwise/mainCore.js";
import { counter, limitArr, currentNetwork, biConnectedIsActive } from "./network_extension.js";
import { setUpCalcConCompColor, calcConCompColorModels } from "./analysisMain.js";
const graph = new graphlib.Graph({ directed: false, compound: false, multigraph: false });
// Create a polyline collection
const polylines = new Cesium.PolylineCollection();
/**
 * remove the coloured trail paths if existing
 * @param {*} animals the entity collection
 */
function removeTrailPath(animals) {
    for (let i = 0; i < animals.length; i++) {
        viewer.dataSources.get(0).entities.values[i].path.trailTime = 0;
    }
}

/** Creating a graph where the id of the nodes are the animal ids
 * and the labels are all coordinates of this animal
 * @param {Cesium.entities} animals The animals which are loaded
 */
function createGraph(animals) {
    for (let i = 0; i < animals.length; i++) {
        graph.setNode(animals[i].id, animals[i].position._property._values);
    }
}

/**
 * removing all edges of the graph
 */
function resetGraph() {
    const edgesArray = graph.edges();
    edgesArray.forEach(function deleteEdge(edgeObj) {
        graph.removeEdge(edgeObj.v, edgeObj.w); // O|graph.edges|
    });
}

/**
 * From here we create the different networks
 * @param {number[]} limit Get the limit values
 * @param {string} networkString Which network to generate
 * @param {number} frameRate After how many frames you want a new network generated
*/
function generateNetwork(limit, networkString, frameRate) {
    let animals = [];
    const dsCollection = viewer.dataSources;
    //if nothing loaded do nothing
    if (dsCollection === undefined || dsCollection.length === 0) {
        alert("No Data");
    } else {
        animals = dsCollection.get(0).entities.values;
        createGraph(animals);
        //which network should be constructed?
        switch (networkString) {
            case "dist":
                createDistNetwork(limit, animals, frameRate);
                break;
            case "orie":
                createOrieNetwork(limit, animals, frameRate);
                break;
            case "dsor":
                createDistOrNetwork(limit, animals, frameRate);
                break;
            default:
                alert("Not the right String for generating a network");
                break;
        }
    }
}

/** create an array containing the animals positions or orientations
 * this method is used by the network generation methods
 * @param {Cesium.Entity} animals The animals we have
 * @param {string} string Which network should be created
 */
function createNetworkArray(animals, string) {
    const time = viewer.clock.currentTime;
    const distanceArr = new Array(animals.length);
    const orientArr = new Array(animals.length);
    for (let i = 0; i < animals.length; i++) {
        const cartesian = new Cesium.Cartesian3;
        const orientation = new Cesium.Cartesian3;
        // distance or orientation network
        switch (string) {
            case "dist":
                animals[i].position.getValue(time, cartesian);
                distanceArr[i] = cartesian;
                break;
            case "orie":
                animals[i].orientation._velocityVectorProperty.getValue(time, orientation);
                orientArr[i] = orientation;
                break;
            default:
                console.error("Error at NeworkArray");
                break;
        }
    }
    // return the right array
    switch (string) {
        case "dist":
            return distanceArr;
        case "orie":
            return orientArr;
        default:
            console.error("Error returning NetworkArray");
            return null;

    }
}


/**
 * update the polyline collection
 */
function updateLines() {
    let colorArray = [];
    if (biConnectedIsActive) {
        // the colors we need for the polylines
        colorArray = setUpCalcConCompColor();
    } else {
        // if we want to color the animal models (back to) white
        calcConCompColorModels([], []);
    }
    //remove old polylines
    polylines.removeAll();
    //create animal collection
    const entityCollection = viewer.dataSources.get(0).entities;
    //fetch graph edges
    const edgesArray = graph.edges();
    edgesArray.forEach(function getEdges(edgeObj) {
        //default color
        let mat = Cesium.Material.fromType("Color", {
            color: new Cesium.Color(1.0, 1.0, 1.0, 1.0)
        });
        //get the animals positions at the current time
        const animal1Pos = new Cesium.Cartesian3;
        const animal2Pos = new Cesium.Cartesian3;
        entityCollection.getById(edgeObj.v).position.getValue(viewer.clock.currentTime, animal1Pos);
        entityCollection.getById(edgeObj.w).position.getValue(viewer.clock.currentTime, animal2Pos);
        // get the colors of the polylines
        if (colorArray.length > 0 && colorArray[0].length > 0) {
            for (let i = 0; i < colorArray[0].length; i++) {
                for (let j = 0; j < colorArray[0][i].length; j++) {
                    if (edgeObj.v === colorArray[0][i][j].v && edgeObj.w === colorArray[0][i][j].w) {
                        // color of the different arrays
                        mat = colorArray[1][i];
                    }
                }
            }
        }
        //draw the line between the animals
        polylines.add({
            show: true,
            positions: [animal1Pos, animal2Pos],
            width: 1,
            material: mat,
        });
    });
}

/** creating distance network
 * @param {number} limit The limit distance
 * @param {Cesium.Entity} animals data input
 * @param {number} frameRate After how many frames you want a new network generated
*/
function createDistNetwork(limit, animals, frameRate) {
    //add lines
    viewer.scene.primitives.add(polylines);
    //remove the coloured paths of the birds
    removeTrailPath(animals);
    const count = counter;
    //a timer in order to use the user input framerate
    let timer = 0;
    viewer.clock.onTick.addEventListener(function setEdgesDist() {
        //ends old method if user doesnt need it anymore
        if (count !== counter) {
            return;
        }
        timer++;
        if (timer % frameRate === 0) {
            //remove all old edges of the graph so the analysis may work
            resetGraph();
            //make an array containing the animals cartesian data
            const cartArr = createNetworkArray(animals, "dist");
            //iterate through all animal pairs
            for (let i = 0; i < cartArr.length - 1; i++) {
                const animal1 = cartArr[i];
                for (let j = i + 1; j < cartArr.length; j++) {
                    const animal2 = cartArr[j];
                    //if the two animals are closer than the distance inputted by the user
                    if (Math.abs(Cesium.Cartesian3.distance(animal1, animal2)) < limit) {
                        //make an edge in the graph for the two animals
                        graph.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
                    }
                }
            }
        }
        //update and draw all lines every frame
        updateLines();
    });
}

/** creating orientation network
 * @param {number} limit The limit orientation
 * @param {Cesium.Entity} animals data input
 * @param {number} frameRate After how many frames you want a new network generated
*/
function createOrieNetwork(limit, animals, frameRate) {
    //add lines
    viewer.scene.primitives.add(polylines);
    //remove the coloured paths of the birds
    removeTrailPath(animals);
    //check if the method call is still needed
    const count = counter;
    //a timer in order to use the user input framerate
    let timer = 0;
    viewer.clock.onTick.addEventListener(function setEdgesOrie() {
        //ends old method if user doesnt need it anymore
        if (count !== counter) {
            return;
        }
        timer++;
        if (timer % frameRate === 0) {
            //remove old graph edges
            resetGraph();
            //make an array contenting the animals orientation data
            const orienArr = createNetworkArray(animals, "orie");
            //iterate through all animal pairs
            for (let i = 0; i < orienArr.length - 1; i++) {
                const animal1 = orienArr[i];
                for (let j = i + 1; j < orienArr.length; j++) {
                    const animal2 = orienArr[j];
                    //compute the angle between the two animals
                    const angleBetween = Cesium.Cartesian3.angleBetween(animal1, animal2) * (180 / Math.PI);
                    // If the angle is smaller than the limit
                    if (angleBetween < limit) {
                        //set an edge
                        graph.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
                    }
                }
            }
        }
        //update and draw lines every frame
        updateLines();
    });
}

/** creating distance-orientation network
 * @param {number[]} limit The limit distance and orientation
 * @param {Cesium.Entity} animals The animals
 * @param {number} frameRate After how many frames you want a new network generated
*/
function createDistOrNetwork(limit, animals, frameRate) {
    //add lines
    viewer.scene.primitives.add(polylines);
    //remove the coloured paths of the birds
    removeTrailPath(animals);
    const count = counter;
    //a timer in order to use the user input framerate
    let timer = 0;
    viewer.clock.onTick.addEventListener(function setEdges() {
        //ends old method if user doesnt need it anymore
        if (count !== counter) {
            return;
        }
        timer++;
        if (timer % frameRate === 0) {
            //remove old graph edges
            resetGraph();
            //make rrays contenting the animals orientation data
            const orienArr = createNetworkArray(animals, "orie"); //1
            const distanceArr = createNetworkArray(animals, "dist"); //0
            //iterate through all animal pairs
            for (let i = 0; i < distanceArr.length - 1; i++) {
                const animal1orient = orienArr[i];
                const animal1dist = distanceArr[i];
                for (let j = i + 1; j < distanceArr.length; j++) {
                    const animal2orient = orienArr[j];
                    const animal2dist = distanceArr[j];
                    //compute the angle as well as the distance
                    const angleBetween = Cesium.Cartesian3.angleBetween(animal1orient, animal2orient) * (180 / Math.PI);
                    const distance = Math.abs(Cesium.Cartesian3.distance(animal1dist, animal2dist));
                    // If the angle is smaller than the limit
                    if (angleBetween < limit[1] && distance < limit[0]) {
                        //set an edge in the graph
                        graph.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
                    }
                }
            }
        }
        //updates and draws all lines every frame
        updateLines();
    });
}

/**
 * This function checks what network is currently generated and then
 * returns a function which returns the wanted graph
 * @param {*} time the time at which we want the network generated
 */
function fittingGraph(time) {
    if (currentNetwork === "distance") {
        return distanceGraph(time);
    } else if (currentNetwork === "orientation") {
        return orientationGraph(time);
    } else if (currentNetwork === "distanceOrientation") {
        return distOrGraph(time);
    } else {
        console.log("First network generation, then analysis please.");
    }
}


/**
 * This is a function to create a distance network at a specific time.
 * It will be used for the visualization of the analysis.
 * @param {*} time the time when the network shall be created
 */
function distanceGraph(time) {
    //setting the data set, the user input limit, and the graph
    const limit = limitArr[0].value;
    const animals = viewer.dataSources.get(0).entities.values;
    const graphTemp = new graphlib.Graph({ directed: false, compound: false, multigraph: false });
    //make an array containing the animals cartesian data
    const distanceArray = new Array(animals.length);
    for (let i = 0; i < animals.length; i++) {
        const cartesian = new Cesium.Cartesian3;
        animals[i].position.getValue(time, cartesian);
        distanceArray[i] = cartesian;
    }
    //iterate through all animal pairs
    for (let i = 0; i < distanceArray.length - 1; i++) {
        const animal1 = distanceArray[i];
        for (let j = i + 1; j < distanceArray.length; j++) {
            const animal2 = distanceArray[j];
            //if the two animals are closer than the distance inputted by the user
            if (Math.abs(Cesium.Cartesian3.distance(animal1, animal2)) < limit) {
                //make an edge in the graph for the two animals
                graphTemp.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
            }
        }
    }
    return graphTemp;
}


/**
 * This is a function to create an orientation network at a specific time.
 * It will be used for the visualization of the analysis.
 * @param {*} time the time when the network shall be created
 */
function orientationGraph(time) {
    //setting the data set, the user input limit, and the graph
    const limit = limitArr[1].value;
    const animals = viewer.dataSources.get(0).entities.values;
    const graphTemp = new graphlib.Graph({ directed: false, compound: false, multigraph: false });
    //make an array containing the animals cartesian data
    const orientArr = new Array(animals.length);
    for (let i = 0; i < animals.length; i++) {
        const orientation = new Cesium.Cartesian3;
        animals[i].orientation._velocityVectorProperty.getValue(time, orientation);
        orientArr[i] = orientation;
    }
    //iterate through all animal pairs
    for (let i = 0; i < orientArr.length - 1; i++) {
        const animal1 = orientArr[i];
        for (let j = i + 1; j < orientArr.length; j++) {
            const animal2 = orientArr[j];
            //compute the angle between the two animals
            const angleBetween = Cesium.Cartesian3.angleBetween(animal1, animal2) * (180 / Math.PI);
            // If the angle is smaller than the limit
            if (angleBetween < limit) {
                //set an edge
                graphTemp.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
            }
        }
    }
    return graphTemp;
}
/**
 * This is a function to create a distance-orientation network at a specific time.
 * It will be used for the visualization of the analysis.
 * @param {*} time the time when the network shall be created
 */
function distOrGraph(time) {
    //setting the data set, the user input limit, and the graph
    const limit = [limitArr[2].value, limitArr[3].value];
    const animals = viewer.dataSources.get(0).entities.values;
    const graphTemp = new graphlib.Graph({ directed: false, compound: false, multigraph: false });
    //make an array containing the animals position data
    const distanceArray = new Array(animals.length);
    for (let i = 0; i < animals.length; i++) {
        const cartesian = new Cesium.Cartesian3;
        animals[i].position.getValue(time, cartesian);
        distanceArray[i] = cartesian;
    }
    //make an array containing the animals orientation data
    const orientArr = new Array(animals.length);
    for (let i = 0; i < animals.length; i++) {
        const orientation = new Cesium.Cartesian3;
        animals[i].orientation._velocityVectorProperty.getValue(time, orientation);
        orientArr[i] = orientation;
    }
    //iterate through all animal pairs
    for (let i = 0; i < distanceArray.length - 1; i++) {
        const animal1orient = orientArr[i];
        const animal1dist = distanceArray[i];
        for (let j = i + 1; j < distanceArray.length; j++) {
            const animal2orient = orientArr[j];
            const animal2dist = distanceArray[j];
            //compute the angle as well as the distance
            const angleBetween = Cesium.Cartesian3.angleBetween(animal1orient, animal2orient) * (180 / Math.PI);
            const distance = Math.abs(Cesium.Cartesian3.distance(animal1dist, animal2dist));
            // If the angle is smaller than the limit
            if (angleBetween < limit[1] && distance < limit[0]) {
                //set an edge in the graph
                graphTemp.setEdge(animals[i].id, animals[j].id, "Edge between: " + animals[i].id + " and " + animals[j].id);
            }
        }
    }
    return graphTemp;
}


export {
    generateNetwork,
    graph,
    distanceGraph,
    orientationGraph,
    distOrGraph,
    fittingGraph
};

