"use strict";

let net = require("net");
let fs = require("fs");
let readline = require("readline");
let Encoder = require("node-html-encoder").Encoder;
let encoder = new Encoder("entity");

class FtpScanner {

	/**
	 * @param {string[]} ipAddresses
	 * @param {string} outFileHtml
	 * @param {string} outFileJson
	 */
	constructor(ipAddresses, outFileHtml, outFileJson) {
		this.outFileHtml = outFileHtml;
		this.outFileJson = outFileJson;
		this.ipAddresses = ipAddresses;
		this.ipAddressesCount = ipAddresses.length;
		this.outputBuffer = "";
		this.done = false;
	}

	/**
	 * @param {string} targetDomain Domain
	 * @param {string} urlRelativeBasePath http://example.com/$urlRelativeBasePath/
	 * @param {string} urlRelativeArchivePath http://example.com/.../$urlRelativeArchivePath/
	 * @param {string} outputFilePath output.html
	 */
	WriteOutputHeaderHtml(targetDomain, urlRelativeBasePath, urlRelativeArchivePath) {
		let header = "<html>\n" +
			"<head>\n" +
			"<title>" + targetDomain + " - ftpScan</title>\n" +
			"<style type=\"text/css\">body{font-family:monospace;} .fileListEntry{background-color:#ececec;}</style>\n" +
			"</head>\n" +
			"<body>\n" +
			"<h1>Scan started at: " + new Date().toUTCString() + "</h1>\n" +
			"<h3>\n<a href=\"//" + targetDomain + "/" + urlRelativeBasePath + "\">" + targetDomain + "/" + urlRelativeBasePath + "</a><br>\n</h3>\n" +
			"<p>\n" +
			"ftpscan archive: <a href=\"//" + targetDomain + "/" + urlRelativeBasePath + "/" + urlRelativeArchivePath + "\">" + targetDomain + "/" + urlRelativeBasePath + "/" + urlRelativeArchivePath + "/</a><br>\n" +
			"</p>\n";

		this.WriteHtmlToOutputFile(header);
		this.UpdateStdOut(true);
	}

	StartProcessingOfNextJob() {
		this.UpdateStdOut();

		if (this.ipAddresses.length > 0) {
			(() => this.ProcessJob())();
		} else if (!this.done) {
			this.done = true;
			process.stdout.write('\n');
		}
	}

	/**
	 * @param {boolean} force
	 */
	UpdateStdOut(force) {
		if (force || (this.ipAddresses.length % 10 === 0)) {
			this.ResetCursor();
			readline.cursorTo(process.stdout, 0);
			process.stdout.write("             ");
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(this.ipAddresses.length.toString());
		}
	}

	ResetCursor() {
		readline.cursorTo(process.stdout, 0);
	}

	/**
	 * @param {string} content
	 */
	AppendHtmlToOutputFile(content) {
		fs.appendFileSync(this.outFileHtml, content, { encoding: "utf8" });
		//this.outputBuffer += content;
	}

	/**
	 * @param {string} content
	 */
	WriteHtmlToOutputFile(content) {
		fs.appendFileSync(this.outFileHtml, content, { encoding: "utf8" });
	}

	/**
	 * @param {string} ipAddress
	 * @param {string} data
	 */
	AddOutputFtpServer(ipAddress, data) {
		this.AppendHtmlToOutputFile("<b><a href=\"ftp://" + ipAddress + "/\" target=\"_blank\">" + ipAddress + "</a></b><pre class=\"fileListEntry\">" + data + "</pre>\n");
	}

	ProcessJob() {
		let serverIpAddress = this.ipAddresses.pop();
		let tcpSocket = new net.Socket();
		let firstLine = true;
		let firstLineData = "";
		let firstLineDataHtmlEncoded = "";
		let gotDirectoryListing = false;

		tcpSocket.setTimeout(5000, () => {
			tcpSocket.end();
			tcpSocket.destroy();
			this.StartProcessingOfNextJob();
		});

		tcpSocket.connect(21, serverIpAddress, () => {
			tcpSocket.write("USER anonymous\nPASS 33c3\nPASV\nLIST\nQUIT\n");
		});

		tcpSocket.on("error", (error) => {

			switch (error.code) {
				case "ECONNREFUSED":
				case "EHOSTUNREACH":
				case "ECONNRESET":
				case "ENOPROTOOPT":
				case "ENETUNREACH":
					break;
				default:
					console.log(error);
					break;
			}

			tcpSocket.destroy();
			this.StartProcessingOfNextJob();
		});

		tcpSocket.on("data", (data) => {
			data = encoder.htmlEncode(String(data));

			if (tcpSocket.remoteAddress !== undefined) {
				if (firstLine) {
					firstLine = false;
					firstLineData = data;
					firstLineDataHtmlEncoded = encoder.htmlEncode(String(firstLineData));
				}

				if (data.startsWith("227 Entering Passive Mode")) {
					let regex = /\(([0-9]).*,([0-9]).*\)/;
					let regexResult = (data.match(regex))[0];
					regexResult = regexResult.replace("(", "");
					regexResult = regexResult.replace(")", "");
					regexResult = regexResult.split(",");

					let a = regexResult[regexResult.length - 2] * 256;
					let b = regexResult[regexResult.length - 1] * 1;
					let port = a + b;

					let tcpSocketPassiveMode = new net.Socket();

					tcpSocketPassiveMode.setTimeout(10000, () => {
						tcpSocketPassiveMode.end();
						tcpSocketPassiveMode.destroy();
					});

					tcpSocketPassiveMode.on("error", () => {
						tcpSocketPassiveMode.destroy();
					});

					tcpSocketPassiveMode.on("data", (dataHtmlEncoded) => {
						gotDirectoryListing = true;
						dataHtmlEncoded = encoder.htmlEncode(String(dataHtmlEncoded));
						this.AddOutputFtpServer(tcpSocket.remoteAddress, dataHtmlEncoded);
						tcpSocketPassiveMode.end();
						tcpSocketPassiveMode.destroy();
						this.StartProcessingOfNextJob();
					});

					tcpSocketPassiveMode.connect(port, serverIpAddress, () => {});
				}
			}

			this.StartProcessingOfNextJob();
			tcpSocket.end();
			tcpSocket.destroy();
		});

		tcpSocket.on("close", () => {
			if (!gotDirectoryListing && !firstLine) {
				this.AddOutputFtpServer(tcpSocket.remoteAddress, firstLineDataHtmlEncoded);
			}

			tcpSocket.destroy();
		});
	}
}

module.exports = FtpScanner;
