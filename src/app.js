const fs = require('fs')
const path = require('path')
const express = require('express')
const app = express()
const httpolyglot = require('httpolyglot')
const https = require('https')

//////// CONFIGURATION ///////////

// insert your own ssl certificate and keys
const options = {
    pfx: fs.readFileSync(path.join(__dirname,'..','ssl','pfx.pfx'), 'utf-8'),
    passphrase: '65452',
    minVersion: "TLSv1.2"
    //key: fs.readFileSync(path.join(__dirname,'..','ssl','key.pem'), 'utf-8'),
    //cert: fs.readFileSync(path.join(__dirname,'..','ssl','cert.pem'), 'utf-8')
}

const port = 443//process.env.PORT || 443

////////////////////////////

require('./routes')(app)

const httpsServer = httpolyglot.createServer(options, app)
const io = require('socket.io')(httpsServer)
require('./socketController')(io)


httpsServer.listen(port, () => {
    console.log(`listening on port ${port}`)
})


  
  





