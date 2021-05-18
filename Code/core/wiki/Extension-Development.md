There are a few instructions and guidelines for the development of extensions for TEAMWISE. First of all, there is an example extension that is shipped with TEAMWISE and can be seen as an extension development tutorial. You find it at **core/extensions/example_extension**.

The most important point is that any extension has to be located in an own directory that itself needs to be put in the **core/extensions** directory. Important is that for any extension, inside its directory there has to be a **js** file with the same name as the directory. For example, the example extension that is shipped with TEAMWISE has a file called `example_extension.js` which is placed in a directory called `example_extension`.  

The extension mechanism works as follows: On server start, the **extension** directory is parsed and for any directory `exDir` that is found, the file `exDir/exDir.js`is added to the `main.html` file to be loaded as a module. The resulting **html** file is then created, stored and deployed as `index.html`.

Please note that the file `[extname]/[extname].js` is the only entry point of the extension. The toplevel code inside this file will be executed and any further modules, that may belong to the extension, need to be loaded/accesses from within this file.

## Creating menu entries

TEAMWISE provides several functions to add content to the built-in menu. The respective functions can be found in the `menu.js` module. To learn more about their usage, please check out the example extension and/or the developers API. You can import these functions via the `import {createExtensionMenuEntry, addMenuButtonWithoutPanel, addMenuButtonWithFullSizePanel, setCheckboxAction, MenuPanel} from "../../Teamwise/menu.js";` statement at the beginning of your extensions code.

| function name | effect|
| ------ | ------ |
| createNormalMenuEntry | creates a normal menu entry with a connected menu panel.|
| createAccordionMenuEntry | creates an accordion menu entry with several sub menu entries.| 
| createExtensionMenuEntry | creates a minimal accordion menu entry for an extension that already contains the submenus **About** and **Licenses**.| 
| addMenuButtonWithoutPanel | creates a menu button without a panel. You can directly put any action on it.|
| addMenuButtonWithFullSizePanel | creates a menu button that is connected to a fullsize menu panel which overlays the whole system.|