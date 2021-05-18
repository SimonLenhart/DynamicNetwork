/*eslint-env node*/

const cp = require("child_process");

cp.exec("node server.js --public");
cp.exec("node syncServer.js --public");
cp.exec("Rscript.exe ./Teamwise/movebank/server.R");
