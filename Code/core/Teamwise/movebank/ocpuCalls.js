/*global ocpu*/

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/* ++++++++++++++ A list of wrapper functions to the R server. ++++++++++++++ */
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

// Set the move package as the root of the R session, if a server is running.
$.ajax("//localhost:5656/ocpu/library/move/R/", {
    error: () => console.warn("No R server running or package not installed."),
    success: () => ocpu.seturl("//localhost:5656/ocpu/library/move/R")
});

/**
 * An object referencing the result of an R-function call, that can be passed to
 * other functions as an intermediate result.
 * @typedef {Object} Session
 * @property {Function<string, number>} getConsole
 * @property {Function} getFile
 * @property {Function} getFileURL Path of the file w.r.t. working directory. (required)
 * @property {Function} getKey Read the session ID. For debugging only.
 * @property {Function} getLoc Read the session URL. For debugging only.
 * @property {Function} getObject
 * @property {Function} getSource
 * @property {Function} getStdout
 * @property {string} key
 * @property {string} loc
 * @property {Array<string>} output
 * @property {string} txt
 */

/**
 * A wrapper for stateful calls to the OpenCPU server.
 * @param {string} func the name of the R function
 * @param {Object} param the parameter for the function
 * @returns {Promise<Session>} the R session holding the result of the function
 */
function ocpuCall(func, param) {
    return new Promise((resolve, reject) => {
        ocpu.call(func, param, session => resolve(session))
            .fail(req => reject(new Error(req.responseText)));
    });
}

/**
 * A wrapper for stateless remote procedure calls to the OpenCPU server.
 * @param {string} func the name of the R function
 * @param {Object} param the parameter for the function
 * @returns {Promise<*>} the result of the calculation
 */
function ocpuRPC(func, param) {
    return new Promise((resolve, reject) => {
        ocpu.rpc(func, param, result => resolve(result))
            .fail(req => reject(new Error(req.responseText)));
    });
}

/**
 * Loads the list of all studies contained in the Movebank with their meta data.
 * @param {Session} loginData the Movebank login
 * @returns {Promise<Array<Object>>} the list of study data
 */
function loadAllStudies(loginData) {
    return ocpuRPC("getMovebank", {
        entity_type: "study",
        login: loginData
    });
}

/**
 * Loads the list of all animals associated with the given study.
 * @param {number} studyId the id of the study
 * @param {Session} loginData the Movebank login
 * @returns {Promise<Array<Object>>} the list of animal data
 */
function loadAnimals(studyId, loginData) {
    return ocpuRPC("getMovebank", {
        entity_type: "individual",
        study_id: studyId,
        login: loginData
    });
}

/**
 * Loads the list of deployments associated with the given animal and study.
 * @param {number} studyId the identifier of the study
 * @param {number} animalId the identifier of the animal
 * @param {Session} loginData the Movebank login
 * @returns {Promise<Array<Object>>} the list of deployment data
 */
function loadDeployments(studyId, animalId, loginData) {
    return ocpuRPC("getMovebank", {
        entity_type: "deployment",
        study_id: studyId,
        individual_id: animalId,
        login: loginData
    });
}

/**
 * Loads the data as a `move` object to the given animal and study.
 * @param {number} studyId the identifier of the study
 * @param {number} animalId the identifier of the animal
 * @param {Session} loginData the Movebank login
 * @returns {Promise<Session>} the `move` object holding the data
 */
function loadData(studyId, animalId, loginData) {
    return ocpuCall("getMovebankData", {
        study: studyId,
        // This seems to be a documentation error in the move-Package.
        animalName: animalId,
        login: loginData
    });
}

/**
 * Extracts the movement data contained in a `move` object.
 * @param {Session} moveObj the `move` object holding the data
 * @returns {Promise<Array<Object>>} the recorded data
 */
function extractData(moveObj) {
    return ocpuRPC("../../methods/R/slot", {
        object: moveObj,
        name: "data"
    });
}

/**
 * Creates a login object to be passed to functions to validate Movebank access.
 * @param {string} username the Movebank username
 * @param {string} password the Movebank password
 * @returns {Promise<Session>} a Movebank login object
 */
function createLogin(username, password) {
    return ocpuCall("movebankLogin", {
        username: username,
        password: password
    });
}

export {
    createLogin,
    extractData,
    loadAllStudies,
    loadAnimals,
    loadData,
    loadDeployments
};
