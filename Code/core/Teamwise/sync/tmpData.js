/*eslint-env node*/
"use-strict";

const fs = require("fs");
const path = require("path");
const promisify = require("util").promisify;

/** The directory to save the temporary files into. */
const TEMP_DIR = path.join("Teamwise", "data", "tmp");

/**
 * Creates an empty temporary directory, possibly removing leftover data.
 */
async function create() {
    // callback wrapping
    const mkdir = promisify(fs.mkdir);

    try {
        // Create the directory, if it does not exist.
        await mkdir(TEMP_DIR);
    } catch (err) {
        // If the directory exists already, remove its content.
        if (err.code === "EEXIST") {
            return clearDirectory(TEMP_DIR);
        } else {
            throw err;
        }
    }
}

/**
 * Saves the file to a temporary directory. If a file with the given name exists
 * already, it will be replaced.
 * @param {string} name the file name
 * @param {any} data the file content
 * @returns {Promise<string>} a promise that resolves with the file's path
 */
async function saveFile(name, data) {
    // callback wrapping
    const mkdir = promisify(fs.mkdir);
    const writeFile = promisify(fs.writeFile);

    // Try to create the directory.
    try {
        await mkdir(TEMP_DIR);
    } catch (err) {
        // Just go on if it exists, otherwise cancel the operation.
        if (err.code !== "EEXIST") {
            throw err;
        }
    }
    // Save the file.
    const filePath = path.join(TEMP_DIR, name);
    await writeFile(filePath, data);

    return filePath;
}

/**
 * Removes the directory and all files it contains.
 * The directory must not contain any other directories.
 */
async function remove() {
    // callback wrapping
    const rmdir = promisify(fs.rmdir);

    try {
        await clearDirectory(TEMP_DIR);
    } catch (err) {
        // If the directory does not exist, we are done anyway.
        if (err.code === "ENOENT") {
            return;
        } else {
            // Some other error occured, operation failed.
            throw err;
        }
    }

    // Delete the (empty) directory.
    await rmdir(TEMP_DIR);
}

/**
 * Remove all files in the given directory.
 * The directory must not contain any subdirectories.
 * @param {string} dir the path to the directory
 */
async function clearDirectory(dir) {
    // callback wrapping
    const readdir = promisify(fs.readdir);
    const unlink = promisify(fs.unlink);

    // Check what is in the directory.
    const dirContent = await readdir(dir);

    // Delete all files in the directory.
    await Promise.all(
        dirContent.map(file => unlink(path.join(dir, file)))
    );
}

module.exports = {
    create,
    remove,
    saveFile
};
