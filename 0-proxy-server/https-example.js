var net = require('net');
var http = require('http');
var https = require('https');
var fs = require('fs');
let through = require('through')
let argv = require('yargs')
	.argv

let logStream = through(null, ()=>{})
logStream.pipe(argv.logfile ? fs.createWriteStream(argv.logfile) : process.stdout)

var baseAddress = 8001;
var httpAddress = 8000;
var httpsAddress = 7999;
var httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};

net.createServer(tcpConnection).listen(baseAddress);
http.createServer(echoConnection).listen(httpAddress);
https.createServer(httpsOptions, echoConnection).listen(httpsAddress);

function tcpConnection(conn) {
    logStream.write('\nInside proxy connection\n')
    conn.once('data', function (buf) {
        // A TLS handshake record starts with byte 22.
        var address = (buf[0] === 22) ? httpsAddress : httpAddress;
        logStream.write('\nBuffer : ' + buf +  '\n')
        logStream.write('\nProxying to Address : ' + address +  '\n')
        var proxy = net.createConnection(address, function () {
            proxy.write(buf);
            conn.pipe(proxy).pipe(conn);
        });
    });
}

function echoConnection(req, res) {
		if (req.connection.encrypted) { // Check if the request is not HTTPS
			logStream.write('\nInside encrypted\n')
		} else {
			logStream.write('\nInside NON encrypted\n')
		}

		logStream.write('\nInside echoConnection\n')
		logStream.write('\nEcho Request: \n' + JSON.stringify(req.headers) + '\n')
	    for (let header in req.headers) {
	        res.setHeader(header, req.headers[header])
	    }
	    //through(req, logStream, {autoDestroy:false})
	    req.pipe(logStream)

	    req.pipe(res)
}
