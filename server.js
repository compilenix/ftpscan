"use strict";

let Netmask = require("netmask").Netmask;
let FtpScanner = require("./lib/FtpScanner.js");

let outfile = "tmp.html";
let countOfParalellJobWorker = 400;
let ipAddressBlock = new Netmask("151.217.0.0/16");
let ipAddresses = [];

ipAddressBlock.forEach((ip) => {
	ipAddresses.push(ip);
});
// ipAddresses.push("151.217.173.21");

let ftpScanner = new FtpScanner(ipAddresses, outfile, undefined);
ftpScanner.WriteOutputHeaderHtml("compilenix.org", "ftpscan", "archive");

for (var i = countOfParalellJobWorker; i > 0; i--) {
	if (ipAddresses.length > 0) {
		ftpScanner.StartProcessingOfNextJob();
	}
}
