const path = require('path')
const express = require('express')

module.exports = (app) => {

    // redirect http traffic to https traffic
    /*app.use('*', (req, res, next) => {
        if(!req.socket.encrypted){
            console.log('unsecure connection: redirecting..')
            res.redirect('https://' + req.headers.host + req.path)
        } else {
            next()
        }
    })*/

   // app.use(express.static(path.join(__dirname, '..','public')))
   // app.use(express.static(path.join(__dirname, '..','node_modules')))

    app.get('/room/:id', function(req, res) {
        //res.sendFile(path.join(__dirname, '/public/test.html'));
        res.sendFile("../public/index.html");
       // res.sendFile((path.join(__dirname, '..','node_modules')));
    })
}