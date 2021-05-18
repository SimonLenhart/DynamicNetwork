# Description of Directories and Files

`core` contains the actual application code and files used in and for the
development process. Its content is described below.

## `Build/Cesium`

Contains the (minified) Cesium source code. 

The unminified and unbuilt code and the documentation that is shipped with
Cesium on download or when installing the node package (`npm install cesium`)
was recently removed to reduce the size of the software.

The hierarchy might therefore be flattened down to just a `cesium/` directory in
the future or merged with other third party software.

Note:
The Cesium code was adapted du to complications with webVR and is
therefore shipped separately (not as a node dependency). This must be revised
when updating to a newer version of Cesium. If future versions are not affected
anymore, or there is an automated or in-code solution, then Cesium could be
added as a regular dependecy, moving the code into the `node_modules` directory.

## `extensions`

This directory contains extensions or plugins to the Teamwise core.

An extension consists of a directory that is placed inside the `extensions`
directory, containing the source code for the extension with at least a file
of the name `<extension_name>.js`, where `<extension_name>` matches the name of
the respective directory. This file is supposed to be the main module of the
extension and the only file that is included into the application.

Further information about writing extensions and how extensions are included
into Teamwise is given in [Extension Development](Extension-Development).

## `Teamwise`

This directory contains the core application of Teamwise.

Note:
Due to recent changes in the application architecture, this directory
should be renamed to `core`, while the parent directory should actually be named
`Teamwise`. Users as well as developers should be prepared to adapt to this
inversion of the directory hierarchy.

### `data`

Contains data files that are saved on the server.

Files in this directory can be shared between multiple clients. To not override
data that was put in here, the server will create temporary files to hold data
uploaded from the browser in sync mode, that can then be accessed by other
instances.

Note that temporary data will be removed when the server is shut down.

### `images`

Contains example image files that are displayed on the start page.

### `models`

Contains 3D models of birds that are used to represent an entity in Cesium.

### `movebank`

Contains the code used to access and load data from the
[Movebank](https://www.movebank.org)

- `movebank.js`  
    A module that encapsulates the access to the Movebank. It is used to
    - log into Movebank,
    - load the list of studies and the animals associated with a study,
    - load movement data from a study to be visualised in Teamwise.

- `ocpuCalls.js`  
    This file holds functions to wrap calls made by Teamwise to the OpenCPU
    library (especially from the `move` package).

- `opencpu.js`  
    The OpenCPU JavaScript library, to wrap http requests sent from the browser
    to the R server. Might eventually be moved to some "third party" directory.

- `server.R`  
    A short R script, that starts an OpenCPU server to include R based
    calcluation into the browser application. Automaticall loads and installs
    the required packages with their dependencies (currently the
    [`move`](https://CRAN.R-project.org/package=move) and
    [`opencpu`](https://CRAN.R-project.org/package=opencpu) packages).

### `styles`

Contains `*.css` files to define the formatting of the Teamwise website.

- `chart.css`  
    Defines the style rules for the live information and D3 chart overlays.

- `frontpage.css`  
    Defines the style rules of the welcome page.

- `menu.css`  
    Defines the style rules of the menu.

- `view2d.css`  
    Defines the style rules for the *picture in picture* top down view overlay.

### `sync`

Contains the code that is used to synchronise multiple clients via a websocket
connection.

- `syncModules.js`  
    Connects to the websocket to send and receive messages that synchronise the
    status of multiple Teamwise instances.

- `tmpData.js`  
    A node module used by the server to save and organise temporary data that
    was uplaoded from Teamwise to be shared between multiple clients.

### `vr`

Contains code for the optional VR mode, run on smartphones (in cardboard mode)
or compatible HMDs. To facilitate usage, clients in vr mode are controlled by a
remote master instance and have reduced interaction.

- `mainVRbasic.js`  
    Adapts the regular Teamwise application to run in stereoscopic vr mode when
    the respective mode is lauched (button in the bottom right corner).

- `vrGampad.js`  
    Contains code to use a connected gamepad (currently Sony Dualshock 4 only)
    for easier navigation between and selection of displayed animals.

### other files

- `config.json`  
    A configuration file, holds the adress for the websocket, server ports, ion
    keys etc.

- `d3visualisations.js`  
    Code to visualize additional information and charts using the 
    [D3](https://d3js.org) framework.

- `handlers.js`  
    Defines handler classes to organise the startup process of Teamwise and to
    subscribe to specific events, such as switching between data or entities.
    For a detailed description see [here](Handlers).

- `main.html`  
    The Teamwise webpage.  
    Note that this file is only a template holding the core content and code of
    the webpage to lauch. It must be completed by the server on startup, at the
    same time adding extensions from the respective folder to the application.

- `mainCore.js`  
    This is the main application code.  
    It is used for startup, runs Cesium and provides core functionalities, such
    as loading of data.

- `menu.js`  
    Initialises the menu, adding actions to buttons or forms and defines
    functions that are mainly of interactive purposes such as clicking on a
    checkbox.
 

## other files

- `.eslintrc.js`  
    The configuration file for the rules used by [eslint](https://eslint.org).

- `CHANGES.md`  
    The change log file (Cesium legacy file).

- `favicon.ico`  
    The icon that is used by the browser to be shown in the tab (currently adopted
    from Cesium).

- `index.html`  
    The welcome page of Teamwise. This page is shown when the root directory of
    the server is accessed.

- `LICENSE.md`  
    The license file for the application. Currently Apache 2.0, contravening the
    entry in `package.json` (Cesium legacy file).

- `package-lock.json`  
    Holds information about the tree of package dependencies and installed
    versions. Is created automatically on `npm install` and must not be changed
    manually.

- `package.json`  
    Contains the npm description of the application that might be used for
    future deployment and specifies the needed npm packages that are added to
    `core/node_modules` on `npm install`.

- `server.js`  
    The server-side main application.  
    This script opens an http server that can be accessed from the browser to
    start Teamwise, handles temporary data shared between multiple clients and
    includes extensions that are added to the
    [`extensions` directory](#extensions).

- `syncServer.js`  
    The script to start a websocket for the synchronisation of multiple clients.
    Might eventually be moved into `server.js` to be started automatically (as a
    local module).
