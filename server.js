"use strict";

var net = require('net');
var fs = require('fs');
var os = require("os");
var readline = require("readline");
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');
// var cluster = require("cluster");

// var jsonData = {};
var outfile = "tmp.html";
var infile = "ips.txt";
// var outfile = "test.html";
// var infile = "ips1.txt";
var eventss = 400;
var ips;
var iplen = 0;

// if (cluster.isMaster) {

	var header = "<html>\n\
		<head>\n\
			<title>compilenix.org - ftpScan</title>\n\
		</head>\n\
		<body>\n\
			<h1>Scan started at: " + new Date().toUTCString() + "</h1>\n\
			<h3>\n\
				<a href=\"//compilenix.org/ftpscan\">compilenix.org/ftpscan</a><br>\n\
			</h3>\n\
			<p>\n\
				ftpscan archive: <a href=\"//compilenix.org/ftpscan/archive\">compilenix.org/ftpscan/archive/</a><br>\n\
			</p>";
	fs.writeFileSync(outfile, header, { encoding: "utf8", flag: "w" });

	var fsres = fs.readFileSync(infile, 'utf8');
	ips = fsres.split('\n');
	iplen = ips.length;

	function onExit() {
	// cluster.on('exit', function(worker, code, signal) {

		if ((iplen - (os.cpus().length * 10)) > ips.length) {
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(ips.length.toString());
			iplen = ips.length;
		}

		if (ips.length > 0) {
			// cluster.fork({ "ConnectToHost": ips.pop() });
			(function () { next(); })();
		} else {
			readline.cursorTo(process.stdout, 0);
		}

	// });
	}

	for (var i = eventss; i > 0; i--) {
	// for (var i = (os.cpus().length * 7); i > 0; i--) {
		if (ips.length > 0) {
			// cluster.fork({ "ConnectToHost": ips.pop() });
			onExit();
		}
	};

// } else {

	// if (ips.length > 1) {
		// Connect(process.env["ConnectToHost"]);
	// }
// }












// function getnext(ip) {
// 	if (ips.length > 1) {
// 		Connect(ips.pop());
// 	}
// }

// Connect('151.217.100.30');
// Connect('151.217.0.1');

function next() {
// function Connect(HOST) {
	var HOST = ips.pop();
	// console.log('...' + HOST);

	var client = new net.Socket();
	let firstLine = true;
	let firstLineData = "";
	let gotLIST = false;

	client.setTimeout(5000, function() {
		// console.log('timeout');
		client.end();
		client.destroy();
		// process.exit();
		onExit();
		// getnext();
	});

	client.connect(21, HOST, function() {
		// console.log('CONNECTED TO: ' + client.remoteAddress + ':' + client.remotePort);
		// client.write('\r\n');
		client.write("USER anonymous\nPASS 32c3\nPASV\nLIST\nQUIT\n");
	});

	client.on('error', function(err) {
		// console.log(err);
		client.destroy();
		// process.exit();
		onExit();
	});

	client.on('data', function(data) {

		data = encoder.htmlEncode(String(data));
		// console.log('DATA: ' + data);
		if (!(client.remoteAddress === undefined)) {

			if (firstLine) {
				firstLine = false;
				firstLineData = data;
				// console.log('<a href="ftp://' + client.remoteAddress + '/" target="_blank">' + client.remoteAddress + "</a><pre>" + data + "</pre>");
			}

			if (data.startsWith("227 Entering Passive Mode")) {
				var regex = /\(([0-9]).*,([0-9]).*\)/
				var result = (data.match(regex))[0];
				result = result.replace("(", "");
				result = result.replace(")", "");
				result = result.split(",");

				var a = result[result.length - 2] * 256;
				// console.log(a);
				var b = result[result.length - 1] * 1;
				// console.log(b);
				var port = a + b;
				// console.log(port);

				var client1 = new net.Socket();

				client1.setTimeout(10000, function() {
					// console.log('timeout');
					client1.end();
					client1.destroy();
					// getnext();
				});

				client1.on('error', function(err) {
					// console.log(err);
					client1.destroy();
				});

				client1.on("data", function (data1) {
					gotLIST = true;
					// console.log(String(data1));
					data1 = encoder.htmlEncode(String(data1));
					// console.log("<b><a href=\"ftp://" + client.remoteAddress + "/\" target=\"_blank\">" + client.remoteAddress + "</a></b><pre>" + data1 + "</pre>");
					fs.appendFileSync(outfile, "<b><a href=\"ftp://" + client.remoteAddress + "/\" target=\"_blank\">" + client.remoteAddress + "</a></b><pre>" + data1 + "</pre>\n", { encoding: "utf8" });
					client1.end();
					onExit();
					// process.exit();
				});

				client1.connect(port, HOST, function (err) {});
			}

			// if (jsonData === undefined) {
			// 	jsonData[client.remoteAddress] = data;
			// }
			// jsonData[client.remoteAddress] += data;
		}
		// client.end();
		onExit();
	});

	client.on('close', function() {
		if (!gotLIST && !firstLine) {
			fs.appendFileSync(outfile, "<b><a href=\"ftp://" + client.remoteAddress + "/\" target=\"_blank\">" + client.remoteAddress + "</a></b><pre>" + firstLineData + "</pre>\n", { encoding: "utf8" });
		}
		client.destroy();
		// process.exit();
	});
}

