After downloading and extracting the TEAMWISE framework, there is several obligatory, as well as optional, software that you need to install manually.

# Required Software (obligatory)
## node.js
In order to get the application running, you need the **node.js** runtime that is used to start a web server that hosts the application and a websocket server that enables synchronised views. For more information and the latest release, see [here](https://nodejs.org/).
The required additional **node** packages are listed in the `package.json` file in the **core** directory. In order to install them, you need to run the `npm install` command in the command line within the **core** directory.

# Starting the application

To start the application, you need to run the webserver. You can do so by navigating to the **core** directory on the command line and executing the `node server.js` command (or `node server.js --public` if you plan to run it across devices). This will execute the `server.js` code in the node environment. To start the websocket server, again navigate to the **core** directory on the command line and execute the `node syncServer.js` command. If you further wish to use the Movebank access, you need to run an R server in addition. To do this, you need to run the `server.R` (can be found in **core/Movebank**) in an R runtime.

The three steps described before can be executed automatically by running the `node tw.js` command in the **core** directory.

Having started the server, type `http://localhost:8080/Teamwise/` into the address bar of your browser.

# Entering a Cesium ion access token

In order to see the globe in the application, you need a Cesium ion access token. You can easily [sign up here](https://cesium.com/ion/signup?gs=true) in order to get one. You can then paste it into the `config.json` file which is located in the **core/Teamwise** directory and initially is set to `"ionKey": ""`.

# Using TEAMWISE across devices

To use TEAMWISE across devices inside a local network, you need to provide the IP address of the main device that is going to host the application and the websocket server. Just put the IP into the `config.json` file which is located in the **core/Teamwise** directory and is initially set to `"ip": "127.0.0.1"`.

In order to access TEAMWISE from other devices, you will then need to type `http://X.X.X.X:8080/Teamwise/` into the address bar of your browser, where `X.X.X.X` is just the placeholder for the actual IP address that you have specified.

# Required Software (optional)

## R
In order to download movement data from [MoveBank](https://www.movebank.org/), you need an installed version of **R**. Moreover, there are two specific **R**-packages required:
* **openCPU** to have an **R**-server running in the background. For more information see [here]()
* **move**, which is a package that provides functionality to access the movebank API through *R*
These packages are already shipped with TEAMWISE (see the **core/movebank** folder), so you don't need to worry about getting them.

## Python
In order to use the [leader-follower add-on] (), you need a **python** installation. Moreover, the following non-standard **python**-packages are required:
* **package**
* ...

## Cardboard
In order to use the mobile VR feature you need the Google Cardboard app from the app store on the respective smartphone.

# Settings
Moreover, you need to configure certain things in order to get the most out of the system.
## Enabling WebVR
n order to use the mobile VR feature you need to enable WebVR in your smartphones browser. We highly recommend to use the Google Chrome browser for this, as we also used this as main mobile browser during the development and testing.

For this, open Chrome and type **chrome://flags** into the address bar. In the following dialog just search for **WebVR** and enable it.


