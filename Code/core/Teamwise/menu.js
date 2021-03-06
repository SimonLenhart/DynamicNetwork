import * as Main from "./mainCore.js";
import {Movebank, MovebankStudy, Animal, NO_DATA_AVAILABLE} from "./movebank/movebank.js";
import {startupHandler, onEntityChanged} from "./handlers.js";
import {uploadAndSendFile} from "./sync/syncModules.js";
import {setCameraAttachment} from "./cameraManagement.js";

/** The central movebank access, will hold login data and study information. */
const movebank = new Movebank();

/** Shows a description and the location of the selected study on the globe. */
const studyMarker = (function() {
    const translucency = new Cesium.NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);
    const pointDiameter = 10;

    const marker = new Cesium.Entity({
        show: false,
        point: {
            pixelSize: pointDiameter,
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
            scale: 0.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            outlineColor: Cesium.Color.BLACK,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -pointDiameter),
            translucencyByDistance: translucency
        }
    });

    // Add the marker to the viewer when ready.
    startupHandler.addAfterStartup(viewer => viewer.entities.add(marker));
    onEntityChanged.ignore(marker);

    return marker;
})();


/** Holds a polyline to show the full trajectory of the selected entity. */
const fullTrajectory = (function() {
    const entity = new Cesium.Entity({
        show: false,
        polyline: {
            material: Cesium.Color.WHITE.withAlpha(0.3)
        }
    });

    // Add the path entity to the viewer.
    startupHandler.addAfterStartup(viewer => viewer.entities.add(entity));

    // Make the path adjust to the selection of entities.
    onEntityChanged.add(updateLine);
    // If the path is selected, switch to the entity it represents.
    onEntityChanged.ignore(entity);

    return entity;


    /**
     * Set the polyline to the position data of the given entity.
     * @param {Cesium.Entity} [other] the entity to represent or `undefined` to
     *     hide the line
     */
    function updateLine(other) {
        const line = entity.polyline;
        if (other) {
            const pos = other.position._property._values;
            line.positions = Cesium.Cartesian3.unpackArray(pos);
            line.show = true;
        } else {
            line.show = false;
            line.positions = undefined;
        }
    }
})();


/** Used to highlight the actually recorded position around the current bird. */
const dataPoints = (function() {
    const pointsOnEachSide = 5;
    const diameter = 5;
    const baseColor = Cesium.Color.RED;

    // Create the points.
    const points = Array.from(Array(2 * pointsOnEachSide), (_, index) => {
        const offset = index - pointsOnEachSide;

        return new Cesium.Entity({
            show: false,
            point: {
                pixelSize: diameter,
                outlineWidth: 1,
                color: brightenColor(baseColor, offset)
            }
        });
    });

    // Add the points to the viewer's default entity collection.
    startupHandler.addAfterStartup(viewer => {
        points.forEach(p => viewer.entities.add(p));
    });

    // Use the position of the selected bird or hide the points on deselection.
    onEntityChanged.add(updatePoints);
    points.forEach(p => onEntityChanged.ignore(p));

    return points;


    /**
     * Returns the color on the gradient between the given base and white,
     * depending on the offset to the actual position of the entity.
     * @param {Cesium.Color} baseColor the color to add white to
     * @param {number} offset the offset from the actual position
     * @returns {Cesium.Color} a gradient between the base color and white
     */
    function brightenColor(baseColor, offset) {
        const whiteness = Math.abs(offset + 0.5) / pointsOnEachSide;

        return baseColor.brighten(whiteness, new Cesium.Color());
    }

    /**
     * Update the points' positions according to the selected entity.
     * If no entity is given, the positions are deleted (this hides the points).
     * @param {Cesium.Entity} entity the entity to use
     */
    function updatePoints(entity) {
        points.forEach((point, index) => {
            if (entity) {
                // Distribute the points around the entity's current position.
                const offset = index - pointsOnEachSide;
                point.position = createTimeIntervalPosition(entity, offset);
            } else {
                // Hide all points.
                point.position = undefined;
            }
        });
    }

    /**
     * Creates a "jumping" position property.
     *
     * In contrast to the interpolated position of the bird, this position
     * property will show a constant position for every interval.
     * @param {Cesium.Entity} entity the entity containing the data
     * @param {number} offset the number of timestamps after the bird
     */
    function createTimeIntervalPosition(entity, offset) {
        // Extract the data from the entity's sampled property.
        let timestamps = entity.position._property._times;
        let positions = entity.position._property._values;
        positions = Cesium.Cartesian3.unpackArray(positions);

        // Shift time and position according to the offset to make the points
        // showing in front of or behind the entity.
        if (offset < 0) {
            // Skip the first positions to show points in front of the entity.
            timestamps = timestamps.slice(0, offset);
            positions = positions.slice(-offset);
        } else if (offset > 0) {
            // Skip the first timestamps to show points behind the entity.
            timestamps = timestamps.slice(offset);
            positions = positions.slice(0, -offset);
        }

        // Assemble an interval position property, so points will jump when the
        // time changes, instead of being interpolated like the birds.
        const property = new Cesium.TimeIntervalCollectionPositionProperty();
        Cesium.TimeIntervalCollection.fromJulianDateArray({
            julianDates: timestamps,
            isStartIncluded: true,
            isStopIncluded: false,
            dataCallback: (_interval, index) => positions[index]
        }, property.intervals);

        return property;
    }
})();

// Initialize the actions on the user interface.
$(function() {
    // Clear all checkboxes that might still be checked on reload.
    $("input:checkbox").prop("checked", false);

    /* +++++++++++++++++++++++++++++ MAIN MENU ++++++++++++++++++++++++++++++ */

    // Hide or show the navigation bar on clicking the main menu button.
    $("#openMenuButton").click(toggleMenu);
    $("#closeMenuButton").click(toggleMenu);

    $("#gamepadButton").click(() => {
        if (Main.systemState.gamePadActivated) {
            Main.systemState.gamePadActivated = false;
            $("#gamepadButton").removeClass("w3-deep-orange").addClass("w3-theme-d4");
        } else {
            Main.systemState.gamePadActivated = true;
            $("#gamepadButton").removeClass("w3-theme-d4").addClass("w3-deep-orange");
        }
    });

    $("#hideMenuButton").click( () => {
        // The arrow up is visible if and only if the menu is not hidden.
        if($("#menuArrowUp").is(":visible")) {
            $("#menuArrowUp").hide();
            $("#menuArrowDown").show();
            $("#menuButtonDiv").hide();
            $("#navigationBar").css("height", "auto");
            $("#panelDiv").css("height", "100%");
        } else {
            $("#menuArrowDown").hide();
            $("#menuArrowUp").show();
            $("#menuButtonDiv").show();
            $("#navigationBar").css("height", "40%");
            $("#panelDiv").css("height", "60%");
        }
    });

    // Init the navigation bar: Hide or show the respective menu panel.
    // Any button must have the id "[name]MenuButton" and its respective panel must have the id "[name]MenuPanel"
    // Any button must have the id "[name]MenuButton" and its respective accordion must have the id "[name]MenuButtonAccordion"
    // We exclude the buttons with class "extension" as they register their handlers separately.
    $(".menuButton").not(".extension").click(e => {
        hideMenuPanels();
        closeAccordions();
        restoreButtonBackgrounds();
        $("#"+e.target.id.replace("Button", "Panel")).show();
        markButton(e.target.id);
    });

    $(".accordionMenuButton").not(".extension").click(e => {
        hideMenuPanels();
        restoreButtonBackgrounds();
        $("#"+e.target.id.replace("Button", "Panel")).show();
        markButton(e.target.id);
        if (!($("#"+e.target.id+"Accordion").hasClass("w3-show"))) {
            closeAccordions();
            $("#"+e.target.id+"Accordion").addClass("w3-show");
        }
    });

    $(".subMenuButton").not(".extension").click(e => {
        hideMenuPanels();
        restoreSubMenuButtonBackgrounds();
        $("#"+e.target.id.replace("Button", "Panel")).show();
        markButton(e.target.id);
    });


    /* ++++++++++++++++++++++++++ LOAD DATA PANEL +++++++++++++++++++++++++++ */

    // Set the handler for clicking on the data source selector.
    setFormAction("dataSourceSelector", form => {
        Main.switchToDataSource(form.dataset.value);
    });

    // Set the handler for loading a file.
    setFormAction("fileUploadForm", form => {
        const file = form.upload.files[0];
        Main.loadKmlFile(file);
        uploadAndSendFile(file);
    });


    /* ++++++++++++++++++++++++ MOVEBANK LOGIN PANEL ++++++++++++++++++++++++ */

    // Add the submit action for the login form.
    setFormAction("loginForm", async form => {
        try {
            // Prevent clicking "login" again before this attempt is finished.
            form.submitButton.disabled = true;

            // Log in to Movebank, test whether the login credentials are valid.
            const username = form.username.value;
            const password = form.password.value;
            await movebank.login(username, password);

            // On success: change the menu (hide login, show studies), welcome
            $("#movebankLoginPanel").hide();
            $("#movebankDataPanel").show();
            $("#loggedInAs").text(username);
            alert("Welcome to TEAMWISE, " + username + "!");

            // Create the list of study entries to be shown in the scroll list.
            createStudyList(movebank.studies);
        } catch (error) {
            console.warn(error);
            alert("Login failed." + "\n\n" + error.message);
        } finally {
            // Clear the password field and enable the login button again.
            form.password.value = "";
            form.submitButton.disabled = false;
        }
    });

    // Set the action for the logout button.
    $("#logoutButton").click(function() {
        // Logout from Movebank and reset the menu.
        movebank.logout();
        $("#movebankLoginPanel").show();
        $("#movebankDataPanel").hide();
        $("#loggedInAs").html("");
    });

    /**
     * Creates a list item for every study in the list.
     * @param {Array<MovebankStudy>} studies the list of studies
     */
    function createStudyList(studies) {
        const studyList = $("#listOfStudies").empty();

        studies.forEach(study => {
            const entry = createListEntry({
                type: "radio",
                name: "study",
                value: study.id,
                description: study.name,
                onclick: event => onStudySelected(study, event.target)
            });
            studyList.append(entry);
        });
    }


    /* ++++++++++++++++++++++++ MOVEBANK DATA PANEL +++++++++++++++++++++++++ */

    // Set the study filtering action for the search form.
    setFormAction("searchStudyForm", form => {
        searchStudies(form.filter.value, form.query.value);
    });


    // Add a submit handler to the Movebank loading menu, that loads the
    // selected data (from a study and an animal).
    setFormAction("loadMbDataForm", async form => {
        // Get the study with the id of the checked radio button.
        const checkedStudy = parseInt(form.study.value);
        const study = movebank.studies.find(study => study.id === checkedStudy);

        // Get the animals that are checked in the list.
        const allAnimals = await study.getAnimals();
        const animals = allAnimals.filter((_a, i) => form.animals[i].checked);

        // Load the respective data.
        loadMbData(study, animals);
    });

    // Make the study marker hide or show on clicking the respective checkbox.
    setCheckboxAction("studyMarker", checked => {
        studyMarker.show = checked;
    });

    /* ++++++++++++++++++++++++ CAMERA SETUP PANEL +++++++++++++++++++++++++ */

    $("#camSet1").click(() => {
        setCameraAttachment(2, new Cesium.Cartesian3(-6.2, 0.0, 4.5), new Cesium.Cartesian3(1.2, 0.0, -0.5));
    });
    $("#camSet2").click(() => {
        setCameraAttachment(2, new Cesium.Cartesian3(-225.0, 0.0, 200.0), new Cesium.Cartesian3(1.0, 0.0, -0.8));
    });
    $("#camSet3").click(() => {
        setCameraAttachment(2, new Cesium.Cartesian3(-800.0, 0.0, 80.0), new Cesium.Cartesian3(1.0, 0.0, -0.1));
    });
    $("#camSet4").click(() => {
        setCameraAttachment(1, new Cesium.Cartesian3(-75.0, 0.0, 30.0), new Cesium.Cartesian3(1.0, 0.0, -0.35));
    });
    $("#camSet5").click(() => {
        setCameraAttachment(1, new Cesium.Cartesian3(0.0, 0.0, 50000.0), new Cesium.Cartesian3(0.0, 0.0, -1.0));
    });
    $("#camSet6").click(() => {
        setCameraAttachment(1, new Cesium.Cartesian3(0.0, 0.0, 2850000.0), new Cesium.Cartesian3(0.0, 0.0, -1.0));
    });
    $("#camSet7").click(() => {
        setCameraAttachment(0, undefined, undefined);
    });

    /* +++++++++++++++++++++++++++ SETTINGS PANEL +++++++++++++++++++++++++++ */

    // Add a handler for the data visulization options
    setCheckboxAction("lineChart", checked => {
        if (checked) {
            $("#d3panel").show();
        } else {
            $("#d3panel").hide();
        }
    });

    // Add a handler for 2D top view visualizztion options
    setCheckboxAction("2dView", checked => {
        if (checked) {
            $("#view2D").show();
        } else {
            $("#view2D").hide();
        }
    });

    // Add a handler for top moving info box view canvas options
    setCheckboxAction("moveInfoBox", checked => {
        if (checked) {
            $("#movingInfoBox").show();
        } else {
            $("#movingInfoBox").hide();
        }
    });

    /* +++++++++++++++++++++++++++ SETTINGS PANEL +++++++++++++++++++++++++++ */

    // Add a submit action to the settings form: Save the entered Ion key.
    setFormAction("settingsForm", form => {
        const newIonKey = form.ionKey.value.trim();

        let changed = false;

        // Override the loaded settings, if a new value is given.
        // This might have no effect to Cesium, but is needed to save them.
        if (newIonKey) {
            Main.CONFIG.ionKey = newIonKey;
            changed = true;
        }

        // Save the new settings.
        if (changed) {
            saveConfig();
        }
    });

    // Interpolation below, must be outside of jquery's `ready` function.

    // Hide or show the complete trajectory when the checkbox changes.
    setCheckboxAction("leadPath", checked => {
        fullTrajectory.show = checked;
    });

    // Hide or show the data points when clicking the respective checkbox.
    setCheckboxAction("dataPoints", checked => {
        dataPoints.forEach(point => {
            point.show = checked;
        });
    });
});

// Set the option for changing the interpolation algorithm.
// Needs the viewer, thus outside of the `ready` function as a startup task.
startupHandler.addAfterStartup(viewer => {
    $(function() {
        setCheckboxAction("interpolation", checked => {
            // Get the selected options from the settings menu.
            const options = getInterpolationOptions(checked);

            // Set the new interpolation in all entities of all data sources.
            for (let i = 0, n = viewer.dataSources.length; i < n; i++) {
                const animals = viewer.dataSources.get(i).entities.values;
                animals.forEach(entity => {
                    entity.position.setInterpolationOptions(options);
                });
            }
        });
    });
});

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* ++++++++++++++++++++++++++++ HELPER FUNCTIONS ++++++++++++++++++++++++++++ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

/**
 * Shows the navigation bar or hides the whole menu.
 */
function toggleMenu() {
    $("#sidebar").toggle();
    $("#openMenuButton").toggle();
    $("#gamepadButton").toggle();
    hideMenuPanels();
    closeAccordions();
    restoreButtonBackgrounds();
    if($("#menuArrowDown").is(":visible")) {
        $("#menuArrowDown").hide();
        $("#menuArrowUp").show();
        $("#menuButtonDiv").show();
        $("#navigationBar").css("height", "40%");
        $("#panelDiv").css("height", "60%");
    }
}


/**
 * Hides all menu panels, i.e. all DOM objects with class `"menuPanel"`.
 */
function hideMenuPanels() {
    $(".menuPanel").hide();
}

/**
 * This function marks the button with the given id as clicked.
 * @param {string} buttonId the html-id of the button that needs to be marked
 */
function markButton(buttonId) {
    const selection = $("#"+buttonId);
    if(selection.hasClass("menuButton") || selection.hasClass("accordionMenuButton")) {
        selection.removeClass("w3-theme-l2").addClass("w3-theme-d2");
    } else if(selection.hasClass("subMenuButton")){
        selection.removeClass("w3-theme-l3").addClass("w3-theme-d1");
    }
}

/**
 * Closes all accordions in the navigation bar. Of course, there should always only at most one expanded at a time, but instead of keeping track of the status of each individual accordion, we just close all.
 */
function closeAccordions() {
    $(".accordion").removeClass("w3-show");
}

/**
 * This restores the default color of any button in the side bar to make all buttons look unclicked.
 */
function restoreButtonBackgrounds() {
    $(".menuButton, .accordionMenuButton").removeClass("w3-theme-d2").addClass("w3-theme-l2");
    restoreSubMenuButtonBackgrounds();
}

/**
 * This restores the default color of only the submenu buttons.
 */
function restoreSubMenuButtonBackgrounds() {
    $(".subMenuButton").removeClass("w3-theme-d1").addClass("w3-theme-l3");
}


/**
 * Adjusts the prompted study list showing only studies matching the given
 * access filter (e.g. `i_can_see_data`) and search query.
 *
 * If `query` consists of multiple white space separated words, then every word
 * must occur in the study name in no particular order.
 * If `query` is the string representation of a number, studies with an id whose
 * first digits are the same as `query` are considered a match as well.
 * @param {string} filter one of the options of the selector
 * @param {string} query a string that the study name or id must match
 */
async function searchStudies(filter, query) {
    try {
        // Counts the number of found studies (console debug only).
        let matches = 0;

        // Split the search query at white space characters:
        // "String    with\t spaces." --> ["String", "with", "spaces."]
        const queryWords = query.toLowerCase().split(/\s+/);

        // The list of study objects from the movebank (requires login).
        const studies = movebank.studies;

        $("#listOfStudies").children().each((index, element) => {
            // Get the corresponding study to the list entry.
            const study = studies[index];

            // Check whether the study matches the search criteria.
            const matchFilter = filter === "all"
                    || filter === "owner" && study.i_am_owner
                    || filter === "data" && study.i_can_see_data;

            // Check whether the study matches the search query (in name or id).
            const studyName = study.name.toLowerCase();
            const matchName = queryWords.every(w => studyName.includes(w));
            const matchId = study.id.toString().startsWith(query);

            // Show an element if it passed the filter, hide the others.
            if (matchFilter && (matchName || matchId)) {
                $(element).show();
                matches++;
            } else {
                $(element).hide();
            }
        });

        console.log("Found " + matches + " studies.");
    } catch (error) {
        alert(error.message);
    }
}


/**
 * To be called when the selection indicator of the given study has changed.
 * @param {MovebankStudy} study the selected study
 * @param {HTMLLIElement} listEntry the list entry representing the study
 */
async function onStudySelected(study, listEntry) {
    // Adjust the study marker (position, label, infobox).
    updateStudyMarker(study);

    // Remove all other animals of the previous selected study.
    const list = $("#listOfAnimals");
    list.empty();

    const loadButton = $("#loadMbDataButton");

    try {
        // Fetch the list of animals to this study.
        const animals = await study.getAnimals(movebank);

        // Create a radio button entry for every animal.
        animals.forEach(animal => {
            const entry = createListEntry({
                type: "checkbox",
                name: "animals",
                value: animal.id,
                description: animal.local_identifier
            });
            list.append(entry);
        });

        // Activate the submit button, so that the selected data can be loaded.
        loadButton.prop("disabled", false);
    } catch (error) {
        console.warn(error);

        // The list of css tags for this entry's label.
        const classList = listEntry.labels[0].classList;

        // Show a "no Data" message only if it was not already shown.
        if (!classList.contains("disabled")) {
            alert(error.message.split("\n")[0]);
        }

        // No valid selection will be possible, deactivate the button.
        loadButton.prop("disabled", true);

        // No data can be loaded for this entry, highlight accordingly.
        if (error.message.startsWith(NO_DATA_AVAILABLE)) {
            classList.add("disabled");
            updateStudyMarker(study);
        }
    }


    /**
     * Uses the study information to update the study marker.
     * @param {MovebankStudy} study the selected study
     */
    function updateStudyMarker(study) {
        // Abbreviate the study name, if it is too long for the label.
        const MAX_NAME = 30;
        let shortName = study.name;
        if (shortName.length > MAX_NAME) {
            shortName = shortName.slice(0, MAX_NAME - 3) + "...";
        }

        // The color hints whether data is visible for this study.
        // This is mostly based on the "i_can_see_data" property which is buggy.
        let color;
        if (study.no_data_available) {
            color = Cesium.Color.LIGHTGREY;
        } else if (study.i_can_see_data) {
            color = Cesium.Color.LIGHTGREEN;
        } else {
            color = Cesium.Color.LIGHTCORAL;
        }

        // Update the study marker information.
        studyMarker.name = study.name;
        studyMarker.label.text = shortName;
        studyMarker.position = study.main_location;
        studyMarker.description = studyDescription(study);
        studyMarker.point.color = color;
    }
}

/**
 * Creates a marked up html string to be diplayed in the description box.
 * @param {MovebankStudy} study the study to describe
 * @returns {string} a description of that study
 */
function studyDescription(study) {
    const description = [];

    // These should always be available.
    description.push("<h3>", study.name, "</h3>");
    description.push("<p>", "Study-Id: ", study.id, "</p>");

    // Add various information if supplied.
    if (study.study_objective) {
        description.push("<p>", study.study_objective, "</p>");
    }
    if (study.acknowledgements) {
        description.push("<p>", study.acknowledgements, "</p>");
    }
    if (study.grants_used) {
        description.push("<p>", study.grants_used, "</p>");
    }
    if (study.citation) {
        description.push("<p>", study.citation, "</p>");
    }
    if (study.license_terms) {
        description.push("<p>", study.license_terms, "</p>");
    }

    return description.join("");
}


/**
 * Triggered when clicking on the load button.
 * @param {MovebankStudy} study the selected study
 * @param {Array<Animal>} animals the selected animals
 */
async function loadMbData(study, animals) {
    if (animals.length === 0) {
        alert("No animal selected");
    }

    // Wait until all requested entities are created before the data source is
    // added to the Cesium viewer.
    const dataSource = study.loadDataSource(animals, movebank);

    // Add the data source to the viewer and to the user interface.
    Main.initEntities(dataSource, Main.modelURI);
}


/**
 * Adds a new select option to the drop down of loaded data sources.
 * If no description is supplied, a generic entry is created.
 * @param {string} description what should be displayed in the selector
 * @param {string} collectionId the id of the data source's entity collection
 */
function addDataSourceOption(description, collectionId) {
    const select = $("#dataset");
    const option = document.createElement("option");
    option.value = collectionId;
    option.text = description || "Data source " + (select.length + 1);

    // Add the new option and make it the currently selected one.
    select.append(option, 0);
    select.val(collectionId);
}


/**
 * Send a request to the server to save the new configs.
 */
function saveConfig() {
    $.ajax("/config", {
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(Main.CONFIG),
        error: req => console.warn("Could not save config:\n", req.responseText),
        success: () => console.log("Saved config:", Main.CONFIG)
    });
}


/**
 * Returns the options to set the interpolation algorithm with, depending on the
 * given option or the current user settings.
 * @param {boolean} [polynomial] whether the algorithm is linear or polynomial
 */
function getInterpolationOptions(polynomial) {
    // If the parameter is not given, get it from the respective checkbox.
    if (polynomial === undefined) {
        polynomial = $("#interpolation").is(":checked");
    }
    const options = {};

    if (polynomial) {
        options.interpolationDegree = 5;
        options.interpolationAlgorithm = Cesium.HermitePolynomialApproximation;
    } else {
        options.interpolationDegree = 1;
        options.interpolationAlgorithm = Cesium.LinearApproximation;
    }

    return options;
}

/**
 * A callback to execute when a checkbox was clicked.
 * @callback CheckboxCallback
 * @param {boolean} checked the status of the checkbox
 * @returns {void}
 */

/**
 * A callback to execute when an event is triggered on an HTMLElement.
 * @callback EventCallback
 * @param {HTMLElement} target the element targeted by the event
 * @returns {void}
 */

/**
 * Sets an event handler for the given HTML element when the event is triggered.
 * @param {string | HTMLElement} element the element or its id
 * @param {string} on the name of the event
 * @param {EventCallback} callback the callback to execute
 */
function setOnEventAction(element, on, callback) {
    if (typeof element === "string") {
        element = "#" + element;
    }

    $(element).on(on, event => callback(event.target));
}

/**
 * Sets the event handler for the given input element when its status changes.
 * @param {string | HTMLInputElement} checkbox the checkbox or its id
 * @param {CheckboxCallback} callback the callback to execute
 */
function setCheckboxAction(checkbox, callback) {
    setOnEventAction(checkbox, "change", element => callback(element.checked));
}

/**
 * Sets the event handler for the given HTML form when submitting.
 * @param {string | HTMLFormElement} form the form or its id
 * @param {EventCallback} callback the callback to trigger on submit
 */
function setFormAction(form, callback) {
    setOnEventAction(form, "submit", callback);
}


/**
 * Creates a list entry item with a label and an input element.
 * @param {Object} options the options to pass to the list entry
 * @param {string} options.type the type of the input element
 * @param {string} options.name the name for the input element
 * @param {string} options.value the value of the input element
 * @param {string} options.description the displayed text of the label
 * @param {Function} [options.onclick] an onclick handler for the item
 */
function createListEntry(options) {
    const entry = document.createElement("li");
    const label = document.createElement("label");
    const input = document.createElement("input");
    const description = document.createTextNode(options.description);

    input.type = options.type;
    input.name = options.name;
    input.value = options.value;
    input.onclick = options.onclick;

    label.appendChild(input);
    label.appendChild(description);
    entry.appendChild(label);

    return entry;
}

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* ++++++++++ ENCAPSULATED MENU CLASSES AND FUNCTIONS FOR ADD-ONS +++++++++++ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

/**
 * Counts the number of button-panel pairs that have been added via JavaScript, in order to keep a consistent naming scheme.
 */
let extensionCount = 0;

/**
 * Encapsulates a card element inside a menu panel.
 */
class MenuPanelCard {

    /**
     * Constructor for a card.
     * @param {string} id The id-attribute that is placed inside the corresponding html-tag of this card.
     * This may later be used to hide the card or change its content.
     * @param {string} heading The heading of this particular card inside the panel.
     * @param {string} content The content of this card, formatted as html.
     * @param {boolean} initiallyVisible Whether the card is shown from the beginning or not.
     */
    constructor(id, heading, content, initiallyVisible) {
        this.id = id;
        this.heading = heading;
        this.content = content;
        this.initiallyVisible = initiallyVisible;
    }
}

/**
 * Encapsulates a menu panel, regardless of whether this will belong to a regular menu button or to a submenu button.
 */
class MenuPanel {

    /**
     * Constructs an empty menu panel with a heading.
     * @param {string} heading The heading of the new menu panel.
     */
    constructor(heading) {
        this.heading = heading;
        this.cards = [];
    }

    /**
     * Adds a new {@link MenuPanelCard} card to the menu panel. A card is a block inside the menu panel.
     * @param {string} id The id-attribute that is placed inside the corresponding html-tag of this card.
     * This may later be used to hide the card or change its content.
     * @param {string} heading The heading of this particular card inside the panel.
     * @param {string} content The content of this card, formatted as html.
     * @param {boolean} initiallyVisible Whether the card is shown from the beginning or not.
     */
    addCard(id, heading, content, initiallyVisible) {
        this.cards.push(new MenuPanelCard(id, heading, content, initiallyVisible));
    }
}

/**
 * Adds a regular menu button with the label {@link buttonLabel} to the menu bar.
 * Additionally, the {@link menuPanel} is added to the DOM-tree and the respective handlers are set up.
 * @param {string} buttonLabel The label of the new menu button
 * @param {MenuPanel} menuPanel The panel that belongs to this button.
 */
function createNormalMenuEntry(buttonLabel, menuPanel) {
    const index = ++extensionCount;
    const panelHtmlStr = createPanelHtmlString(menuPanel, index);
    const buttonHtmlStr = '<button id="extension' + index + 'MenuButton" class="w3-bar-item w3-button w3-theme-l2 w3-hover-theme menuButton extension">' + buttonLabel + "</button>" + "\n";
    $("#newButtonAnchor").before(buttonHtmlStr);
    $("#newMenuPanelAnchor").before(panelHtmlStr);
    $("#extension" + index + "MenuButton").click(e => {
        hideMenuPanels();
        closeAccordions();
        restoreButtonBackgrounds();
        $("#" + e.target.id.replace("Button", "Panel")).show();
        markButton(e.target.id);
    });
}

/**
 * Adds an accordion menu button with the label {@link buttonLabel} to the menu bar.
 * Additionally, the {@link mainPanel} is added to the DOM-tree and the respective handlers are set up such that this button refers to this panel.
 * Then, for each of the button labels in {@link listOfSubButtonLabels},
 * a sub menu button is created and placed in an accordion that belongs to the main button.
 * Accordingly, for each of the menu panels in {@link listOfSubMenuPanels}, a menu panel is created
 * and the corresponding handlers are registered that connect the buttons to the panels position by position.
 * @param {string} buttonLabel The label of the main button of this accordion.
 * @param {MenuPanel} mainPanel The main panel that is connected to the main button.
 * @param {string[]} listOfSubButtonLabels The labels of the sub buttons for this accordion.
 * @param {MenuPanel[]} listOfSubMenuPanels The labels of the sub panels for this accordion.
 */
function createAccordionMenuEntry(buttonLabel, mainPanel, listOfSubButtonLabels, listOfSubMenuPanels) {
    const outerIndex = ++extensionCount;
    const panelHtmlTags = [];
    const buttonHtmlTags = [];
    panelHtmlTags.push(createPanelHtmlString(mainPanel, outerIndex));
    buttonHtmlTags.push('<button id="extension' + outerIndex + 'MenuButton" class="w3-bar-item w3-button w3-theme-l2' +
        ' w3-hover-theme accordionMenuButton extension">' + buttonLabel + "</button>");
    if (listOfSubButtonLabels.length !== listOfSubMenuPanels.length) {
        throw "The number of buttons does not match the number of panels!";
    } else {
        buttonHtmlTags.push('<div id="extension' + outerIndex + 'MenuButtonAccordion" class="w3-hide accordion">');
        for (let i = 0; i < listOfSubButtonLabels.length; i++) {
            const index = ++extensionCount;
            const buttonLabel = listOfSubButtonLabels[i];
            const menuPanel = listOfSubMenuPanels[i];
            panelHtmlTags.push(createPanelHtmlString(menuPanel, index));
            buttonHtmlTags.push('<button id="extension' + index + 'MenuButton" class="w3-bar-item w3-button w3-leftbar w3-theme-l3 w3-hover-theme' +
                ' subMenuButton extension" style="border-color: #3c7bc9 !important; border-width: 10px !important">' + buttonLabel + "</button>");
        }
        buttonHtmlTags.push("</div>");
        $("#newButtonAnchor").before(buttonHtmlTags.join("\n"));
        $("#newMenuPanelAnchor").before(panelHtmlTags.join("\n"));

        $("#extension" + outerIndex + "MenuButton").click(e => {
            hideMenuPanels();
            restoreButtonBackgrounds();
            $("#" + e.target.id.replace("Button", "Panel")).show();
            markButton(e.target.id);
            if (!($("#" + e.target.id + "Accordion").hasClass("w3-show"))) {
                closeAccordions();
                $("#" + e.target.id + "Accordion").addClass("w3-show");
            }
        });

        for (let index = outerIndex + 1; index <= extensionCount; index++) {
            $("#extension" + index + "MenuButton").click(e => {
                hideMenuPanels();
                restoreSubMenuButtonBackgrounds();
                $("#" + e.target.id.replace("Button", "Panel")).show();
                markButton(e.target.id);
            });
        }
    }
}

/**
 * Adds an accordion menu entry that is adapted for an extension as it comes with the two sub menu entries "About" and "Licenses".
 * Adds an accordion menu button with the label {@link buttonLabel} to the menu bar.
 * Additionally, the {@link mainPanel} is added to the DOM-tree and the respective handlers are set up such that the button with label {@link buttonLabel} refers to this panel.
 * Then, for "About" and "Licenses", a sub menu button is created and placed in an accordion that belongs to the main button.
 * Accordingly, for the {@link aboutPanel} and the {@link licensesPanel}, a menu panel is created
 * and the corresponding handlers are registered that connect the buttons to the panels accordingly.
 * @param {string} buttonLabel The label of the main button of this accordion.
 * @param {MenuPanel} mainPanel The main panel that is connected to the main button.
 * @param {MenuPanel} aboutPanel The about panel that is automatically connected to an about button.
 * @param {MenuPanel} licensesPanel The licenses panel that is automatically connected to a licenses button.
 */
function createExtensionMenuEntry(buttonLabel, mainPanel, aboutPanel, licensesPanel) {
    createAccordionMenuEntry(buttonLabel, mainPanel, ["About", "Licenses"], [aboutPanel, licensesPanel]);
}

/**
 * Creates an html-string for the given menu panel, that also includes the cards that are specified as part of the panel.
 * @param {*} menuPanel The panel to be transformed to html
 * @param {*} extNumber The current number of button-panel pairs that have been created via code.
 * This is needed to ensure consistent id naming schemes inside the html tree.
 */
function createPanelHtmlString(menuPanel, extNumber) {
    const panelHtmlTags = [];
    panelHtmlTags.push('<div id="extension' + extNumber + 'MenuPanel" class="menuPanel" style="display: none; height: 100%">');
    panelHtmlTags.push('<div class="w3-container w3-theme-d2 w3-xlarge w3-display-container" style="height: 52px; overflow-x: hidden">');
    panelHtmlTags.push('<div class="w3-display-middle" style="white-space: nowrap">');
    panelHtmlTags.push(menuPanel.heading);
    panelHtmlTags.push("</div>");
    panelHtmlTags.push("</div>");
    panelHtmlTags.push('<div class="w3-theme-l5" style="height: calc(100% - 52px); overflow-y: auto">');
    panelHtmlTags.push('<div style="margin: 12px">');
    menuPanel.cards.forEach(card => {
        const display = card.initiallyVisible ? "" : ' style="display: none"';
        panelHtmlTags.push('<div class="w3-card-4 w3-panel w3-padding" id="' + card.id + '"' + display + ">");
        if (card.heading !== "" && card.heading !== undefined) {
            panelHtmlTags.push("<p><b>" + card.heading + "</b></p>");
        }
        panelHtmlTags.push(card.content);
        panelHtmlTags.push("</div>");
    });
    panelHtmlTags.push("</div>");
    panelHtmlTags.push("</div>");
    panelHtmlTags.push("</div>");
    return panelHtmlTags.join("\n");
}

/** Description of a standard callback
 * @callback ButtonCallback
 * @param {Event} someParameter The event for which the callback has been registered.
 * @return {void}
 */

/**
 * Creating a menu button that has no corresponding panel.
 * @param {string} buttonLabel The label for this button
 * @param {ButtonCallback} actionSpec A callback function that is registered on the button click.
 */
function addMenuButtonWithoutPanel(buttonLabel, actionSpec) {
    const index = ++extensionCount;
    const buttonHtmlStr = '<button id="extension' + index + 'MenuButton" class="w3-bar-item w3-button w3-theme-l2 w3-hover-theme menuButton extension">' + buttonLabel + "</button>" + "\n";
    $("#newButtonAnchor").before(buttonHtmlStr);
    $("#extension" + index + "MenuButton").click(e => {
        hideMenuPanels();
        closeAccordions();
        restoreButtonBackgrounds();
        markButton(e.target.id);
        actionSpec(e);
    });
}

/**
 * Adds a regular menu button with the label {@link buttonLabel} to the menu bar.
 * Additionally, the {@link menuPanel} is added to the DOM-tree and the respective handlers are set up.
 * Instead of placing the {@link menuPanel} right of the sidebar, this opens a full size panel that is placed above everything else and has a close button.
 * @param {string} buttonLabel The label of the new menu button.
 * @param {string} heading The heading of the new fullsize panel.
 * @param {string} content The content of the new fullsize panel, formatted as an `html` string.
 */
function addMenuButtonWithFullSizePanel(buttonLabel, heading, content) {
    const index = ++extensionCount;
    const panelHtmlTags = [];
    panelHtmlTags.push('<div id="extension' + index + 'MenuPanel" style="position: absolute; z-index: 4; opacity: 0.98; display: none; height: 100%; width: 100%">');
    panelHtmlTags.push('<div class="w3-bar w3-theme-d2 w3-xlarge w3-display-container" style="height: 52px; overflow-x: hidden">');
    panelHtmlTags.push('<div class="w3-bar-item w3-display-middle" style="white-space: nowrap">');
    panelHtmlTags.push(heading);
    panelHtmlTags.push("</div>");
    panelHtmlTags.push('<button id="closeExtension' + index + 'MenuPanel" class="w3-bar-item w3-right w3-button w3-transparent w3-hover-theme" style="height: 100%">&#10006</button>');
    panelHtmlTags.push("</div>");
    panelHtmlTags.push('<div class="w3-theme-l5" style="height: calc(100% - 52px); overflow-y: auto">');
    panelHtmlTags.push('<div style="margin: 12px">');
    panelHtmlTags.push(content);
    panelHtmlTags.push("</div>");
    panelHtmlTags.push("</div>");
    panelHtmlTags.push("</div>");
    const buttonHtmlStr = '<button id="extension' + index + 'MenuButton" class="w3-bar-item w3-button w3-theme-l2 w3-hover-theme menuButton extension">' + buttonLabel + "</button>" + "\n";
    $("#newButtonAnchor").before(buttonHtmlStr);
    $("body").prepend(panelHtmlTags.join("\n"));
    $("#extension" + index + "MenuButton").click(e => {
        $("#" + e.target.id.replace("Button", "Panel")).show();
    });
    $("#closeExtension" + index + "MenuPanel").click(() => {
        $("#extension" + index + "MenuPanel").hide();
        restoreButtonBackgrounds();
    });
}


// TODO: sort
export {
    addDataSourceOption,
    addMenuButtonWithFullSizePanel,
    addMenuButtonWithoutPanel,
    createAccordionMenuEntry,
    createExtensionMenuEntry,
    createNormalMenuEntry,
    getInterpolationOptions,
    MenuPanel,
    setCheckboxAction
};
