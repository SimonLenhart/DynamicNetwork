To simplify and centralise working with Teamwise events and control flows,
Teamwise defines a number of handler classes, that can be subscribed to, to
define actions and processes that should be executed on specific events.

These are all defined and instantiated in `handlers.js` and have to be imported
from the modules that use them.

Currently there are two basic types of handlers:

# Startup Handler

As Teamwise heavily relies on the [Cesium](https://cesiumjs.org/) framework,
both visualisation and interaction tasks make use of the central Cesium
instance, the viewer object. The Teamwise core startup process therefore
includes (amongst others) the initialisation of the viewer in the Teamwise
webpage.

Due to the asynchronous programm flow in the startup, initialisation done by
individual program parts, i.e. other modules and extensions, has to be
communicated to the core and is delayed as necessary. It is possible to add
tasks that must be done before Cesium has started (because they affect the
creation of the viewer) and tasks to be done after the main startup process.
The former is mainly used by the main core itself and might be safely ignored by
other modules, while the latter is the only way to ensure that the viewer is
already created before accessing it.

- `addBeforeStartup`  
    To add tasks that delay the creation of the viewer, this function receives a
    promise, that resolves after the respective task has finished.
    Note that Cesium will not start before all tasks have terminated, so do not
    put heavy computation in here.

- `addAfterStartup`  
    This function accepts a `StartupCallback` that is executed after Teamwise
    was started and the viewer is instantiated. This callback receives the just
    created viewer and a string with the synchronisation mode in which Teamwise
    was started, such as `"basic"`, `"master"`, `"slave"` and `"vr"`.

# Event Handlers

For reoccuring events that change the state of the Teamwise session, there are
a number of handlers that can be subscribed to, to perform actions on their
respective observed event.

Every handler runs the enqueued callbacks whenever its observed element changes,
passing the reference to the current state, the previous state and a reference
to the `viewer`, to simplify visualisation modification.

Added callbacks can also be removed from the handler queue by passing the same
function reference to the `remove` method (This means that anonymous functions
created in the `add` method cannot be removed from the handler anymore.)

The current implementation includes the following special handler types:

## Data Source Changed

This handler runs when the selected data source changed, on loading new data
or when the focused data source is changed from the menu. The callback reveices
the current data source, the previously selected data source and the viewer.

## Entity Changed

This handler runs when the selected entity changed, e.g. when the user clicks on
a bird or deselects the current entity. The callback receives the currently and
previously selected entity and the viewer.

As most tasks assume that these entities are objects representing animals and
thus hold certain properties and data, other entities that are of visualisation
use only, such as lines, labels and dots, can be set to be ignored by this
handler. The handler will not run the callbacks when an `ignore`d entity is
selected and will still hold the reference to the previously selected entity.

Be careful to not change properties of the entities that might break the
behaviour of other application parts. Be aware that the order of execution of
different callbacks is not known in advance.

## Time Changed

This handler runs when the time of the clock has changed, by animation from the
clock widget or when the user clicks on the timeline. The callback reveives the
current and the previous time and the viewer. 

Note that Cesium uses date objects that wrap the actual time value and changing
time should adjust this value instead of creating new date objects. Changing the
date held by the clock object would therefore change the time of the whole
application. To avoid accidental manipulation of the application time, the
callbacks receive a dummy date object instead the object referenced by the
clock. However, as these objects are passed to every callback, you should *not*
change the time value in these objects to not falsen the value for others.

Also note that this is basically an `onTick` handler, so all computation in this
handler will directly (and might heavily) impact performance, eventually
reducing the frame rate.

--------------------------------------------------------------------------------

Note: While `mainCore.js` currently exports the `viewer` object, it is still
recommended to use the references passed to the individual callbacks where 
possible. This loosens coupling between different modules (eventually removing mutual dependencies), shortens the scope chain (local parameter vs. top level
variable) and ensures that no code uses uninitialised references.

Because modules cannot be imported from non-modular JavaScript, including the
browser's debug console, the viewer is also exposed to the global scope by
adding it to the `window` onject.
This global reference is created for debugging purposes only, such as accessing
Cesium objects from the console, and *should not be used* by actual code.
