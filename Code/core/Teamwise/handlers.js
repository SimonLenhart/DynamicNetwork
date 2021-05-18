/*exported StartupHandler DataSourceChangedHandler EntityChangedHandler TimeChangedHandler*/

/**
 * Waits for tasks to be done before Cesium is started and executes callbacks to
 * start after the initialization has finished.
 */
class StartupHandler {
    /** @inheritdoc */
    constructor() {
        /**
         * The list of tasks to wait for before viewer initialization.
         * @type {Array<Promise<*>>}
         */
        this._preStartup = [];

        /**
         * The list of tasks to do after viewer initialization.
         * @type {Array<StartupCallback>}
         */
        this._postStartup = [];

        /**
         * Whether the post startup tasks have already been started.
         * @type {boolean}
         */
        this._startupRun = false;
    }

    /**
     * Adds an initialization task to the before-startup procedure.
     *
     * This function accepts a promise that resolves after completion of some
     * action that has to be finished before the viewer is created.
     * Note that Cesium will not start before all tasks have terminated, so
     * do not put heavy computation in these methods.
     * @param {Promise<*>} task a promise that wraps a task that needs to
     *     be executed before the viewer is created.
     */
    addBeforeStartup(task) {
        // No tasks must be added after the startup has run.
        if (this._startupRun) {
            throw new Error("Tasks cannot be added after startup has run.");
        }

        // Add the new task.
        if (task && task instanceof Promise) {
            this._preStartup.push(task);
        } else {
            throw new Error("Task must be a Promise");
        }
    }

    /**
     * Adds an initialization task to the after-startup procedure.
     *
     * This function accepts a callback that is called after creation of the
     * viewer. Viewer and sync mode are passed to the callback as parameters.
     * @param {StartupCallback} task a function to call after the viewer is
     *     initialized
     */
    addAfterStartup(task) {
        // No tasks must be added after the startup has run.
        if (this._startupRun) {
            throw new Error("Tasks cannot be added after startup has run.");
        }

        // Callbacks must be executable.
        if (task && typeof task === "function") {
            this._postStartup.push(task);
        } else {
            throw new Error("After startup callback must be a function");
        }
    }

    /**
     * Checks whether all pre-startup tasks are finished.
     * @returns {Promise<void>} a promise that resolves after all tasks completed
     */
    async tasksFinished() {
        // Stop other tasks from being added.
        this._startupRun = true;

        // Signalize whether all tasks are finished (but return nothing).
        await Promise.all(this._preStartup);
    }

    /**
     * Executes the initialization tasks that need the viewer.
     * @param {Cesium.Viewer} viewer the viewer
     * @param {string} mode the synchronization mode Teamwise is running in
     */
    afterViewerInit(viewer, mode) {
        this._postStartup.forEach(callback => callback(viewer, mode));
    }
}


/**
 * A handler that holds jobs to be executed when triggering the event listener
 * that this handler is assigned to.
 */
class EventHandler {
    /** @inheritdoc */
    constructor() {
        /**
         * Holds the registered callbacks.
         * @type {Array<ElementChangedCallback>}
         */
        this._jobs = [];

        /**
         * The element on which the latest callbacks were triggered.
         * @type {Observable}
         */
        this._previous = null;
    }

    /**
     * Add a callback to the handler that is executed when the handler runs.
     *
     * If the handler already contains this callback, it is not added again.
     * @param {ElementChangedCallback} callback the callback to execute
     * @returns {boolean} whether the callback was not contained before
     */
    add(callback) {
        const shouldAdd = !this.contains(callback);
        if (shouldAdd) {
            this._jobs.push(callback);
        }
        return shouldAdd;
    }

    /**
     * Checks whether the given callback is in the handler list.
     * @param {ElementChangedCallback} callback the callback to test
     * @returns {boolean} whether the handler contains this callback
     */
    contains(callback) {
        return this._jobs.includes(callback);
    }

    /**
     * Removes the given callback from the handler, if it is present.
     * @param {ElementChangedCallback} callback the callback to remove
     * @returns {boolean} whether the callback was contained
     */
    remove(callback) {
        const i = this._jobs.indexOf(callback);
        if (i >= 0) {
            this._jobs.splice(i, 1);
            return true;
        }
        return false;
    }

    /**
     * Runs all callbacks on the latest and the new element.
     * @param {Observable} current the new element to trigger the callbacks on
     * @param {Cesium.Viewer} viewer the viewer
     */
    run(current, viewer) {
        const previous = this._previous;
        this._previous = current;

        this._jobs.forEach(callback => callback(current, previous, viewer));
    }
}


/**
 * An event handler that fires when the selected data source changes.
 */
class DataSourceChangedHandler extends EventHandler {
}


/**
 * An event handler that fires when the selected entity changes.
 *
 * To prevent the user from selecting and thus firing callbacks on entities that
 * are for visualization only but should not be interacted with, these entities
 * can set to be ignored by the callbacks.
 */
class EntityChangedHandler extends EventHandler {
    /** @inheritdoc */
    constructor() {
        super();

        /**
         * Holds entities to be ignored by this handler.
         * @type {Set<Cesium.Entity>}
         */
        this._ignore = new Set();
    }

    /**
     * Marks an entity to be ignored when clicking on it, such that it will not
     * be the selected entity and no callbacks are run on the event.
     * @param {Cesium.Entity} entity the entity to ignore
     */
    ignore(entity) {
        this._ignore.add(entity);
    }

    /**
     * Runs the subscribed callbacks when the selected entity changed and the
     * currently selected entity is not set to be ignored.
     * @param {Cesium.Entity} current the selected entity
     * @param {Cesium.Viewer} viewer the viewer
     */
    run(current, viewer) {
        // if (!this._ignore.has(current)) {
        //     current = undefined;
        // }
        // EventHandler.prototype.run.call(this, current, viewer);

        if (current !== this._previous && !this._ignore.has(current)) {
            EventHandler.prototype.run.call(this, current, viewer);
        }
    }
}


/**
 * An event handler that fires when the time changes.
 *
 * As the time changes in the contained value and not through the assigned date
 * object, the event handler must be adapted by comparing the actual timestamps.
 */
class TimeChangedHandler extends EventHandler {
    /** @inheritdoc */
    constructor() {
        super();

        /**
         * Holds the time on which the handler was triggered last.
         * @type {Cesium.JulianDate}
         */
        this._previous = new Cesium.JulianDate();

        /**
         * This instance is passed to the callbacks to avoid exposing the
         * value that this handler relies on (callbacks might change the value).
         * Reusing this instance avoids creating a new object on every call.
         * @type {Cesium.JulianDate}
         */
        this._previousDummy = new Cesium.JulianDate();

        /**
         * This instance is passed to the callbacks to avoid exposing the
         * actual clock date instance (callbacks might change the value).
         * Reusing this instance avoids creating a new object on every call.
         * @type {Cesium.JulianDate}
         */
        this._currentDummy = new Cesium.JulianDate();
    }

    /**
     * Runs the subscribed callbacks only if the time did actually change from
     * the last call to this function.
     * @param {Cesium.JulianDate} time the current time
     * @param {Cesium.Viewer} viewer the viewer
     */
    run(time, viewer) {
        const previous = this._previousDummy;
        const current = this._currentDummy;

        // Only fire the callbacks if the time has actually changed.
        if (!Cesium.JulianDate.equals(time, this._previous)) {
            // Set the time for the callbacks.
            Cesium.JulianDate.clone(this._previous, previous);
            Cesium.JulianDate.clone(time, current);
            // Save the current time.
            Cesium.JulianDate.clone(time, this._previous);
            // Run the callbacks and pass the dummy instances only.
            this._jobs.forEach(callback => callback(current, previous, viewer));
        }
    }
}


/**
 * An initialization function to be called after the viewer was created.
 *
 * The callbacks are called with the instantiated viewer and the mode in which
 * Teamwise was started, which can be one of:
 * - `"basic"`: no synchronization
 * - `"master"`: the controlling instance of synchronization
 * - `"slave"`: a synchronized instance that is controlled by a master
 * - `"vr"`: a slave that may enter stereoscopic view
 * @callback StartupCallback
 * @param {Cesium.Viewer} viewer the viewer
 * @param {string} mode the synchronization mode Teamwise is running in
 * @returns {void}
 */

/**
 * An element that is observed by a handler.
 * @typedef {*} Observable
 */

/**
 * A callback that fires when the selected entity has changed.
 * @callback ElementChangedCallback
 * @param {Observable} current the new element, might be undefined
 * @param {Observable} previous the previous element, might be undefined
 * @param {Cesium.Viewer} viewer the viewer
 * @returns {void}
 */

/** Collects all tasks that must be done before starting Cesium. */
const startupHandler = new StartupHandler();

/** Handles tasks to execute when the selected data source changes. */
const onDataSourceChanged = new DataSourceChangedHandler();

/** Runs callbacks that are executed when the selection of an entity changes. */
const onEntityChanged = new EntityChangedHandler();

/** Runs the subscribed callbacks each time the clock time actually changes. */
const onTimeChanged = new TimeChangedHandler();

export {
    startupHandler,
    onDataSourceChanged,
    onEntityChanged,
    onTimeChanged
};
