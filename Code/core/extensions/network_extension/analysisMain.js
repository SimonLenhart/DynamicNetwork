/* global graphlib */
/**
 * This is  for the analysis of the network
 */

import { graph, fittingGraph } from "./generateNetwork.js";
import { viewer } from "../../Teamwise/mainCore.js";
import { gran } from "./network_extension.js";

//arrays to save the data of the timestep iterations as well as the time itself
let exportArray = [];
let exportTimeArray = [];
let exportNameArray = [];
//the number of intervals for the visualization of the analysis
let granularity = 20;
let stepSize;

/**
 * set the Granularity to the value in the slider
 */
function setGranularity() {
    granularity = gran;
}

/**
 * fills the export array with the timesteps to make the visualization of the analysis better
 */
function fillTimeArray() {
    exportTimeArray = [];
    const time = giveTime();
    let i = 0;
    while (i < granularity) {
        //change from date object to numbers
        let hours = Cesium.JulianDate.toDate(time).getHours() - 2;//somehow js is two hours later than Cesium;
        if (hours < 10) {
            hours = "0" + hours;
        }
        let minutes = Cesium.JulianDate.toDate(time).getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        let seconds = Cesium.JulianDate.toDate(time).getSeconds();
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        exportTimeArray.push(hours + ":" + minutes + ":" + seconds);
        Cesium.JulianDate.addSeconds(time, stepSize, time);
        i++;
    }
    return exportTimeArray;
}

/**
 * goes through all animal IDs and writes them into an array
 */
function fillNameArray() {
    //the data of the animals
    const animals = viewer.dataSources.get(0).entities.values;
    const nameArray = [];
    //go through all animals
    for (let k = 0; k < animals.length; k++) {
        nameArray.push(animals[k].id);
    }
    exportNameArray = nameArray;
    return exportNameArray;
}



/**
 * gives a time instance to work on for the visualization of the analysis
 */
function giveTime() {
    //set the time to the start time of the data
    const time = new Cesium.JulianDate;
    Cesium.JulianDate.clone(viewer.clock.startTime, time);
    //set the stepSize
    stepSize = Cesium.JulianDate.secondsDifference(viewer.clock.stopTime, time) / granularity;
    return time;
}

/*
 * This part is for the analysis on individual level. All values are normalized between 0 and 1.
 */

/**
 * This function calculates the degree-centrality of all individuals for all time steps.
 * Value 0 means that this node has no connection to other nodes, value 1 means it  is connected to every other node.
 */
function calcDegCen() {
    let animalID, time;
    let numbNeigh = [];
    //use the user input granularity
    setGranularity();
    //the data of the animals
    const animals = viewer.dataSources.get(0).entities.values;
    //empty export array
    exportArray = [];
    //go through all animals
    for (let i = 0; i < animals.length; i++) {
        animalID = animals[i].id;
        //set time dependent on start and stop time of the clock
        time = giveTime();
        //iterate from start to stop time and use a graph of the current network
        let k = 0;
        while (k < granularity) {
            //check if node has no neighbours
            if (fittingGraph(time).neighbors(animalID)) {
                numbNeigh = fittingGraph(time).neighbors(animalID);
            } else {
                //if no neighbours make an empty array, so we dont have undefined
                numbNeigh = [];
            }
            //add item to export array for visualization
            exportArray.push({ "ID": (i + 1), "time": (k + 1), "value": numbNeigh.length / (graph.nodeCount() - 1) });
            Cesium.JulianDate.addSeconds(time, stepSize, time);
            k++;
        }
    }
    //fill name and time arrays for the visualization
    fillNameArray();
    fillTimeArray();
    return exportArray;
}

/**
 * This function calculates all shortest paths from all nodes to eyery other node inside the graph.
 * It uses the dijkstra algorithm.
 * @returns {Object} an object of objects. Keys are the node ID's. Each inner object saves the distance from the Key-Node to all other nodes inside the graph.
 * @param {*} graphTemp the graph
 */
function dijkstraAll(graphTemp) {
    let dijkstraResult = [];
    if (graphlib.alg.dijkstraAll(graphTemp, weight, getAllEdgesOfCurrentNode)) {
        dijkstraResult = graphlib.alg.dijkstraAll(graphTemp, weight, getAllEdgesOfCurrentNode); // g, weightFunc, edgeFunc
    }
    /**
    *@returns {Array} contains all edges the current node is connected to.
    * @param {Object} v the current node
    */
    function getAllEdgesOfCurrentNode(v) {
        let edges = [];
        if (graphTemp.nodeEdges(v)) {
            edges = graphTemp.nodeEdges(v);
        }
        return edges;
    }
    /**
    * No destructuring possible, so we have to overwrite the default value of 1, with a function returning 1.
    * @returns {number} 1
    */
    function weight() {
        return 1; //each edge has weight 1.
    }
    return dijkstraResult;
}

/**
 *  This function calculates the eccentricity of all animals for all timesteps.
 * The eccentricity is 1/(longest shortes parth from this node).
 * So the node with the smallest eccentricity has the longest shortest path to an other node.
 */
function calcEccen() {
    let time, selectedAnimal, arrayAnimal, eccentricity;
    let selAniData = [];
    let arrayDist = [];
    //use the user input granularity
    setGranularity();
    //the data of the animals
    const animals = viewer.dataSources.get(0).entities.values;
    //empty export array again
    exportArray = [];
    //go through all animals
    for (let i = 0; i < animals.length; i++) {
        selectedAnimal = animals[i].id;
        //set time dependent on start and stop time of the clock and the current iteration
        time = giveTime();
        //iterate from start to stop time and use a graph of the current network
        let k = 0;
        while (k < granularity) {
            //the main part of the eccentricity analysis
            if (dijkstraAll(fittingGraph(time))[selectedAnimal]) {
                selAniData = dijkstraAll(fittingGraph(time))[selectedAnimal];
            } else {
                selAniData = [];
            }
            arrayAnimal = Object.values(selAniData);
            arrayDist = [];
            for (let j = 0; j < arrayAnimal.length; j++) {
                if (arrayAnimal[j].distance === Infinity) {
                    arrayAnimal[j].distance = 0;
                }
                arrayDist.push(arrayAnimal[j].distance);
            }
            eccentricity = 1 / (Math.max.apply(Math, arrayDist));
            if (eccentricity === Infinity || eccentricity === -Infinity) {
                eccentricity = 0;
            }

            //add item to export array for visualization
            exportArray.push({ "ID": (i + 1), "time": (k + 1), "value": eccentricity });
            Cesium.JulianDate.addSeconds(time, stepSize, time);
            k++;
        }
    }

    //fill name and time array for the visualization
    fillNameArray();
    fillTimeArray();
    return exportArray;
}

/**
 * This function calculates the closeness in a disconnected graph for all animals at all timesteps.
 * The closeness for one node is the sum of [1/(longest shortest path from this node) to every other node].
 */
function calcClose() {
    let selectedAnimal, time, arrayAnimal, sumOfPaths, closeCen;
    let selAniData = [];
    //use the user input granularity
    setGranularity();
    //the data of the animals
    const animals = viewer.dataSources.get(0).entities.values;
    exportArray = [];
    //go through all animals
    for (let i = 0; i < animals.length; i++) {
        selectedAnimal = animals[i].id;
        //set time dependent on start and stop time of the clock and current iteration
        time = giveTime();
        //iterate from start to stop time and use a graph of the current network
        let k = 0;
        while (k < granularity) {
            //mainpart of the closeness analysis
            //check for undefined value
            if (dijkstraAll(fittingGraph(time))[selectedAnimal]) {
                selAniData = dijkstraAll(fittingGraph(time))[selectedAnimal];
            } else {
                selAniData = [];
            }
            arrayAnimal = Object.values(selAniData);
            sumOfPaths = 0;
            for (let j = 0; j < arrayAnimal.length; j++) {
                if (arrayAnimal[j].distance !== Infinity && arrayAnimal[j].distance !== -Infinity && arrayAnimal[j].distance !== 0) {
                    sumOfPaths += 1/arrayAnimal[j].distance;
                }
            }
            closeCen =  sumOfPaths/(graph.nodeCount() - 1); // for normalisation 
            if (closeCen === Infinity || closeCen === -Infinity || isNaN(closeCen)) {
                closeCen = 0;
            }
            //add item to export array for visualization
            exportArray.push({ "ID": (i + 1), "time": (k + 1), "value": closeCen });
            Cesium.JulianDate.addSeconds(time, stepSize, time);
            k++;
        }
    }
    //fill names and times into arrays for the legend of the visualization
    fillNameArray();
    fillTimeArray();
    return exportArray;

}



/**
 * calcBetwWrapper - calculate the betweenness centrality of each node inside the Graph. This Algorithm was described in "A faster algorithm for betweenness centrality" by U. Brandes.
*
* Don't get confused: 1 - 2 - 3 : node 2 has an cenBetw value of 2  (1 -3 and 3- 1)
*    2
*  / | \
* 1  |  4
*  \ | /
*    3
*
* 2 and 3 have an cenBetw value of: 1, because there a two shortest paths from 1 - 4 this is why we calculate 0,5 instead of 1 for each edge.
* @returns {Object} cenBetw Contains an integer Number for every key where each node is a key.
 * @param {*} graphTemp the graph to work on
 */
function calcBetwWrapper(graphTemp) {
    /**
    * Queue - simple queue which fits our task.
    * we can use the constructor to create a new queue
    * enqueue(), dequeue(), isEmpty()
    */
    function Queue() {
        this.data = [];
    }

    Queue.prototype.enqueue = function (node) {
        this.data.unshift(node);
    };

    Queue.prototype.dequeue = function () {
        if (this.isEmpty === true) {
            console.log("trying to pop element from empty queue");
        }
        return this.data.pop();
    };

    Queue.prototype.isEmpty = function () {
        if (this.data.length === 0) {
            return true;
        } else {
            return false;
        }
    };
    //start of pseudocode implementation
    const cenBetw = {};
    graphTemp.nodes().forEach(function initializeBetweennessCentrality(node) {
        cenBetw[node] = 0;
    });

    // main - for every s \in V
    graphTemp.nodes().forEach(function main(nodeS) {
        const stack = []; //empty 'stack'
        const predecessors = {}; //for each node we save a list of predecessors of that [node].
        const sigma = {};
        const distance = {};
        graphTemp.nodes().forEach(function resetPredecessors(node) {
            predecessors[node] = []; //should be an empty list - we use an array.
            sigma[node] = 0;
            distance[node] = -1;
        });
        sigma[nodeS] = 1;
        distance[nodeS] = 0;
        const queue = new Queue();
        queue.enqueue(nodeS); //enqueue s -> Q

        while (queue.isEmpty() !== true) { //while Q not empty
            const nodeV = queue.dequeue();
            stack.push(nodeV);

            graphTemp.neighbors(nodeV).forEach((neighW) => { //neighW for neighbor w of nodeV
                if (distance[neighW] < 0) { //neighW found for the first time
                    queue.enqueue(neighW);
                    distance[neighW] = distance[nodeV] + 1;
                }

                //shortest path to neighW via NodeV?
                if (distance[neighW] === distance[nodeV] + 1) {
                    sigma[neighW] = sigma[neighW] + sigma[nodeV];
                    predecessors[neighW].push(nodeV);
                }
            });
        }

        const delta = {};
        graphTemp.nodes().forEach(function resetDelta(v) {
            delta[v] = 0;
        });

        while (stack.length !== 0) {
            const w = stack.pop();
            predecessors[w].forEach(function setDelta(v) {
                delta[v] = delta[v] + sigma[v] / sigma[w] * (1 + delta[w]);
                if (w !== nodeS) {
                    cenBetw[w] = cenBetw[w] + delta[w];
                }
            });
        }
    });
    const n = graph.nodeCount();
    for (const i in cenBetw) {
        cenBetw[i] = 2 * cenBetw[i] / ((n - 2) * (n - 1));
    }
    return cenBetw;
}

/**
* calculates the betweenness for all animals for all timesteps and writes
* that into the export array for the visualization
*
* @returns {number} animalBetween - the betweenness-centrality for one entity.
*/
function calcBetw() {
    let time, selectedAnimal, betweenness;
    //use the user input granularity
    setGranularity();
    //the data of the animals
    const animals = viewer.dataSources.get(0).entities.values;
    //make the exportArray empty again
    exportArray = [];
    //go through all animals
    for (let i = 0; i < animals.length; i++) {
        //set time and step size dependent on start and stop time of the clock
        time = giveTime();
        selectedAnimal = animals[i].id;
        //iterate from start to stop time
        let k = 0;
        while (k < granularity) {
            betweenness = 0;
            //check for undefined value
            if (calcBetwWrapper(fittingGraph(time))[selectedAnimal]) {
                betweenness = calcBetwWrapper(fittingGraph(time))[selectedAnimal];
            } else {
                betweenness = 0;
            }
            //add item to export array for visualization
            exportArray.push({ "ID": (i + 1), "time": (k + 1), "value": betweenness });
            Cesium.JulianDate.addSeconds(time, stepSize, time);
            k++;
        }
    }
    //fill names and times into an array for the legend of the visualization
    fillNameArray();
    fillTimeArray();
    return exportArray;
}



/**
  * calcConCompGroup - calculates the number of two-fold connected components.
  * Based on U. Brandes Algorithm presented in "Methoden der Netzwerkanalyse" (SS 2015)
  * @returns {Array} returnMe  At index 0 it contains all components.
  * Index 1 contains an integer which is the total number of bcc's inside the Graph.
 * @param {*} graphTemp the graph
 */
function calcConCompGroup(graphTemp) {
    const stack = [];
    const markedNodes = {};
    const markedEdges = {};
    const incoming = {};
    const component = [];
    const dfsIndex = {};
    const stackSe = [];
    const stackC = [];
    const dfsKantenIndex = {};
    //const results = [];
    let dfs = 1;
    let count = 0;

    graphTemp.nodes().forEach(function forEveryNode(s) { // for each s /in V -> s is a node
        if (!(markedNodes.hasOwnProperty(s))) {
            markedNodes[s] = "marked";
            incoming[s] = "nil";

            dfsIndex[s] = dfs; //save DFS-Nummber for each node.
            dfs++;
            stack.push(s);
            // ROOT(S)
            const edges = [];
            //#ToDO - can't break; forEach. need a more efficient way.

            while (stack.length !== 0) {
                const node = stack[stack.length - 1]; // implements -- top(stack) -- look at the top most element.

                //check the existence of an unmarked edge between node and some other point inside the graph.
                graphTemp.edges().forEach(function incidentEdges(edge) { //saves one incident edge.
                    if ((edge.v === node) || (edge.w === node)) { //check if edge starts or ends (undirected) with our current node
                        if (!(markedEdges.hasOwnProperty(edgeToString(edge))) && (edges.length === 0)) { // if this edge is not marked yet and no other edge was found before.
                            //Es existiert eine nicht markierte kante e= (node, w) or e= (v, node)
                            edges.push(edge);
                            dfsKantenIndex[edgeToString(edge)] = dfsIndex[node]; // DFS((v,w)) = DFS(v) the DFS-Nummber of the node from which we start walking.
                        }
                    }
                });


                if (edges.length === 1) { //if there is a unmarked edge - found before and pushed into edges[]
                    const oneEdge = edges.pop(); //array has just one entry
                    const adjacentNode = oneEdge.v === node ? oneEdge.w : oneEdge.v; //save adjacent node of our current node (is the other side of the edge)
                    markiereAktuelleKante(oneEdge, adjacentNode, node); //need to pass reference to function, because callFunction doesn't include node. So we cant reference node by this.
                    if (!(markedNodes.hasOwnProperty(adjacentNode))) { //if adjacent node is not marked yet
                        markedNodes[adjacentNode] = "marked";
                        incoming[adjacentNode] = oneEdge;
                        dfsIndex[adjacentNode] = dfs;
                        dfs++;
                        stack.push(adjacentNode);
                        // v = node, e = oneEdge, w = adjacentNode
                    }
                    traverse(node, oneEdge, adjacentNode);
                } else {
                    const popedNode = stack.pop();

                    if (stack.length === 0) {
                        backtrack(popedNode, incoming[popedNode], "nil");  // top(stack) should be the third parameter! --> nil if stack is empty
                    } else {
                        backtrack(popedNode, incoming[popedNode], stack[stack.length - 1]);
                    }
                }
            }
        }
    });

    /**
     * This function marks the current edge as Baumkanten or Nichtbaumkanten
     * @param  {Object} edge         edge object {v: nodeV, w: nodeW}
     * @param  {string} adjacentNode name as string
     * @param  {string} node         name as string
     */
    function markiereAktuelleKante(edge, adjacentNode, node) {
        let marker = "";
        //Baumkante
        if (!(markedNodes.hasOwnProperty(adjacentNode))) { // adjacent node w is not marked yet --> BAUMKANTE
            marker = "bk";

            //Nichtbaumkante
        } else if ((markedNodes.hasOwnProperty(adjacentNode) && dfsIndex[adjacentNode] <= dfsIndex[node] && stack.includes(adjacentNode))) {
            marker = "rk"; //each Nichtbaumkante closes a gerichteten Kreis.
        } else {
            marker = "quer- or Vorwärtskante";
        }
        markedEdges[edgeToString(edge)] = marker;
    }

    /**
    * toString: Each edge is represented by an object. We can't use objects as keys (they're not hashable!) so we use a modified toString method.
    * @param {Object} edge - edge object {v: nodeName, w: nodeName}
    * @returns {string} string representation of our object.
    */
    function edgeToString(edge) {
        if (edge === undefined) { //need this for backtrack. Whe defined top(stack) if stack is empty
            return "nil";
        }
        return "v:" + edge.v + " w:" + edge.w; //
    }


    /**
     * @param  {string} nodeV single node inside the Graph
     * @param  {Object} edge  edge between NodeV and NodeW
     * @param  {string} nodeW single node inside the Graph
     */
    function traverse(nodeV, edge, nodeW) {
        //haben schlichten graph - Mithin müssen wir Schleifen hier nicht betrachten.
        stackSe.push(edge);
        if (markedEdges[edgeToString(edge)] === "bk") { // if edge is Baumkante
            stackC.push(edge);
        } else if (markedEdges[edgeToString(edge)] === "rk") {
            while ((dfsIndex[nodeW]) < (dfsKantenIndex[edgeToString(stackC[stackC.length - 1])])) {
                stackC.pop();
            }
        }
    }

    /**
     * @param  {string} nodeW single node inside the Graph
     * @param  {Object} edge  edge
     * @param  {string} nodeV single node inside the Graph
     */
    function backtrack(nodeW, edge, nodeV) {
        if (edgeToString(edge) === edgeToString(stackC[stackC.length - 1]) && edgeToString(edge) !== "nil") { // edge = top(stackC)?? we compair the string representation!
            stackC.pop();
            //component[edgeToString(edgePoped)] = edge;
            let edgePoped;
            component[count] = [];
            do {
                edgePoped = stackSe.pop();
                component[count].push(edgePoped); // in skript compinent[e'] <- e
            } while (!(edgeToString(edgePoped) === edgeToString(edge)));
            //  results.push(component);
            count++;
        }
    }
    const returnMe = [component, count];
    //console.log(returnMe);
    return returnMe;
}

/**
 * This part is for the analysis on global level
 */

/**
 * This function calculates the number of edges for the whole network
 */
function calcNumEdges() {
    //use the user input granularity
    setGranularity();
    //edge count of the current time
    let numberEdges = graph.edgeCount();
    //set the time to the start time of the data
    const time = giveTime();
    //an array to save the data of the timestep iterations
    const numberOfEdgesArray = [];
    //iterate from start to stop time and use a graph of the current network
    let i = 0;
    while (i < granularity) {
        //use the graph of the currently generated network
        numberEdges = fittingGraph(time).edgeCount();
        numberOfEdgesArray.push(numberEdges);
        Cesium.JulianDate.addSeconds(time, stepSize, time);
        i++;
    }
    //fill the arrays to be exported with data
    exportArray = numberOfEdgesArray;
    fillTimeArray();
    return numberOfEdgesArray;
}

/**
 * This function calculates the density of the edges for the whole network
 */
function calcDenEdges() {
    //use the user input granularity
    setGranularity();
    //analysis of the moment when button is clicked
    let maxEdges;
    let densityEdges;
    //set time and step size dependent on start and stop time of the clock
    const time = giveTime();
    //an array to save the data of the timestep iterations
    const densityOfEdgesArray = [];
    //iterate from start to stop time and use a graph of the current network
    let i = 0;
    while (i < granularity) {
        //now make the analysis and add to the array
        maxEdges = (graph.nodeCount() * (graph.nodeCount() - 1)) / 2;
        if (fittingGraph(time).edgeCount() === 0) {
            densityEdges = 0;
        } else {
            densityEdges = fittingGraph(time).edgeCount() / maxEdges;
        }
        densityOfEdgesArray.push(densityEdges);
        Cesium.JulianDate.addSeconds(time, stepSize, time);
        i++;
    }
    //fill the arrays to be exported with data
    exportArray = densityOfEdgesArray;
    fillTimeArray();
    return densityOfEdgesArray;
}

/**
 * This function calculates the average degree for the whole network
 */
function calcAverDeg() {
    //use the user input granularity
    setGranularity();
    //moment of button clicking
    let averDeg;
    //set time and step size dependent on start and stop time of the clock
    const time = giveTime();
    //an array to save the data of the timestep iterations
    const averDegArray = [];
    //iterate from start to stop time and use a graph of the current network
    let i = 0;
    while (i < granularity) {
        //use the graph of the currently generated network
        if (fittingGraph(time).edgeCount() === 0) {
            averDeg = 0;
        } else {
            averDeg = (2 * fittingGraph(time).edgeCount()) / graph.nodeCount();
        }
        averDegArray.push(averDeg);
        Cesium.JulianDate.addSeconds(time, stepSize, time);
        i++;
    }
    //fill the arrays to be exported with data
    exportArray = averDegArray;
    fillTimeArray();
    return averDegArray;
}


/**
* calcConCompWhole - calculates the total number of bcc's inside the current graph.
*
*@return {integer}  total number of bcc's
*/
function calcConCompWhole() {
    //use the user input granularity
    setGranularity();
    //set time and step size dependent on start and stop time of the clock
    const time = giveTime();
    //an array to save the data of the timestep iterations
    const componentArray = [];
    //iterate from start to stop time and use a graph of the current network
    let i = 0;
    while (i < granularity) {
        //use the graph of the currently generated network
        componentArray.push(calcConCompGroup(fittingGraph(time))[1]);
        Cesium.JulianDate.addSeconds(time, stepSize, time);
        i++;
    }
    //fill the arrays to be exported with data
    fillTimeArray();
    exportArray = componentArray;
    return componentArray;
}

/**
 * Set up the colors for the two folded calculation
 */
function setUpCalcConCompColor() {
    //two folded array
    const arrayOfBiConnected = calcConCompGroup(graph)[0];
    //color array, has to be material because of the polylines
    const arrayOfMaterials = [];
    // color array for the models
    const arrayOfColors = [];
    let whichColor = 255;
    for (let index = 0; index < arrayOfBiConnected.length; index++) {
        // change color value if we have more than three networks
        if (index % 3 === 0 && index > 2) {
            whichColor = 255 - (index / 3 * 75);
        }
        //normal color of the models
        let col = Cesium.Color.BEIGE;
        let mat = Cesium.Material.fromType("Color", {
            color: col
        });
        // giving the different networks different colors
        switch (index % 3) {
            case 0:
                col = new Cesium.Color(Math.abs(whichColor / 255 - 1.0), Math.abs(whichColor / 255 - 1.0), whichColor / 255, 1.0);
                mat = Cesium.Material.fromType("Color", {
                    color: col
                });
                break;
            case 1:
                col = new Cesium.Color(Math.abs(whichColor / 255 - 1.0), whichColor / 255, Math.abs(whichColor / 255 - 1.0), 1.0);
                mat = Cesium.Material.fromType("Color", {
                    color: col
                });
                break;
            case 2:
                col = new Cesium.Color(whichColor / 255, Math.abs(whichColor / 255 - 1.0), Math.abs(whichColor / 255 - 1.0), 1.0);
                mat = Cesium.Material.fromType("Color", {
                    color: col
                });
                break;
            default:
                console.error("Error in setUpCalc because of modulo");
                break;
        }
        // add to the color array
        arrayOfMaterials.push(mat);
        arrayOfColors.push(col);
    }
    // color the animal models
    calcConCompColorModels(arrayOfBiConnected, arrayOfColors);
    // return the materials for the polylines
    return [arrayOfBiConnected, arrayOfMaterials];
}

/**
 * color the models of the birds in cesium with right color out of the setupCalcConCompColor
 * @param {Array} arrayOfBiConnected The array of bi connected components from setupCalcConCompColor
 * @param {Cesium.Color[]} arrayOfColors The arrayOfColors from setupCalcConCompColor
 */
function calcConCompColorModels(arrayOfBiConnected, arrayOfColors) {
    // need the animals for coloring
    const animals = viewer.dataSources.get(0).entities.values;
    for (let animalInd = 0; animalInd < animals.length; animalInd++) {
        const animal = animals[animalInd];
        // if we call the function from the polylines, the two folded is not active (anymore) so we color the models white
        if (arrayOfBiConnected.length === 0 && arrayOfColors.length === 0) {
            animal.model.color = Cesium.Color.CORNSILK;
        } else {
            // In which list of the two folded network is the bird
            let animalInNetwork = -1;
            // is it in more than one list?
            let isInMoreThanOneList = false;
            for (let BiConnectedIndV = 0; BiConnectedIndV < arrayOfBiConnected.length; BiConnectedIndV++) {
                let BiConnectedIndW = 0;
                // break the loop if we found the animal in this network
                let breakLoop = false;
                while (BiConnectedIndW < arrayOfBiConnected[BiConnectedIndV].length && !breakLoop && !isInMoreThanOneList) {
                    if (arrayOfBiConnected[BiConnectedIndV][BiConnectedIndW].v === animal.id || arrayOfBiConnected[BiConnectedIndV][BiConnectedIndW].w === animal.id) {
                        // if we have an animal which is already in a model (!= -1) we have to color it white
                        if (animalInNetwork === -1) {
                            animalInNetwork = BiConnectedIndV;
                            breakLoop = true;
                        } else {
                            isInMoreThanOneList = true;
                        }
                    }
                    BiConnectedIndW++;
                }
            }
            // color the models
            if (animalInNetwork === -1 || isInMoreThanOneList) {
                animal.model.color = Cesium.Color.CORNSILK;
            } else {
                animal.model.color = arrayOfColors[animalInNetwork];
            }
        }
    }

}

export {
    calcDegCen,
    calcEccen,
    calcClose,
    calcBetw,
    setUpCalcConCompColor,
    calcConCompColorModels,
    calcNumEdges,
    calcDenEdges,
    calcAverDeg,
    calcConCompWhole,
    exportArray,
    exportTimeArray,
    exportNameArray
};