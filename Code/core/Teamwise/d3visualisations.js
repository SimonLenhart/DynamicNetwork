/*global d3*/

import {viewer} from "./mainCore.js";
import {startupHandler, onDataSourceChanged} from "./handlers.js";

// lineChartData array holds entities passes from mianCore, entities' index can be accessed by==> entity.id
const lineChartData = new Cesium.AssociativeArray(); // it contains alt and terrainAlt for each bird
const avgLinechartData = []; // it contains avg alt for the selected data set
//let barChartData = new Cesium.AssociativeArray();
const timeGranularity = 2; // time step size for testing fastest climb and speed (also used to update the leader's marking
const dataset = [ 5, 10, 15, 20, 25 ];  //testing data
const margin = {top: 5, right: 25, bottom: 5, left: 25};
let width;
let height;
const barPadding = 1;
const padding = 30;
const tickTime = 5; // the variable is not used, we use cesium buildin onTick
let yAxis;

const svg = d3.select("svg");
const g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const yChartMin = 0; //Min altitude for selected bird, i.e. lower value at start of y axis
const yChartMax = 1000; // Max

/**
 * Helper to calculate d3 dateString
 * General settinga e.g. to move a marker circle, domain is set once after reading data (further below)
 * @param {Cesium.JulianDate} cesiumDate data set time
 */
function d3Date(cesiumDate) {
    return Cesium.JulianDate.toDate(cesiumDate);
}

//Create x scale function
let xMarker;

//Create y scale function
let d3y;

// Altitude boundaries
/** it should chnange to a dynamic way to catch the dataset variations */
let minAlt = 10000;
let maxAlt = 0;

// Terrain boundaries
/** it should chnange to a dynamic way to catch the dataset variations */
let terrainMinAlt = 1000;
let terrainMaxAlt = 0;

// Set up LiveFeed box
const feedBox = d3.select("#movingInfoBox");
const boxContent = feedBox.append("boxContent")
    .style("font", "12px sans-serif")
    .style("font-weight", "bolder")
    .text("Position info will show if animal is selected.")
    .append("p")
    .attr("class", "mBox");

/**
 * Handle all stuff when bird selection is changed.
 * @param {Cesium.Entity} birdie bird to visualize
 */
function updateViews(birdie) {
    lineChart(lineChartData.get(birdie.id), avgLinechartData);
}

let cartographic;
let ellipsoid;
let cartesian;
let handler;

// Initialize D3 after starting Cesium.
startupHandler.addAfterStartup(d3Startup);

// Update the chart when the selected data source changes and remove all lines.

onDataSourceChanged.add(newDataSource => {
    d3.selectAll(".barRect").remove();
    showLineChart(newDataSource.entities.values, true);
});

/**
 * Initialization neccessary parameters and preparation for D3 visulization.
 * @param {Cesium.Viewer} viewer the viewer to work on
 */
function d3Startup(viewer) {
    // Selected dataSource can be accessed as viewer.dataSources.get(0);
    // Entities can be assecced as viewer.dataSources.get(0).entities or .entityCollection;
    cartographic = new Cesium.Cartographic();
    ellipsoid = viewer.scene.mapProjection.ellipsoid;
    cartesian = new Cesium.Cartesian3();

    const panel = $("#d3panel");
    panel.show();
    height = panel.height() * 0.8;
    width = panel.width() - margin.left - margin.right;
    panel.hide();

    //Create x scale function
    xMarker = d3.scaleUtc()
        .rangeRound([0, width]);

    //Create y scale function
    d3y = d3.scaleLinear()
        .rangeRound([height, 0]);

    viewer.clock.onTick.addEventListener(function(clock){

        // Get selected data source
        const dataSource = viewer.dataSources.get(0);
        // console.log(dataSource);

        // Assign bar height for each barRect
        if (dataSource !== undefined ){
            //console.log(dataSouorce.entities);
            d3.selectAll(".barRect").each(function(d, i){
                //console.log("bar found",i);
                const barPos = dataSource.entities.values[i].position.getValue(viewer.clock.currentTime, new Cesium.Cartesian3());
                const barHeight = Cesium.Cartographic.fromCartesian(barPos).height;
                d3.select(this).attr("fill", "lightblue");
                d3.select(this).attr("y", d3y(barHeight));
                d3.select(this).attr("x", width);
            });
        }

        if (viewer.selectedEntity != null && viewer.selectedEntity != undefined){
            const thePos = viewer.selectedEntity.position.getValue(viewer.clock.currentTime, new Cesium.Cartesian3());
            const nextTime = new Cesium.JulianDate;
            Cesium.JulianDate.addSeconds(viewer.clock.currentTime, timeGranularity, nextTime);

            if (Cesium.JulianDate.greaterThan(nextTime, viewer.clock.stopTime)){
                Cesium.JulianDate.clone(viewer.clock.stopTime, nextTime);
            }

            const timeDiff = Cesium.JulianDate.secondsDifference(nextTime, viewer.clock.currentTime);

            const newPos = viewer.selectedEntity.position.getValue(nextTime, new Cesium.Cartesian3());
            let speed ;
            // console.log(Cesium.JulianDate.toDate(viewer.clock.stopTime));
            // Calculate the speed of selected bird
            // console.log(Cesium.JulianDate.toDate(viewer.clock.currentTime), Cesium.JulianDate.toDate(nextTime));
            if(timeDiff > 0){
                let distance;
                // Get two time point disctance
                distance = Cesium.Cartesian3.distance(thePos, newPos);
                speed = distance/timeDiff *3.6;
                //console.log(speed);
            }

            if (thePos !== undefined){
                const altitude =  Cesium.Cartographic.fromCartesian(thePos).height;
                const longitude = Cesium.Cartographic.fromCartesian(thePos).longitude;
                const long = Cesium.Math.toDegrees(longitude);
                const latitude = Cesium.Cartographic.fromCartesian(thePos).latitude;
                const lat = Cesium.Math.toDegrees(latitude);

                const stringspeed = speed === undefined ? "" : speed.toFixed(5);

                // Live feed info
                // d3.select("#movingInfoBox").style("opacity", 1); // set opacity to be displayed
                d3.select(".mBox")
                    .text("Current position of:  " + viewer.selectedEntity.id)
                    .append("p")
                    .text("Current Altitude:  " + altitude.toFixed(5))
                    .append("p")
                    .text("Current longitude:  " + long.toFixed(5))
                    .append("p")
                    .text("Current latitude:  " + lat.toFixed(5))
                    .append("p")
                    .text("Curretn speed: " + stringspeed);


                // Selected entity's moving yelllow dot on the left
                d3.select(".circo").each(function(d, i) {
                    d3.select(this).attr("cy", d3y(altitude));  // relPos);
                    d3.select(this).attr("cx", xMarker(d3Date(viewer.clock.currentTime)));
                });

                // Selected entity's moving yelllow dot on the right
                d3.selectAll(".circo2").each(function(d, i) {
                    d3.select(this).attr("cy", d3y(altitude));  // relPos);
                    d3.select(this).attr("cx", width);
                });
            }
        }else{
            // Remove selected entity info if selectedEntity == undefined
            d3.select(".circo2").remove();
            d3.select(".circo").remove();
            d3.select(".altline").remove();
            d3.select(".terAltLine").remove();
            d3.select(".mBox").text(" ");
            // d3.select("#movingInfoBox").style("opacity", 0);//remove(); // this way, the info box will disappear
        }
    });

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(function (click) {
        const pickedObject = viewer.scene.pick(click.position);
        // console.log(pickedObject);
        if (pickedObject === undefined) {
            // lineChart(undefined,undefined);
            return;
        }

        const id = Cesium.defaultValue(pickedObject.id, pickedObject.primitive.id);
        if (id instanceof Cesium.Entity) {
            const obj = id;
            if (obj._name === "Sphere"){
                viewer.selectedEntity = birds[obj._birdId];
                const thePos = birds[obj._birdId]._position.getValue(viewer.clock.currentTime, new Cesium.Cartesian3());
                const altitude =  Cesium.Cartographic.fromCartesian(thePos).height;
            } else {
                viewer.selectedEntity = obj;
            }
            updateViews(viewer.selectedEntity);
        } else {
            // This should actually be something like updateViews(undefined), and updateViews should change ALL views that
            // might need a selection update
            // lineChart(undefined,undefined);
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function setHeight(height) {
    ellipsoid.cartesianToCartographic(viewer.scene.camera.position, cartographic);
    cartographic.height = height;  // convert to meters
    ellipsoid.cartographicToCartesian(cartographic, cartesian);
    viewer.scene.camera.position = cartesian;
}

/**
 * Generat D3 line chart.
 * @param {Cesium.Entity} dataEntities entity collection of select data source.
 * @param {boolean} showLines showLine should be true.
 */
function showLineChart(dataEntities, showLines){
    const curTime = new Cesium.JulianDate;
    const avgAlt = [];

    // Clear average line chart
    avgLinechartData.length = 0;

    // Clear the line chart data
    lineChartData.removeAll();

    // Loop through each entity to get entities' postions, the inside while loop is to loop through time steps
    for(const entity of dataEntities){
        Cesium.JulianDate.clone(viewer.clock.startTime, curTime);
        const endTime = viewer.clock.stopTime;
        const timeLine = [];
        const terrainLine = [];
        // Loop through time steps, variable timeGranularity sets the time step intervals
        while (Cesium.JulianDate.compare(curTime, endTime ) < 0) {
            const currentAlt = entity.position.getValue(curTime, new Cesium.Cartesian3());

            terrainLine.push(Cesium.Cartographic.fromCartesian(currentAlt));
            const height = Cesium.Cartographic.fromCartesian(currentAlt).height;
            if (height > maxAlt) {maxAlt = height;}
            //console.log("min: ", minAlt);
            if (height < minAlt) {minAlt = height;}
            timeLine.push(
                {
                    date: d3Date(curTime),
                    alt: height,
                }
            );
            // console.log(currentAlt);
            Cesium.JulianDate.addSeconds(curTime, timeGranularity, curTime);
        }
        // add terrain data to timeLine array
        const promise = Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, terrainLine);
        Cesium.when(promise, function(newPositions) {
            //console.log("newpos: ", entity.id, newPositions);
            for (i=0; i<newPositions.length; i++    ) {
                if (newPositions[0].height < terrainMinAlt) {terrainMinAlt = newPositions[0].height;}
                //console.log("min: ", Math.min(terrainMinAlt,minAlt));
                if (newPositions[0].height < terrainMaxAlt) {terrainMaxAlt = newPositions[0].height;}
                //console.log("max: ", Math.max(terrainMaxAlt, maxAlt));
                timeLine[i].terrainAlt = newPositions[i].height;
            }
            // updatedPositions is just a reference to positions.
        });

        lineChartData.set(entity.id, timeLine);

        // console.log("Adding bar rect", entity.id);

        // Add a bar for each animal, and assign a class .barRect
        g.append("rect")
            .attr("width", 9)
            .attr("height", 1)
            .attr("class", "barRect")
            .attr("x", 0)
            .attr("y", height*0.50)
            .attr("fill", "none");

    }
    //    console.log("end of the loop", lineChartData.length);

    // Calculate average height per timepoint
    const cTime = new Cesium.JulianDate;
    Cesium.JulianDate.clone(viewer.clock.startTime, cTime);
    const eTime = viewer.clock.stopTime;

    // Loop through the time again,
    // Now iterate through time
    while (Cesium.JulianDate.compare(cTime, eTime) <= 0) {
        let sumAlt = 0;
        // Loop through entities
        for (let yz = 0; yz < dataEntities.length; yz++) {
            const cAlt = dataEntities[yz]._position.getValue(cTime, new Cesium.Cartesian3());
            const hght = Cesium.Cartographic.fromCartesian(cAlt).height;
            sumAlt += hght;
        }
        sumAlt /= dataEntities.length;
        avgAlt[avgAlt.length] = sumAlt;
        avgLinechartData.push(
            {
                date: d3Date(cTime),
                alt: sumAlt
            });
        Cesium.JulianDate.addSeconds(cTime, timeGranularity, cTime);
    }
    if (showLines) {
        lineChart(lineChartData.values[0], avgLinechartData);
        // console.log("switching data", lineChartData.values[0], avgLinechartData);
    }
    // else {
    //     lineChart(undefined,avgLinechartData);
    // }
}

/**
 * Generate D3 line chart.
 * @param {Cesium.viewer.selectedEntity} data the selected entity data to be shown.
 * @param {avgLinechartData} avgdata calculated average path.
 */
function lineChart(data, avgdata) {
    //console.log("line data: ", data)

    //remove current line
    d3.selectAll(".altline").remove();
    d3.select(".terAltLine").remove();
    d3.select(".avgAltLine").remove(); /**why is not added back like the asx */

    // Remove current axis
    d3.selectAll(".axis").remove();

    // Remove current moving dot
    d3.select(".circo").remove();



    if  (data === undefined) {return;}

    const xScale = d3.scaleUtc()
        .domain(d3.extent(data, function(d) {
            return d.date;
        }))
        .rangeRound([0, width]);

    const line = d3.line()
        .x(function(d) {
            return xScale(d.date);
        })
        .y(function(d) {
            return d3y(d.alt);
        })
        .curve(d3.curveBasis);

    const avgLine = d3.line()
        .x(function(d) {
            return xScale(d.date);
        })
        .y(function(d) {
            return d3y(d.alt);
        });

    const terrainLine = d3.line()
        .x(function(d) {
            return xScale(d.date);
        })
        .y(function(d) {
            return d3y(d.terrainAlt);
        })
        .curve(d3.curveBasis);

    //set y domain, that is the min and max of altitude
    d3y.domain([Math.min(terrainMinAlt, minAlt)-padding, Math.max(terrainMaxAlt, maxAlt)+padding]);
    //onsole.log("y domain ", Math.min(terrainMinAlt,minAlt), Math.max(terrainMaxAlt, maxAlt));

    //set x domain, the time frame of selected dataset
    xMarker.domain([d3Date(viewer.clock.startTime), d3Date(viewer.clock.stopTime)]);
    //  console.log("x domain ",d3Date(viewer.clock.startTime),d3Date(viewer.clock.stopTime) );

    // x axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xMarker))
        .style("font", "8px sans-serif")
        .select(".domain");


    //y axis on the left
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(d3y))
        .attr("transform", "translate( " + 0 + ", 0 )")
        .style("font", "8px sans-serif")
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 10)
    //.attr("d3y", "0.71em") //
        .attr("text-anchor", "end")
        .text("Alt");

    //y axis on the right
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisRight(d3y))
        .attr("transform", "translate( " + width*1.01   + ", 0 )")

        .style("font", "8px sans-serif");

    //line path for selected bird
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("d", line)
        .attr("class", "altline");

    //average line path
    g.append("path")
        .datum(avgdata)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("d", avgLine)
        .attr("class", "avgAltLine");

    //terrain line path
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("d", terrainLine)
        .attr("class", "terAltLine");

    // dot moves along the line for selected bird's which indicated the bird's height
    g.append("circle")
        .attr("class", "circo")
        .attr("r", 2)
        .attr("fill", "yellow");

    // moving dot showing selected bird's on the right side y axis
    g.append("circle")
        .attr("class", "circo2")
        .attr("r", 2)
    //.attr("cx", width*1.01)
    //.attr("cy", height)
        .attr("fill", "yellow");

}
