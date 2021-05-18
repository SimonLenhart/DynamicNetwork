/*eslint-env node*/
/*eslint quotes: [error, single], no-var: off*/
'use strict';
(function() {
    var express = require('express');
    var compression = require('compression');
    var fs = require('fs');
    var url = require('url');
    var request = require('request');

    var gzipHeader = Buffer.from('1F8B08', 'hex');

    var yargs = require('yargs').options({
        'port' : {
            'default' : 8080,
            'description' : 'Port to listen on.'
        },
        'public' : {
            'type' : 'boolean',
            'description' : 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy' : {
            'description' : 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts' : {
            'description' : 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help' : {
            'alias' : 'h',
            'type' : 'boolean',
            'description' : 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    // eventually this mime type configuration will need to change
    // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
    // *NOTE* Any changes you make here must be mirrored in web.config.
    var mime = express.static.mime;
    mime.define({
        'application/json' : ['czml', 'json', 'geojson', 'topojson'],
        'application/wasm' : ['wasm'],
        'image/crn' : ['crn'],
        'image/ktx' : ['ktx'],
        'model/gltf+json' : ['gltf'],
        'model/gltf-binary' : ['bgltf', 'glb'],
        'application/octet-stream' : ['b3dm', 'pnts', 'i3dm', 'cmpt', 'geom', 'vctr'],
        'text/plain' : ['glsl']
    }, true);

    var app = express();
    app.use(compression());
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    function checkGzipAndNext(req, res, next) {
        var reqUrl = url.parse(req.url, true);
        var filePath = reqUrl.pathname.substring(1);

        var readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
        readStream.on('error', function(err) {
            next();
        });

        readStream.on('data', function(chunk) {
            if (chunk.equals(gzipHeader)) {
                res.header('Content-Encoding', 'gzip');
            }
            next();
        });
    }

    var knownTilesetFormats = [/\.b3dm/, /\.pnts/, /\.i3dm/, /\.cmpt/, /\.glb/, /\.geom/, /\.vctr/, /tileset.*\.json$/];
    app.get(knownTilesetFormats, checkGzipAndNext);

    app.use(express.static(__dirname));

    function getRemoteUrlFromParam(req) {
        var remoteUrl = req.params[0];
        if (remoteUrl) {
            // add http:// to the URL if no protocol is present
            if (!/^https?:\/\//.test(remoteUrl)) {
                remoteUrl = 'http://' + remoteUrl;
            }
            remoteUrl = url.parse(remoteUrl);
            // copy query string
            remoteUrl.search = url.parse(req.url).search;
        }
        return remoteUrl;
    }

    var dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        var result = {};
        // filter out headers that are listed in the regex above
        Object.keys(headers).forEach(function(name) {
            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }

    var upstreamProxy = argv['upstream-proxy'];
    var bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {
        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function(host) {
            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }

    app.get('/proxy/*', function(req, res, next) {
        // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
        var remoteUrl = getRemoteUrlFromParam(req);
        if (!remoteUrl) {
            // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
            remoteUrl = Object.keys(req.query)[0];
            if (remoteUrl) {
                remoteUrl = url.parse(remoteUrl);
            }
        }

        if (!remoteUrl) {
            return res.status(400).send('No url specified.');
        }

        if (!remoteUrl.protocol) {
            remoteUrl.protocol = 'http:';
        }

        var proxy;
        if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
            proxy = upstreamProxy;
        }

        // encoding : null means "body" passed to the callback will be raw bytes

        request.get({
            url : url.format(remoteUrl),
            headers : filterHeaders(req, req.headers),
            encoding : null,
            proxy : proxy
        }, function(error, response, body) {
            var code = 500;

            if (response) {
                code = response.statusCode;
                res.header(filterHeaders(req, response.headers));
            }

            res.status(code).send(body);
        });
    });

    /* ++++++++++++++++++++++++ Include extensions. +++++++++++++++++++++++++ */

    const promisify = require('util').promisify;
    (async function() {
        const path = require('path');
        const promisify = require('util').promisify;

        // function wrapping
        const copyFile = promisify(fs.copyFile);
        const readdir = promisify(fs.readdir);
        const appendFile = promisify(fs.appendFile);

        // The directory in which the extensions have to be placed.
        const EXT_DIR = 'extensions';

        // The source and destiny to create the web page.
        const source = path.join('Teamwise', 'main.html');
        const dest = path.join('Teamwise', 'index.html');

        try {
            // Copy the main content of the page.
            await copyFile(source, dest);

            // Get the list of extensions from the extensions directory.
            let dirContent;
            try {
                dirContent = await readdir(EXT_DIR);
            } catch (err) {
                console.log('Could not import extensions, start base version.');
                dirContent = [];
            }

            // List the found extensions.
            console.log('Found', dirContent.length, 'extensions:');
            dirContent.forEach(dirName => {
                console.log('  -', dirName);
            });

            const htmlTags = dirContent.map(dirName => {
                // Not using path.join() because <script> `src` always uses '/'.
                const path = ['..', EXT_DIR, dirName, dirName + '.js'].join('/');
                return '<script type="module" src="' + path + '"></script>';
            });

            htmlTags.push('</body>', '</html>', '');

            await appendFile(dest, htmlTags.join('\n'));
        } catch (err) {
            console.log('Error: Could not create webpage.');
            console.log(err);
            process.exit(1);
        }
    })();

    /* ++++++++++++++++++ Save config file (ion keys etc.) ++++++++++++++++++ */

    const bodyParser = require('body-parser');
    app.use(bodyParser.json());
    app.put('/config/', async (req, res) => {
        // Validate the message, to be nonempty and of type object.
        if (!req.body || typeof req.body !== 'object') {
            res.sendStatus(400);
            return;
        }

        // Overwrite the old file with the new config data.
        const content = JSON.stringify(req.body, null, 4) + '\n';
        try {
            const writeFile = promisify(fs.writeFile);
            await writeFile('Teamwise/Sync/web-config.json', content);

            console.log('Saved new config file.');
            res.sendStatus(200);
        } catch (err) {
            console.log('Error: Could not save config file.');
            console.log(err);
            res.status(500).send(err);
        }
    });

    /* +++++++++++ Upload data files to share with synced slaves. +++++++++++ */

    const path = require('path');
    const fileUpload = require('express-fileupload');
    const tmpData = require('./Teamwise/sync/tmpData');

    // Create (or clear existing) temp directory.
    tmpData.create().catch(err => {
        console.log('Could not initialize temp directory.\n', err);
    });

    // Respond to upload requests.
    app.use(fileUpload());
    app.put('/tmp/', async (req, res) => {
        if (!req.files || !req.files.file) {
            res.sendStatus(400);
            return;
        }

        const file = req.files.file;

        // Save the file.
        try {
            let filePath = await tmpData.saveFile(file.name, file.data);
            // The website is already located at Teamwise.
            filePath = path.relative('Teamwise', filePath);
            // Because in the browser all paths are with '/'.
            filePath = filePath.replace(/\\/g, '/');

            // On success, tell the client that (and where) the file was saved.
            res.status(201).location(filePath).send(filePath);
        } catch (err) {
            console.log('Could not save file.', err);
            res.status(500).send(err);
        }
    });

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    var server = app.listen(argv.port, argv.public ? undefined : 'localhost', function() {
        if (argv.public) {
            console.log('Cesium development server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('Cesium development server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });

    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    server.on('close', function() {
        console.log('Cesium development server stopped.');
    });

    var isFirstSig = true;
    process.on('SIGINT', async function() {
        if (isFirstSig) {
            // Remove the temp data folder and all files in it.
            try {
                await tmpData.remove();
            } catch (err) {
                console.log('Could not remove temp directory:', err);
            }

            // Remove the index.html file.
            const dest = 'Teamwise/index.html';
            try {
                const unlink = promisify(fs.unlink);
                await unlink(dest);
            } catch (err) {
                console.log('Could not remove', dest);
            }

            console.log('Cesium development server shutting down.');
            server.close(function() {
                process.exit(0);
            });
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });

})();
