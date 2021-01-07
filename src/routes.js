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

  
    app.get('/room/:number', function(req, res) {
        var user_id = req.param('id');
        var user_name = req.param('name'); 
        app.use(express.static(path.join(__dirname, '..','public')))
        app.use(express.static(path.join(__dirname, '..','node_modules')))
    });
}