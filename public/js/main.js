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

/**
 * Chat elements
 */
let chatInput = document.getElementById("inputChatMessage");
let chatList = $("#chat-message-list");


/**
 * screen handler
 */
//const screenHandler = new ScreenHandler();

// redirect if not https
if(location.href.substr(0,5) !== 'https') {
      location.href = 'https' + location.href.substr(4, location.href.length - 4)
}
  

/*******************************************************
 * CONFIGURATION : RTCPeerConnection 
 *******************************************************/ 

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
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        }
        /*
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
        */
    ]
}

/**
 * UserMedia constraints
 */
let constraints = {
    video: {
        width: 1980, // 최대 너비
        height: 1080, // 최대 높이
        frameRate: 10, // 최대 프레임
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
    }
}

constraints.video.facingMode = {
    ideal: "user"
}

/**
 * enabling the camera at startup
 */

navigator.mediaDevices.getUserMedia(constraints).then(stream => {    
    switch(meetingMode){
        case "class":
            if(myUserId == meetingHostId){
                hostVideo.srcObject = stream;
                hostVideoName.innerHTML = "나 (방장)";
            } else {
                let newPerson = document.createElement('div');
                newPerson.id = "person-iam";
        
                newPerson.className = "person audience";
                members.appendChild(newPerson);
                    
                let newVid = document.createElement('video')
                newVid.srcObject = stream
                newVid.id = "localVideo"
                newVid.playsinline = false
                newVid.autoplay = true
                newVid.muted = true
                newVid.controls = true
                newVid.className = "vid"
                newVid.poster = "./images/novideo3.png"
                newVid.onclick = () => openPictureMode(newVid)
                newVid.ontouchstart = (e) => openPictureMode(newVid)
                newPerson.appendChild(newVid);
        
                let newPersonName = document.createElement("div");
                newPersonName.className = "person-name";
                newPersonName.innerHTML = "나";
                newPerson.appendChild(newPersonName);
            }
            break;
        case "normal":  
        default:
            hostVideo.srcObject = stream;           
            hostVideoName.innerHTML = "나";
            if(myUserId == meetingHostId){
                hostVideoName.innerHTML = "나 (방장)";
            } 
    }

    localStream = stream; 
    init()

//}).catch(e => alert(`getusermedia error ${e.name}`))
}).catch(e => console.log(e))


/**
 * initialize the socket connections
 */
function init() {
    socket = io();   

    initUserSocket(socket.id);

    socket.on('chat message', function(chatData) {
        var chatItem = "";                         
        if(chatData.userId == myUserId){
            chatItem += "<li class='clearfix odd'>";
            chatItem += " <div class='conversation-text'>";
            chatItem += "    <div class='ctext-wrap'>";
            chatItem += "      <p>" + chatData.message + "</p>";
            chatItem += "    </div>";
            chatItem += "  </div>";
            chatItem += "</li>"
        } else {
            chatItem += "<li class='clearfix'>";
            chatItem += " <div class='conversation-text'>";
            chatItem += "    <div class='ctext-wrap'>";
            chatItem += "      <i>" + chatData.userName + "</i>";
            chatItem += "      <p>" + chatData.message + "</p>";
            chatItem += "    </div>";
            chatItem += "  </div>";
            chatItem += "</li>"
        }      

        chatList.append(chatItem);
        chatScroll();
    });

    socket.on('initReceive', data => {
        addPeer(data, false);
        socket.emit('initSend', data)
    })

    socket.on('initSend', data => {
        addPeer(data, true)
    })

    socket.on('removePeer', socket_id => {
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        console.log('GOT DISCONNECTED')
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })   
}


/**
 * initialize login user info on Socket
 */
function initUserSocket(socket_id){
    let hostYn = false;
    if(meetingHostId == myUserId){
        hostYn = true;
    }

    let userData = {
        "userId" : myUserId,
        "userName" : myUserName,
        hostYn : hostYn,
        socket_id : socket_id
    }
    socket.emit('init user', userData);
};


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
function addPeer(peer, am_initiator) {
    try{
        peers[peer.id] = new SimplePeer({
            initiator: am_initiator,
            stream: localStream,
            config: configuration
        })
    
        peers[peer.id].on('signal', data => {
            socket.emit('signal', {
                signal: data,
                socket_id: peer.id        
            })
        })
    
        peers[peer.id].on('stream', stream => {
           
            switch(meetingMode){
                case "class":
                    if(peer.hostYn){
                        hostVideo.srcObject = stream
                        hostVideoName.innerHTML = peer.userName +"(방장)";
                    } else {
                        let newPerson = document.createElement('div');
                        newPerson.id = "person-" + peer.id;        
                        newPerson.className = "person audience";
                        members.appendChild(newPerson);
            
                        let newVid = document.createElement('video')
                        newVid.srcObject = stream
                        newVid.id = peer.id
                        newVid.playsinline = false
                        newVid.autoplay = true
                        newVid.muted = false
                        newVid.className = "vid"
                        newVid.poster = "./images/novideo3.png"
                        newVid.onclick = () => openPictureMode(newVid)
                        newVid.ontouchstart = (e) => openPictureMode(newVid)
                        newPerson.appendChild(newVid);
            
                        let newPersonName = document.createElement("div");
                        newPersonName.className = "person-name";
                        newPersonName.innerHTML = peer.userName;        
                        newPerson.appendChild(newPersonName);
                    }
                    break;
                case "normal":  
                default:               
                    let newPerson = document.createElement('div');
                    newPerson.id = "person-" + peer.id;
                    newPerson.className = "col-lg-3 col-md-4 col-sm-6 person";
                    members.appendChild(newPerson);
                    
                    let newVid = document.createElement('video')
                    newVid.srcObject = stream
                    newVid.id = peer.id
                    newVid.playsinline = false
                    newVid.autoplay = true
                    newVid.muted = false
                    newVid.className = "vid"
                    newVid.poster = "./images/novideo3.png"
                    newVid.onclick = () => openPictureMode(newVid)
                    newVid.ontouchstart = (e) => openPictureMode(newVid)
                    newPerson.appendChild(newVid);
    
                    let newPersonName = document.createElement("div");
                    newPersonName.className = "person-name";
                    newPersonName.innerHTML = peer.userName;        
                    newPerson.appendChild(newPersonName);
                    
            }            
        
        })
    }  catch(error){
        console.error(error);
    }

   
}


/**
 * Opens an element in Picture-in-Picture mode
 * @param {HTMLVideoElement} el video element to put in pip mode
 */
function openPictureMode(el) {
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

    
    getMyVideo().srcObject = null
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
        getMyVideo().srcObject = stream

        updateDeviceButtons();
    })
}

/**
 * Enable screen share
 */
function setScreen() {
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
        getMyVideo().srcObject = localStream
        socket.emit('removeUpdatePeer', '')
    })
    updateDeviceButtons();
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

        getMyVideo().srcObject = null
    }

    for (let socket_id in peers) {
        removePeer(socket_id)
    }
}

/**
 * Get my video element
 */
function getMyVideo(){
    let myVideo;
    
    switch(meetingMode){
        case "class":
            if(myUserId == meetingHostId){
                myVideo = document.getElementById("hostVideo");
            } else {
                myVideo = document.getElementById("localVideo");
            }
            break;
        case "normal":  
        default: myVideo = document.getElementById("hostVideo"); break;            
    }
    return myVideo;
}

/**
 * send chat message
 */
function sendChat(){
    if (chatInput.value) {
        //peers[data.socket_id].signal(data.signal)
        //socket.emit('chatMessage', chatInput.value);
        let chatData = {
            "userId" : myUserId,
            "userName" : myUserName,
            "message" : chatInput.value
        }
        socket.emit('chat message', chatData);
        chatInput.value = '';
        saveChatLog(chatData);
    }
}




/*******************************************************
 * CONFIGURATION : VIDEO, MIC ON/OFF 
 *******************************************************/ 
const micOnOffSetting = $("#micOnOffSetting");
const micOnOffSettingLabel = $("#micOnOffSettingLabel");
const cameraOnOffSetting = $("#cameraOnOffSetting");
const cameraOnOffSettingLabel = $("#cameraOnOffSettingLabel");

// updating Device on/off buttons
function updateDeviceButtons() {
    
    for (let index in localStream.getVideoTracks()) {
        if(localStream.getVideoTracks()[index].enabled){
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='비디오 중지'></i>";
            cameraOnOffSetting.attr("checked", true);
            cameraOnOffSettingLabel.html("비디오 켜짐");
        } else {
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera-off text-danger noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='비디오 시작'></i>";
            cameraOnOffSetting.attr("checked", false);
            cameraOnOffSettingLabel.html("비디오 꺼짐");
        }
    }
    for (let index in localStream.getAudioTracks()) {
        if(localStream.getAudioTracks()[index].enabled){
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='음소거'></i>";
            micOnOffSetting.attr("checked", true);
            micOnOffSettingLabel.html("마이크 켜짐");
        } else {
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic-off text-danger noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='음소거 해제'></i>";
            micOnOffSetting.attr("checked", false);
            micOnOffSettingLabel.html("마이크 꺼짐");
        }
    }
    $(".tooltip").remove();
    $('[data-toggle="tooltip"]').tooltip();
}

// Enable/disable video
function toggleVid() {
    for (let index in localStream.getVideoTracks()) {
        localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
        if(localStream.getVideoTracks()[index].enabled){
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='비디오 중지'></i>";
            cameraOnOffSetting.attr("checked", true);
            cameraOnOffSettingLabel.html("비디오 켜짐");
        } else {
            btnCameraOnOffSetting.innerHTML = "<i class='fe-camera-off text-danger noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='비디오 시작'></i>";
            cameraOnOffSetting.attr("checked", false);
            cameraOnOffSettingLabel.html("비디오 꺼짐");
        }
    }
    $(".tooltip").remove();
    $('[data-toggle="tooltip"]').tooltip();
}

//Enable/disable microphone
function toggleMute() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled

        if(localStream.getAudioTracks()[index].enabled){
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='음소거'></i>";
            micOnOffSetting.attr("checked", true);
            micOnOffSettingLabel.html("마이크 켜짐");
            
        } else {
            btnMicOnOffSetting.innerHTML = "<i class='fe-mic-off text-danger noti-icon' data-toggle='tooltip' data-placement='bottom' title='' data-original-title='음소거 해제 '></i>";
            micOnOffSetting.attr("checked", false);
            micOnOffSettingLabel.html("마이크 꺼짐");
        }
    }
    $(".tooltip").remove();
    $('[data-toggle="tooltip"]').tooltip();
}


/**
 * Set Video Filter
 */
function setVideoFilter(filter) {
   getMyVideo().className = filter;
}


/*******************************************************
 * CONFIGURATION : VIDEO STREAM ON CAM / PC 
 *******************************************************/ 

/**
 * 비디오 엘리먼트에 재생을 위해 stream 바인딩
 * @param data
 */
function setVideoStream(data) {

    const tracks = localStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    });

    for (let socket_id in peers) {
        for (let index in peers[socket_id].streams[0].getTracks()) {
            for (let index2 in data.stream.getTracks()) {
                if (peers[socket_id].streams[0].getTracks()[index].kind === data.stream.getTracks()[index2].kind) {
                    peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], data.stream.getTracks()[index2], peers[socket_id].streams[0])
                    break;
                }
            }
        }
    }

    getMyVideo().srcObject = data.stream;
    localStream = data.stream;
}


 /**
 * 로컬 스트림 핸들링
 * @param stream
 */
function onLocalStream(stream) {
    //el: document.querySelector('#localVideo')
    setVideoStream({
        el: getMyVideo(),
        stream: stream,
    });
}

/**
 * screenHandler를 통해 캡쳐 API 호출
 */
function startScreenShare() {
    screenHandler.start((stream) => {
      onLocalStream(stream);
    });
}
/**
 * cam 송출
 */
function startCamShare() {
    const tracks = localStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    })

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

        getMyVideo().srcObject = stream;
        localStream = stream;   
    //}).catch(e => alert(`getusermedia error ${e.name}`))
    }).catch(e => alert("카메라가 없습니다"))
}



/***************************************************************************
 * CONFIGURATION FOR DEVICE SELECT
 ***************************************************************************/ 
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    const values = selectors.map(select => select.value);
    selectors.forEach(select => {
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
    });
    for (let i = 0; i !== deviceInfos.length; ++i) {
      const deviceInfo = deviceInfos[i];
      const option = document.createElement('option');
      option.value = deviceInfo.deviceId;
      if (deviceInfo.kind === 'audioinput') {
        option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
        audioInputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'audiooutput') {
        option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
        audioOutputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'videoinput') {
        option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
        videoSelect.appendChild(option);
      } else {
        console.log('Some other kind of source/device: ', deviceInfo);
      }
    }
    selectors.forEach((select, selectorIndex) => {
      if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
        select.value = values[selectorIndex];
      }
    });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(deviceHandleError);

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(sinkId)
            .then(() => {
            console.log(`Success, audio output device attached: ${sinkId}`);
            })
            .catch(error => {
            let errorMessage = error;
            if (error.name === 'SecurityError') {
                errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
            }
            console.error(errorMessage);
            // Jump back to first output device in the list as it's the default.
            audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

function changeAudioDestination() {
    const audioDestination = audioOutputSelect.value;
    attachSinkId(getMyVideo(), audioDestination);
}

// get stream info 
function gotStream(stream) {
    window.stream = stream; // make stream available to console
    getMyVideo().srcObject = stream;
    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
}

function deviceHandleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}
  

// Device electe event
function deviceSelected() {
    
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
        track.stop();
        });
    }
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        video: {deviceId: videoSource ? {exact: videoSource} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(deviceHandleError);

    console.log(getMyVideo());
    console.log(gotStream);
    //getMyVideo().srcObject = gotStream
}
  
audioInputSelect.onchange = deviceSelected;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = deviceSelected;
  

