/**
 * Socket.io socket
 */
let socket;
/**
 * The stream object used to send media
 */
let localStream = null;
/**
 * All peer connections
 */
let peers = {}


let chatForm = document.getElementById("chat-form");
let chatInput = document.getElementById("inputChatMessage");
let chatList = $("#chat-message-list");

// redirect if not https
if(location.href.substr(0,5) !== 'https') {
      location.href = 'https' + location.href.substr(4, location.href.length - 4)
}
  

//////////// CONFIGURATION //////////////////

/**
 * RTCPeerConnection configuration 
 */
const configuration = {
    "iceServers": [{
            "urls": "stun:stun.l.google.com:19302"
        },
        // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
        // set your own servers here
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
}

/**
 * UserMedia constraints
 */
let constraints = {
    audio: true,
    video: {
        width: {
            max: 300
        },
        height: {
            max: 300
        }
    }
}

/////////////////////////////////////////////////////////

constraints.video.facingMode = {
    ideal: "user"
}

// enabling the camera at startup
navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    console.log('Received local stream');

    localVideo.srcObject = stream;
    localStream = stream;

    console.log("getUserMedia");

    init()

}).catch(e => alert(`getusermedia error ${e.name}`))

/**
 * initialize the socket connections
 */
function init() {

    socket = io();   
  
    chatForm.addEventListener('submit', function(e) {
        let mySocketId = 
        e.preventDefault();
        if (chatInput.value) {
            //peers[data.socket_id].signal(data.signal)
            //socket.emit('chatMessage', chatInput.value);
            let chatData = {
                "userid" : 1,
                "userName" : "홍바울",
                "message" : chatInput.value
            }
            console.log("sendData : " + chatData)
            socket.emit('chat message', chatData);
            chatInput.value = '';
            console.log(mySocketId);
            //console.log(peers[socket_id]);
        }
    });
    
  
    socket.on('chat message', function(chatData) {
        console.log(chatData);
        var chatItem = "";
        chatItem += "<li class='clearfix'>";
        chatItem += " <div class='conversation-text'>";
        chatItem += "    <div class='ctext-wrap'>";
        chatItem += "      <i>" + chatData.userName + "</i>";
        chatItem += "      <p>" + chatData.message + "</p>";
        chatItem += "    </div>";
        chatItem += "  </div>";
        chatItem += "</li>"

        chatList.append(chatItem);
        console.log(chatItem);

        chatScroll();
    });

    

    socket.on('initReceive', socket_id => {
        console.log('INIT RECEIVE ' + socket_id)
        addPeer(socket_id, false)
        socket.emit('initSend', socket_id)
    })

    socket.on('initSend', socket_id => {
        console.log('INIT SEND ' + socket_id)
        addPeer(socket_id, true)
    })

    socket.on('removePeer', socket_id => {
        console.log('removing peer ' + socket_id)
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        console.log('GOT DISCONNECTED')
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        console.log("SIGNAL : " + data.socket_id);
        peers[data.socket_id].signal(data.signal)
    })

    socket.on('chatMessage', data => {
        console.log("chat message : " + data);
       // peers[data.socket_id].signal(data.signal)
    })

  

   
}

/**
 * Remove a peer with given socket_id. 
 * Removes the video element and deletes the connection
 * @param {String} socket_id 
 */
function removePeer(socket_id) {

    let videoEl = document.getElementById(socket_id)
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        videoEl.parentNode.removeChild(videoEl)
    }

    let personEl = document.getElementById("person-" + socket_id);
    if (personEl) {
        personEl.parentNode.removeChild(personEl)
    }
    
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
}

/**
 * Creates a new peer connection and sets the event listeners
 * @param {String} socket_id 
 *                 ID of the peer
 * @param {Boolean} am_initiator 
 *                  Set to true if the peer initiates the connection process.
 *                  Set to false if the peer receives the connection. 
 */
function addPeer(socket_id, am_initiator) {
    console.log("add peer");
    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        stream: localStream,
        config: configuration
    })

 
    /*
    peers[socket_id].on('chatMessage', message => {
        console.log("on chat");
        socket.emit('chatMessage', {
            message: message,
            socket_id: socket_id
        })
    })
    */
   

    peers[socket_id].on('signal', data => {
        console.log("on signal");
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    peers[socket_id].on('stream', stream => {
        let newPerson = document.createElement('div')
        newPerson.className = "col-lg-3 col-md-4 col-sm-6 person";
        newPerson.id = "person-" + socket_id;
        videos.appendChild(newPerson);

        let newVid = document.createElement('video')
        newVid.srcObject = stream
        newVid.id = socket_id
        newVid.playsinline = false
        newVid.autoplay = true
        newVid.className = "vid"
        newVid.onclick = () => openPictureMode(newVid)
        newVid.ontouchstart = (e) => openPictureMode(newVid)
        newPerson.appendChild(newVid);

        //let newPersonName = document.createElement("div");
        //newPersonName.className = "person-name";
        //newPersonName.innerHTML = socket_id;
        //newPerson.appendChild(newPersonName);
    })
}

/**
 * Opens an element in Picture-in-Picture mode
 * @param {HTMLVideoElement} el video element to put in pip mode
 */
function openPictureMode(el) {
    console.log('opening pip')
    el.requestPictureInPicture()
}

/**
 * Switches the camera between user and environment. It will just enable the camera 2 cameras not supported.
 */
function switchMedia() {
    if (constraints.video.facingMode.ideal === 'user') {
        constraints.video.facingMode.ideal = 'environment'
    } else {
        constraints.video.facingMode.ideal = 'user'
    }

    const tracks = localStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    })

    localVideo.srcObject = null
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {

        for (let socket_id in peers) {
            for (let index in peers[socket_id].streams[0].getTracks()) {
                for (let index2 in stream.getTracks()) {
                    if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                        peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])                    
                        break;
                    }
                }
            }
        }

        localStream = stream
        localVideo.srcObject = stream

        updateButtons()
    })
}

/**
 * Enable screen share
 */
function setScreen() {
    console.log("set screen");
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        for (let socket_id in peers) {
            for (let index in peers[socket_id].streams[0].getTracks()) {
                for (let index2 in stream.getTracks()) {
                    if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                        peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                        break;
                    }
                }
            }

        }
        localStream = stream

        localVideo.srcObject = localStream
        socket.emit('removeUpdatePeer', '')
    })
    updateButtons()
}



/**
 * updating text of buttons
 */
function updateButtons() {
    for (let index in localStream.getVideoTracks()) {
        if(localStream.getVideoTracks()[index].enabled){
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera noti-icon'></i>";
        } else {
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera-off text-danger noti-icon'></i>";
        }
    }
    for (let index in localStream.getAudioTracks()) {
        if(localStream.getAudioTracks()[index].enabled){
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic noti-icon'></i>";
        } else {
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic-off text-danger noti-icon'></i>";
        }
    }
}

/**
 * Disables and removes the local stream and all the connections to other peers.
 */
function removeLocalStream() {
    if (localStream) {
        const tracks = localStream.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        localVideo.srcObject = null
    }

    for (let socket_id in peers) {
        removePeer(socket_id)
    }
}

/**
 * Enable/disable microphone
 */
function toggleMute() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled

        if(localStream.getAudioTracks()[index].enabled){
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic noti-icon'></i>";
        } else {
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic-off text-danger noti-icon'></i>";
        }
    }
}
/**
 * Enable/disable video
 */
function toggleVid() {
    for (let index in localStream.getVideoTracks()) {
        localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
        if(localStream.getVideoTracks()[index].enabled){
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera noti-icon'></i>";
        } else {
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera-off text-danger  noti-icon'></i>";
        }
    }
}


