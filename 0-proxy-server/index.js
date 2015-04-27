let http = require('http')
let request = require('request')
let path = require('path')
let fs = require('fs')
let through = require('through')

let argv = require('yargs')
    .usage('babel-node index.js [options]')
    .alias('p', 'port')
    .alias('x', 'host')
    .alias('l', 'logfile')
    .alias('u', 'url')
    .alias('h', 'help')
    .describe('p', 'Specify a forwarding port')
    .describe('x', 'Specify a forwarding host')
    .describe('l', 'Specify a output log file')
    .describe('u', 'Specify forwarding host:port, this will override --host and --port value')
    .describe('h', 'Show help')
    .help('h')
    .example('babel-node index.js -p 8001 -x google.com', '')
    .epilog('Copyright @CodePath @WalmartLabs')
    .default('host', '127.0.0.1')
    .argv
let scheme = 'http://'
let port = argv.port || argv.host === '127.0.0.1'  ?  8000 : 80
let destinationUrl = argv.url || scheme + argv.host + ':' + port

//let logPath = argv.log && path.join(__dirname, argv.log)
// Create a passthrough stream that doesn't close
let logStream = through(null, ()=>{})
logStream.pipe(argv.logfile ? fs.createWriteStream(argv.logfile) : process.stdout)
console.log('argv' + JSON.stringify(argv))
//var logStream = argv.log ? fs.createWriteStream(argv.log) : process.stdout;


http.createServer((req, res) => {

	logStream.write('\nEcho Request: \n' + JSON.stringify(req.headers) + '\n')
    for (let header in req.headers) {
        res.setHeader(header, req.headers[header])
    }
    //through(req, logStream, {autoDestroy:false})
    req.pipe(logStream)

    req.pipe(res)
}).listen(8000)

logStream.write('Echo Server Started on http://127.0.0.1:8000\n')


http.createServer((req, res) => {
 
    logStream.write('\nProxy Request headers: \n' + JSON.stringify(req.headers) + '\n')
    //through(req, logStream, {autoDestroy:false})
    req.pipe(logStream) 
    let url = destinationUrl
    if(req.headers['x-destination-url']){
        logStream.write('Using provided x-destination-url = ' + req.headers['x-destination-url']) 
    	url = req.headers['x-destination-url']
        delete req.headers['x-destination-url']
    }

    logStream.write(`\nProxying request to: ${url + req.url}`)
    let options = {
        method: req.method,
        headers: req.headers,
        url: url + req.url
    }


    let downstreamResponse = req.pipe(request(options)) 
    logStream.write('\nProxy Response headers: \n' + JSON.stringify(downstreamResponse.headers) + '\n')
    //through(downstreamResponse, logStream, {autoDestroy:false})
    downstreamResponse.pipe(logStream)

    downstreamResponse.pipe(res)

}).listen(8001)

logStream.write('Proxy Server Started on http://127.0.0.1:8001\n')
