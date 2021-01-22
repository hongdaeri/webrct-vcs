peers = {}


module.exports = (io) => {

   
    io.on('connect', (socket) => {
        console.log('a client is connected');
  
        
        // Initiate the connection process as soon as the client connects
        peers[socket.id] = socket
            
        // Asking all other clients to setup the peer connection receiver
        for(let id in peers) {
            if(id === socket.id) continue
            console.log('sending init receive to ' + socket.id)
           
            console.log(socket.userName);
            let data = {
                "id" : socket.id,
                "userId" : socket.userId,
                "userName" : socket.userName
            };

            peers[id].emit('initReceive', data)
        }

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on('initSend', init_socket_data => {
            console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_data.id);

            let data = {
                "id" : socket.id,
                "userId" : socket.userId,
                "userName" : socket.userName
            };

            peers[init_socket_data.id].emit('initSend', data)
        })

        /**
         * relay a peerconnection signal to a specific socket
         */
        socket.on('signal', data => {
            console.log('sending signal from ' + socket.id + ' to ', data)
            if(!peers[data.socket_id])return
            peers[data.socket_id].emit('signal', {
                socket_id: socket.id,
                signal: data.signal
            })
        })

        /**
         * remove the disconnected peer connection from all other connected clients
         */
        socket.on('disconnect', () => {
            console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

     


        /**
         * CHAT MESSAGE
         */
        socket.on('chat message', chatData => {
            io.emit('chat message', chatData);
        });

        /**
         * INIT USER INFO 
         */
        socket.on('init user', data => {
            console.log("init user");
            peers[socket.id].userId = data.userId;
            peers[socket.id].userName = data.userName;

            console.log("userid : " + peers[socket.id].userId);
            console.log("userName : " + peers[socket.id].userName);
            
        });
    })
}

