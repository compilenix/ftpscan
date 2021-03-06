'use strict'

const Netmask = require('netmask').Netmask
let FtpScanner = require('./lib/FtpScanner.js')

let outfile = 'tmp.html'
let countOfParalellJobWorker = 400
let ipAddressBlock = new Netmask('151.217.0.0/16') // CCC Event IPv4 Subnet
let ipAddresses = []

ipAddressBlock.forEach(addr => ipAddresses.push(addr))

let ftpScanner = new FtpScanner(ipAddresses, /** outFileHtml */ outfile, /** outFileJson */ undefined)
ftpScanner.WriteOutputHeaderHtml('compilenix.org', 'ftpscan', 'archive')

for (var i = countOfParalellJobWorker; i > 0; i--) {
  if (ipAddresses.length > 0) {
    ftpScanner.StartProcessingOfNextJob()
  }
}
