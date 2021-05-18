/* eslint-disable no-unused-vars */
/*global d3*/
/*
 * This is the surface of our extension
 */
//import { startupHandler, onEntityChanged } from "../../Teamwise/handlers.js";
import {/*createExtensionMenuEntry, setCheckboxAction*/ MenuPanel, createAccordionMenuEntry } from "../../Teamwise/menu.js";
import { generateNetwork } from "./generateNetwork.js";
//Menu fÃ¼r das laden der Daten
import { loadKmlFile } from "../../Teamwise/mainCore.js";
import { calcDegCen, calcEccen, calcClose, calcBetw, calcNumEdges, calcDenEdges, calcAverDeg, calcConCompWhole, exportArray, exportTimeArray, exportNameArray } from "./analysisMain.js";
const mainPanel = new MenuPanel("Network Extension");
mainPanel.addCard("mDescription", "Description",
    "<p> This is our Network Extension. </p>\n" +
    "<p> Here you can generate a network, do analysis on this network and visualize the data generated in the analysis </p>\n"
    , true);
const netGenPanel = new MenuPanel("Network generation");
netGenPanel.addCard("sSetNet", "Network Settings",
    "<p> Please select which kind of network you want to create. </p>\n" +
    "<form>\n" +
    "<p>\n" +
    '<input class="w3-check" type="radio" name="network" id="distNetwork" value="distance">\n' +
    "<label> Show distance network</label>\n" +
    "</p>\n" +
    "<p>\n" +
    '<input class="w3-check" type="radio" name="network" id="orientationNetwork" value="orientation">\n' +
    "<label> Show orientation network</label>\n" +
    "</p>\n" +
    "<p>\n" +
    '<input class="w3-check" type="radio" name="network" id="distOrientNetwork" value="distOrient">\n' +
    "<label> Show distance-orientation network</label>\n" +
    "</p>\n" +
    '<input type="button" value="Default Data Load" id="loadDataViaPanel">' + // Button for default data load, disabeld because not desired
    "</form>\n" +
    '<div id="setLim1">\n' +
    "<form>\n" +
    "<p> Set the limit in meters for the network connections between the animals.</p>" +
    "<p> Also set the time in frames, how often the network should be recalculated.</p>" +
    "<p>\n" +
    'Limit(in m): <input type="number" id="limitSD" value=""min="0"> <br>' +
    'Framerate: &nbsp <input type="number" id="frameRateDis" value="20" min="0"> <br>' +
    '<input type="button" id="submitLimitD" value="Save"' +
    "</p>\n" +
    "</form>\n" +
    "</div>\n" +
    '<div id="setLim2">\n' +
    "<form>\n" +
    "<p> Set the limit in degrees for the network connections between the animals.</p>" +
    "<p> Also set the time in frames, how often the network should be recalculated.</p>" +
    "<p>\n" +
    'Limit(in °): <input type="number" id="limitSO" value="" placeholder ="max: 180°" min="0" max="180"> <br>' +
    'Framerate: <input type="number" id="frameRateOr" value="20" placeholder ="framerate" min="0"> <br>' +
    '<input type="button" id="submitLimitO" value="Save"' +
    "</p>\n" +
    "</form>\n" +
    "</div>\n" +
    '<div id="setLim3">\n' +
    "<form>\n" +
    "<p> Set the limit for the distance in meters and for the orientation in degrees for the network connections between the animals.</p>" +
    "<p> Also set the time in frames, how often the network should be recalculated.</p>" +
    "<p>\n" +
    'Limit(in m):<input type="number" id="limitS1" value="" min="0"> <br>' +
    'Limit(in °): <input type="number" id="limitS2" placeholder = "max: 180°" value="" min="0" max="180"> <br>' +
    'Framerate: <input type="number" id="frameRateDisOr" value="20" placeholder ="framerate" min="0"> <br>' +
    '<input type="button" id="submitLimits" value="Save"' +
    "</p>\n" +
    "</form>\n" +
    "</div>\n"
    , true);


const netAnaPanel = new MenuPanel("Network analysis");
netAnaPanel.addCard("anaInd", "Analysis on individual level",
    "<form>\n" +
            "<p>\n" +
                '<input class="anaInd-check" type="radio" name="anaInd-check" id="degCentral" value="degreeCentrality">\n' +
                "<label for='degCentral'>Degree-Centrality</label>\n" +
            "</p>\n" +
            "<p>\n" +
                '<input class="anaInd-check" type="radio" name="anaInd-check" id="eccent" value="eccentricity">\n' +
                "<label for='eccent'>Eccentricity</label>\n" +
            "</p>\n" +
            "<p>\n" +
                '<input class="anaInd-check" type="radio" name="anaInd-check" id="closeness" value="closeness">\n' +
                "<label for='closeness'>Closeness</label>\n" +
            "</p>\n" +
             "<p>\n" +
                '<input class="anaInd-check" type="radio" name="anaInd-check" id="betweenness" value="betweenness">\n' +
                "<label for='betweenness'>Betweenness</label>\n" +
            "</p>\n" +
    "</form>\n", true);
netAnaPanel.addCard("anaInd", "Analysis on global network level",
    "<form>\n" +
            "<p>\n" +
               '<input class="anaGlob-check" type="radio" name="anaGlob-check" id="numberEdges" value="numberEdges">\n' +
               '<label for="numberEdges">Number of edges</label>' +
           "</p>\n" +
           "<p>\n" +
               '<input class="anaGlob-check" type="radio" name="anaGlob-check" id="densityEdges" value="densityEdges">\n' +
               "<label for='densityEdges'>Density of edges</label>\n" +
           "</p>\n" +
           "<p>\n" +
               '<input class="anaGlob-check" type="radio" name="anaGlob-check" id="averDeg" value="averDeg">\n' +
               "<label for='averDeg'>Average degree</label>\n" +
           "</p>\n" +
           "<p>\n" +
                 '<input class="anaGlob-check" type="radio" name="anaGlob-check" id="numbConComp" value="numConComp">\n' +
                "<label for='numbConComp'>Number of two-fold connected components</label>\n" +
            "</p>\n" +
    "</form>\n", true);
netAnaPanel.addCard("anaVisBiConnected", "Visualization of the Biconnected components",
    "<p>\n" +
        '<input type="checkbox" name="anaGlob-check" id="connectedComp" value="connectedComp">\n' +
        "<label for='connectedComp'>Show the Biconnected Components</label>\n" +
    "</p>\n", true);
netAnaPanel.addCard("anaGran", "Choose the number of displayed values:",
    "<p id='outputGran'>" +
        "<div class='slidecontainer'>" +
            "<input type='range' min='11' max='61' value='20' class='slider' id='sliderGranularity'>" +
        "</div>" +
        '<input type="button" id="submitGranularity" value="Save"' +
    "</p>", true);
netAnaPanel.addCard("anaVisCard", "Visualization of the analysis",
    "<p>" +
        "<canvas id='myChart'></canvas>" +
    "</p>" +
    "<p>" +
        '<div id="heatmap"></div>' +
    "</p>" +
    "<p>" +
        "<img id='pictureLegend' src='../extensions/network_extension/legendHeatmap.png'>" +
    "</p>"
    , true);


const aboutPanel = new MenuPanel("About");
aboutPanel.addCard("aboutDes", "Description",
    "<p> This is the network extension for the TEAMWISE framework. </p>\n" +
    "<p> Here you have the opportunity to select the conditions to create a network between the animals. </p>\n" +
    "<p>Authors:\n" +
    "<ul> <li> Felix Loeffler, University of Konstanz\n" +
    "<li> Nicolai Kraus, University of Konstanz" +
    "<li> Simon Lenhart, University of Konstanz" +
    "<li> Melissa Michalke, University of Konstanz </ul> </p>"
    , true);

const licensesPanel = new MenuPanel("Licenses");
licensesPanel.addCard("licenseDes", "Other librarys used",
    "<p> Our extension used the following extern librarys: " +
    "<ul> <li> graphlib.js " +
    "<li> chart.js </ul> </p>"
    , true);

const menuList = [netGenPanel, netAnaPanel, aboutPanel, licensesPanel];
const menuNameList = ["Network generation", "Network analysis", "About", "Licenses"];
createAccordionMenuEntry("Network Extension", mainPanel, menuNameList, menuList);

// granularity for chart
let gran = 0;
// string which analysis should be calculated
let stringOfGlobalAnalysis = "";
let stringOfIndividualAnalysis = "";
// boolean to get the right function of the submitGranularity button
let isIndividuelAnalysis = true;
// get the slider to set the granularity for the chart
const sliderContainer = document.getElementById("anaGran");
sliderContainer.style.display = "none";
const slider = document.getElementById("sliderGranularity");
const output = document.getElementById("outputGran");
output.innerHTML = slider.value; // Display the default slider value
gran = slider.value;

// Update the current slider value which is the stepsize for the chart
slider.oninput = function() {
    gran = this.value;
    output.innerHTML = this.value-1;
};

// GUI get some functions
// get the div containers where you can set the limits
const setLim = [document.getElementById("setLim1"), document.getElementById("setLim2"), document.getElementById("setLim3")];

// don't display them at the beginning
for (let i = 0; i < setLim.length; i++) {
    setLim[i].style.display = "none";
}


// This part is for the generation of the diagramm
const myChartObject = document.getElementById("myChart");
// eslint-disable-next-line no-undef
const chart = new Chart(myChartObject, {
    type:"line",
    data: {
        labels: [],
        datasets: [{
            label: "data",
            fill: false,
            lineTension: 0.1,
            backgroundColor: "rgb(255, 99, 132)",
            borderColor: "rgb(255, 99, 132)",
            borderCapStyle: "butt",
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: "miter",
            pointBorderColor: "rgba(75, 192, 192, 1)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(75, 192, 192,1)",
            pointHoverBorderColor: "rgba(220, 220, 220, 1)",
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            pointHitRadius: 10,
            data: []
        }]
    }});
//Do not show chart before analysis is done
document.getElementById("anaVisCard").style.display = "none";
document.getElementById("heatmap").style.display ="none";
myChartObject.style.display = "none";


/**
 * This functions loads the data for the chart
 */
function loadDataForChart() {
    chart.data.datasets[0].data = exportArray;
    chart.data.labels = exportTimeArray;
    chart.update();
}

/**
 * This function looks for the matching label of an element
 * @param {*} el the element of the label
 */
function findLableForControl(el) {
    const idVal = el.id;
    const labels = document.getElementsByTagName("label");
    for (let i = 0; i < labels.length; i++ ) {
        if (labels[i].htmlFor === idVal) {
            return labels[i];
        }
    }
}

/**
 * This part is for the Heatmap. Most of the code is from "https://bl.ocks.org/officeofjane/11b54880abcb6b844637cb1d7a120cd5".
 * Because lack of time at the end of the project this part is not optimal customized.
 */

let mapexistst = false; //checks if there is already a created heatmap

/**
 * This is the mainfunction for creating the heatmap. It gets called everytime you select an different analysismethod.
 */
function buildHeatmap() {
    document.getElementById("anaVisCard").style.display = "block"; // display the visualisation card
    myChartObject.style.display = "none"; // do not show the chart when heatmap is displayed
    document.getElementById("heatmap").style.display = "block";
    document.getElementById("pictureLegend").style.display ="block";
    if (mapexistst === true) {
        // eslint-disable-next-line no-undef
        d3.select("svg").remove(); //if there is aready a heatmap, delete it
    }
    mapexistst = true;

    const IDs = exportNameArray;
    const times = exportTimeArray;

    // calculate width and height based on window size and set margin
    const margin = {top:80, right:50, bottom:70, left:80};
    const w = Math.max(Math.min(window.innerWidth, 1000), 400) - margin.left - margin.right - 20;
    const gridSize = Math.min(Math.floor(w / times.length), 20);
    const h = gridSize * (IDs.length);

    // svg container
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", w + margin.top + margin.bottom)
        .attr("height", h + margin.left + margin.right)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // linear colour scale
    const colours = d3.scaleLinear()
        .domain(d3.range(0, 1.01, 0.1))
        .range(["#f2e5e8", "#e5ccd1", "#d8b2ba", "#cb99a3", "#be7f8c", "#b16675", "#a44c5e", "#973246", "#8a192f", "#7d0019"]);

    // This part is for the label of the IDs on the side of the heatmap
    const IDLabels = svg.selectAll(".IDLabel")
        .data(IDs)
        .enter()
        .append("text")
        .text(function(d) {
            return d;
        })
        .attr("x", 0)
        .attr("y", function(d, i) {
            return i * gridSize;
        })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridSize / 1.5 + ")");

    // This part is for the label of the time at the top of the heatpmap
    const timeLabels = svg.selectAll(".timeLabel")
        .data(times)
        .enter()
        .append("text")
        .text(function(d) {
            return d;
        })
        .attr("x", function(d, i) {
            return i * gridSize;
        })
        .attr("y", "-30")
        .style("text-anchor", "middle")
        .style("writing-mode", "vertical-rl")
        .attr("transform", "translate(" + gridSize / 2 + ", -6)");

    // load data
    const dataset = exportArray;

    // group data by location
    const nest = d3.nest()
        .key(function(d) {
            return d.location;
        })
        .entries(dataset);

    // array of locations in the data
    const locations = nest.map(function(d) {
        return d.key;
    });
    const currentLocationIndex = 0;

    // create location dropdown menu
    const locationMenu = d3.select("#locationDropdown");
    locationMenu
        .append("select")
        .attr("id", "locationMenu")
        .selectAll("option")
        .data(locations)
        .enter()
        .append("option")
        .attr("value", function(d, i) {
            return i;
        })
        .text(function(d) {
            return d;
        });

    /**
     *  function to create the initial heatmap
     * @param {*} "location" is the location
     */
    const drawHeatmap = function(location) {
        // filter the data to return object of location of interest
        const selectLocation = nest.find(function(d) {
            return d.key === location;
        });

        const heatmap = svg.selectAll(".time")
            .data(selectLocation.values)
            .enter()
            .append("rect")
            .attr("x", function(d) {
                return (d.time-1) * gridSize;
            })
            .attr("y", function(d) {
                return (d.ID-1) * gridSize;
            })
            .attr("class", "time bordered")
            .attr("width", gridSize)
            .attr("height", gridSize)
            .style("stroke", "white")
            .style("stroke-opacity", 0.6)
            .style("fill", function(d) {
                return colours(d.value);
            });
    };

    drawHeatmap(locations[currentLocationIndex]);

    // set style for legendbar
    document.getElementById("pictureLegend").style.width = "400px";
    document.getElementById("pictureLegend").style.marginTop = "-60px";

    // scroll to the heatmap
    document.getElementById("heatmap").scrollIntoView({
        behavior: "smooth"
    });
}

//radio buttons of the network generation
document.getElementById("distNetwork").addEventListener("click", showLimitD);
document.getElementById("orientationNetwork").addEventListener("click", showLimitO);
document.getElementById("distOrientNetwork").addEventListener("click", showLimits);

// create the array of the indivdual analysis
const arrayOfIndividualAnalysis = [document.getElementById("degCentral"),
    document.getElementById("eccent"), document.getElementById("closeness"), document.getElementById("betweenness")];

// give each element of the individual analysis a function
for (let index = 0; index < arrayOfIndividualAnalysis.length; index++) {
    const element = arrayOfIndividualAnalysis[index];
    element.addEventListener("click", () => {
        // chart.data.datasets[0].label = findLableForControl(element).innerHTML;
        myChartObject.style.display = "none";
        showGranu();
        stringOfIndividualAnalysis = element.id;
        isIndividuelAnalysis = true;
    });
}

// create the array of the global analysis
const arrayOfGlobAnalysis = [document.getElementById("numberEdges"),
    document.getElementById("densityEdges"), document.getElementById("averDeg"), document.getElementById("numbConComp")];

// give each element of the global analysis a function
for (let index = 0; index < arrayOfGlobAnalysis.length; index++) {
    const element = arrayOfGlobAnalysis[index];
    element.addEventListener("click", () => {
        chart.data.datasets[0].label = findLableForControl(element).innerHTML;
        document.getElementById("heatmap").style.display = "none";
        document.getElementById("pictureLegend").style.display = "none";
        showGranu();
        stringOfGlobalAnalysis = element.id;
        isIndividuelAnalysis = false;
    });
}

// show the different colors of the network in relation to the two-folded calculation
const checkBoxForBiConnected = document.getElementById("connectedComp");
let biConnectedIsActive = false;
// only show if checkbx is active
checkBoxForBiConnected.addEventListener("click", () => {
    biConnectedIsActive = checkBoxForBiConnected.checked ? true : false;
});

/**
 * open the card for setting the granularity
 */
function showGranu() {
    sliderContainer.style.display = "block";
    sliderContainer.scrollIntoView({
        behavior: "smooth"
    });
}

/**
 * This function starts the analysis. It is called from the submitGranularity Button
 */
function startAnalysis() {
    if(isIndividuelAnalysis) {
        startIndividualAnalysis();
    } else {
        startGlobalAnalysis();
    }
}

/**
 * load chart for the individuel analysis
 */
function startIndividualAnalysis() {
    //which analysis should be calculated
    switch(stringOfIndividualAnalysis) {
        case "degCentral":
            calcDegCen();
            break;
        case "eccent":
            calcEccen();
            break;
        case "closeness":
            calcClose();
            break;
        case "betweenness":
            calcBetw();
            break;
        default:
            console.error("Not the right string for analysis");
            break;
    }
    // build the heatmap
    buildHeatmap();
}

/**
 * load chart for the global analysis
 */
function startGlobalAnalysis() {
    //which analysis should be calculated
    switch(stringOfGlobalAnalysis) {
        case "averDeg":
            calcAverDeg();
            break;
        case "numbConComp":
            calcConCompWhole();
            break;
        case "densityEdges":
            calcDenEdges();
            break;
        case "numberEdges":
            calcNumEdges();
            break;
        default:
            console.error("Not the right string for analysis");
            break;
    }
    //load the exportArray to the chart
    loadDataForChart();
    showChart();
}

/* Disabled, because not desired */
document.getElementById("loadDataViaPanel").addEventListener("click", dataLoad); //automatic data load

//* load the local data automatically

function dataLoad() {
    loadKmlFile("../../Teamwise/data/2014-08-07-70.kml");
}
/*/


/** open up the opportunity to insert the limit for the distance network
 * scroll smoothly there and let the others disappear
 */
function showLimitD() {
    setLim[1].style.display = "none";
    setLim[2].style.display = "none";
    setLim[0].style.display = "block";
    setLim[0].scrollIntoView({
        behavior: "smooth"
    });
}

/** open up the opportunity to insert the limit for the orientation network
 * scroll smoothly there and let the others disappear
 */
function showLimitO() {
    setLim[0].style.display = "none";
    setLim[2].style.display = "none";
    setLim[1].style.display = "block";
    setLim[1].scrollIntoView({
        behavior: "smooth"
    });
}

/** open up the opportunity to insert the limits for the distance-orientation network
 * scroll  smoothly there and let the others disappear
 */
function showLimits() {
    setLim[0].style.display = "none";
    setLim[1].style.display = "none";
    setLim[2].style.display = "block";
    setLim[2].scrollIntoView({
        behavior: "smooth"
    });
}

/**
 * show and scoll to the chart
 */
function showChart() {
    myChartObject.style.display = "block";
    document.getElementById("anaVisCard").style.display = "block";
    myChartObject.scrollIntoView({
        behavior: "smooth"
    });
}


// giving the save buttons functions
const submitButtons = [document.getElementById("submitLimitD"), document.getElementById("submitLimitO"),
    document.getElementById("submitLimits"), document.getElementById("submitGranularity")];

submitButtons[0].addEventListener("click", generateDistance);
submitButtons[1].addEventListener("click", generateOrientation);
submitButtons[2].addEventListener("click", generateDistanceOrientation);
submitButtons[3].addEventListener("click", startAnalysis);

// The limit containers of the networkgeneration
const limitArr = [document.getElementById("limitSD"), document.getElementById("limitSO"),
    document.getElementById("limitS1"), document.getElementById("limitS2")];

// The framerate containers of the networkgeneration
const frameArr = [document.getElementById("frameRateDis"), document.getElementById("frameRateOr"), document.getElementById("frameRateDisOr")];

let counter = 0;
let currentNetwork = "";

/** generate distance Network
 */
function generateDistance() {
    currentNetwork = "distance";
    //counter is used to abort old network generations
    counter++;
    const frameRate = frameArr[0].value;
    generateNetwork(limitArr[0].value, "dist", frameRate);
}

/** generate orientation Network
 */
function generateOrientation() {
    currentNetwork = "orientation";
    //counter is used to abort old network generations
    counter++;
    const frameOr = frameArr[1].value;
    generateNetwork(limitArr[1].value, "orie", frameOr);
}

/** generate distance-orientation Network
 */
function generateDistanceOrientation() {
    currentNetwork = "distanceOrientation";
    //counter is used to abort old network generations
    counter++;
    const frameDisOr = frameArr[2].value;
    generateNetwork([limitArr[2].value, limitArr[3].value], "dsor", frameDisOr);
}


// give the containers a css style
const csslimitS = "box-sizing:border-box;border-radius:10px; width:100px; ";

for (let index = 0; index < limitArr.length; index++) {
    limitArr[index].style.cssText = csslimitS;
}

for (let index = 0; index < frameArr.length; index++) {
    frameArr[index].style.cssText = csslimitS;
}

// give the save buttons a css style
const cssSubLim = "border-radius:10px;box-sizing:border-box;" +
    "border:none;width:70px;background-color:#5162EA;" +
    "color:white;";

for (let index = 0; index < submitButtons.length; index++) {
    submitButtons[index].style.cssText = cssSubLim;
}

// give the slider a css style
const cssSlider = "-webkit-appearance: none;width: 100%;height: 15px;"+
    "border-radius: 5px;background: #d3d3d3;outline: none;opacity: 0.7;"+
    "-webkit-transition: .2s;transition: opacity .2s;";

slider.style.cssText = cssSlider;

export {
    counter,
    currentNetwork,
    limitArr,
    biConnectedIsActive,
    gran
};