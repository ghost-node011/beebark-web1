// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import Peer from 'simple-peer';
// import Sidebar from '../components/Sidebar';
// import TopBar from '../components/TopBar';
// import { useSocket } from '../context/SocketContext';
// import { useAuth } from '../context/AuthContext';
// import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
// import { Input } from '../components/ui/input';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
// import { Button } from '../components/ui/button';
// import { toast } from 'sonner';
// import { FiSend, FiPhone, FiVideo, FiImage, FiPaperclip, FiPhoneOff, FiMic, FiMicOff, FiVideoOff, FiArrowLeft } from 'react-icons/fi';
// import { API_URL } from '../config/api';

// const Chat = () => {
//   const [connections, setConnections] = useState([]);
//   const [selectedConnection, setSelectedConnection] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [inCall, setInCall] = useState(false);
//   const [callType, setCallType] = useState(null); // 'audio' or 'video'
//   const [receivingCall, setReceivingCall] = useState(false);
//   const [caller, setCaller] = useState(null);
//   const [callerSignal, setCallerSignal] = useState(null);
//   const [stream, setStream] = useState(null);
//   const [audioMuted, setAudioMuted] = useState(false);
//   const [videoMuted, setVideoMuted] = useState(false);

//   const socket = useSocket();
//   const { user } = useAuth();
//   const messagesEndRef = useRef(null);
//   const myVideo = useRef();
//   const userVideo = useRef();
//   const peerRef = useRef();

//   useEffect(() => {
//     fetchConnections();
//   }, []);

//   useEffect(() => {
//     if (socket && user) {
//       console.log('🔌 Setting up socket for user:', user.id);
//       // Register user immediately when socket connects
//       socket.emit('user-connected', user.id);
      
//       // Re-register on reconnection
//       socket.on('connect', () => {
//         console.log('🔌 Socket reconnected, re-registering user');
//         socket.emit('user-connected', user.id);
//       });

//       socket.on('receive-message', (message) => {
//         console.log('📩 Received message:', message);
//         // Check if message is for current conversation
//         if (selectedConnection && (message.sender === selectedConnection._id || message.receiver === selectedConnection._id)) {
//           setMessages(prev => {
//             // Avoid duplicates
//             if (prev.some(m => m._id === message._id)) {
//               console.log('⚠️ Duplicate message, skipping');
//               return prev;
//             }
//             console.log('✅ Adding message to conversation');
//             return [...prev, message];
//           });
//         } else {
//           console.log('⚠️ Message not for current conversation');
//         }
//       });

//       socket.on('message-sent', (message) => {
//         console.log('✅ Message sent confirmed:', message);
//         // Update the temporary message with the real one from server
//         setMessages(prev => {
//           const filtered = prev.filter(m => !m._id.startsWith('temp-'));
//           if (!filtered.some(m => m._id === message._id)) {
//             return [...filtered, message];
//           }
//           return filtered;
//         });
//       });

//       socket.on('message-error', (error) => {
//         console.error('❌ Message error:', error);
//         toast.error(error.error || 'Failed to send message');
//       });

//       socket.on('call-signal', (data) => {
//         setReceivingCall(true);
//         setCaller(data.from);
//         setCallerSignal(data.signal);
//         setCallType(data.callType);
//       });

//       socket.on('call-accepted', (signal) => {
//         peerRef.current.signal(signal);
//       });

//       socket.on('call-ended', () => {
//         endCall();
//       });

//       return () => {
//         socket.off('connect');
//         socket.off('receive-message');
//         socket.off('message-sent');
//         socket.off('message-error');
//         socket.off('call-signal');
//         socket.off('call-accepted');
//         socket.off('call-ended');
//       };
//     }
//   }, [socket, selectedConnection, user]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const fetchConnections = async () => {
//     try {
//       const response = await axios.get(`${API_URL}/api/connections/list`);
//       setConnections(response.data.connections);
//     } catch (error) {
//       console.error('Failed to load connections');
//     }
//   };

//   const fetchMessages = async (connectionId) => {
//     try {
//       const response = await axios.get(`${API_URL}/api/messages/${connectionId}`);
//       setMessages(response.data.messages || []);
//     } catch (error) {
//       console.error('Failed to load messages:', error);
//       setMessages([]);
//     }
//   };

//   const handleSelectConnection = (connection) => {
//     setSelectedConnection(connection);
//     fetchMessages(connection._id);
//   };
  
//   // Poll for new messages if socket is not connected
//   useEffect(() => {
//     if (!selectedConnection) return;
    
//     // If socket is connected, rely on socket events
//     if (socket && socket.connected) {
//       console.log('🔌 Socket connected, using real-time updates');
//       return;
//     }
    
//     // Otherwise, poll every 3 seconds for new messages
//     console.log('⏰ Socket not connected, polling for messages');
//     const pollInterval = setInterval(() => {
//       fetchMessages(selectedConnection._id);
//     }, 3000);
    
//     return () => clearInterval(pollInterval);
//   }, [selectedConnection, socket]);

//   const handleSendMessage = async (e) => {
//     e.preventDefault();
//     if (!newMessage.trim() || !selectedConnection) return;

//     const messageText = newMessage;
//     const messageData = {
//       receiver: selectedConnection._id,
//       text: messageText,
//       sender: user.id
//     };

//     console.log('📤 Sending message:', messageData);
//     setNewMessage(''); // Clear input immediately
    
//     // Optimistically add message to UI
//     const tempMessage = {
//       _id: 'temp-' + Date.now(),
//       sender: user.id,
//       receiver: selectedConnection._id,
//       text: messageText,
//       createdAt: new Date()
//     };
//     setMessages(prev => [...prev, tempMessage]);

//     // Try socket first, fall back to REST API if socket is not connected
//     if (socket && socket.connected) {
//       console.log('📡 Using socket.io for message');
//       socket.emit('send-message', messageData);
//     } else {
//       console.log('⚠️ Socket not connected, using REST API fallback');
//       try {
//         const response = await axios.post(`${API_URL}/api/messages/send`, messageData);
//         console.log('✅ Message sent via REST API:', response.data);
        
//         // Replace temp message with real one
//         setMessages(prev => {
//           const filtered = prev.filter(m => !m._id.startsWith('temp-'));
//           return [...filtered, response.data.data];
//         });
        
//         toast.success('Message sent');
//       } catch (error) {
//         console.error('❌ Failed to send message:', error);
//         toast.error('Failed to send message');
        
//         // Remove the optimistic message
//         setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
//       }
//     }
//   };

//   const startCall = async (type) => {
//     if (!selectedConnection) return;
    
//     try {
//       const constraints = {
//         video: type === 'video',
//         audio: true
//       };
      
//       const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
//       setStream(mediaStream);
//       setCallType(type);
//       setInCall(true);
      
//       if (myVideo.current) {
//         myVideo.current.srcObject = mediaStream;
//       }

//       const peer = new Peer({
//         initiator: true,
//         trickle: false,
//         stream: mediaStream
//       });

//       peer.on('signal', (signal) => {
//         socket.emit('call-user', {
//           to: selectedConnection._id,
//           from: user.id,
//           signal: signal,
//           callType: type
//         });
//       });

//       peer.on('stream', (remoteStream) => {
//         if (userVideo.current) {
//           userVideo.current.srcObject = remoteStream;
//         }
//       });

//       peerRef.current = peer;
//       toast.success(`${type === 'video' ? 'Video' : 'Audio'} call started`);
//     } catch (error) {
//       console.error('Error starting call:', error);
//       toast.error('Failed to start call. Please check your permissions.');
//     }
//   };

//   const answerCall = async () => {
//     try {
//       const constraints = {
//         video: callType === 'video',
//         audio: true
//       };

//       const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
//       setStream(mediaStream);
//       setInCall(true);
//       setReceivingCall(false);

//       if (myVideo.current) {
//         myVideo.current.srcObject = mediaStream;
//       }

//       const peer = new Peer({
//         initiator: false,
//         trickle: false,
//         stream: mediaStream
//       });

//       peer.on('signal', (signal) => {
//         socket.emit('answer-call', {
//           signal: signal,
//           to: caller
//         });
//       });

//       peer.on('stream', (remoteStream) => {
//         if (userVideo.current) {
//           userVideo.current.srcObject = remoteStream;
//         }
//       });

//       peer.signal(callerSignal);
//       peerRef.current = peer;
//     } catch (error) {
//       console.error('Error answering call:', error);
//       toast.error('Failed to answer call');
//     }
//   };

//   const endCall = () => {
//     if (stream) {
//       stream.getTracks().forEach(track => track.stop());
//     }
//     if (peerRef.current) {
//       peerRef.current.destroy();
//     }
//     setInCall(false);
//     setReceivingCall(false);
//     setStream(null);
//     setCallType(null);
//     socket?.emit('end-call', { to: selectedConnection?._id });
//   };

//   const toggleAudio = () => {
//     if (stream) {
//       const audioTrack = stream.getAudioTracks()[0];
//       audioTrack.enabled = !audioTrack.enabled;
//       setAudioMuted(!audioTrack.enabled);
//     }
//   };

//   const toggleVideo = () => {
//     if (stream) {
//       const videoTrack = stream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setVideoMuted(!videoTrack.enabled);
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-white">
//       <Sidebar />
//       <TopBar />
//       <div className="lg:ml-64 mt-16 flex h-[calc(100vh-4rem)]">
//         {/* Connections List */}
//         <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
//           <div className="p-4">
//             <Input placeholder="Search messages..." className="bg-white" />
//           </div>
//           <div className="flex-1 overflow-y-auto">
//             {connections.length > 0 ? connections.map((conn) => (
//               <div
//                 key={conn._id}
//                 onClick={() => handleSelectConnection(conn)}
//                 className={`flex items-center space-x-3 p-4 cursor-pointer ${selectedConnection?._id === conn._id ? 'bg-white' : 'hover:bg-gray-100'}`}
//               >
//                 <Avatar className="w-12 h-12">
//                   <AvatarImage src={conn.profilePic} />
//                   <AvatarFallback className="bg-gray-300">{conn.name.charAt(0)}</AvatarFallback>
//                 </Avatar>
//                 <div className="flex-1">
//                   <p className="font-semibold text-black">{conn.name}</p>
//                   <p className="text-sm text-gray-500">Online</p>
//                 </div>
//               </div>
//             )) : <p className="p-8 text-center text-gray-500">No connections</p>}
//           </div>
//         </div>

//         {/* Chat Area */}
//         <div className="flex-1 flex flex-col">
//           {selectedConnection ? (
//             <>
//               {/* Chat Header */}
//               <div className="h-16 border-b flex items-center justify-between px-6 bg-white">
//                 <div className="flex items-center space-x-3">
//                   <Avatar className="w-10 h-10">
//                     <AvatarImage src={selectedConnection.profilePic} />
//                     <AvatarFallback>{selectedConnection.name.charAt(0)}</AvatarFallback>
//                   </Avatar>
//                   <div>
//                     <h3 className="font-bold text-black">{selectedConnection.name}</h3>
//                     <p className="text-sm text-green-500">Online</p>
//                   </div>
//                 </div>
//                 <div className="flex space-x-4">
//                   <button 
//                     onClick={() => startCall('audio')}
//                     className="p-2 hover:bg-gray-100 rounded-full transition"
//                     disabled={inCall}
//                   >
//                     <FiPhone className="w-5 h-5 text-gray-700" />
//                   </button>
//                   <button 
//                     onClick={() => startCall('video')}
//                     className="p-2 hover:bg-gray-100 rounded-full transition"
//                     disabled={inCall}
//                   >
//                     <FiVideo className="w-5 h-5 text-gray-700" />
//                   </button>
//                 </div>
//               </div>

//               {/* Messages */}
//               <div className="flex-1 overflow-y-auto p-6 space-y-4">
//                 {messages.map((msg, idx) => {
//                   const isSender = msg.sender === user.id || msg.sender === user._id;
//                   return (
//                     <div key={idx} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
//                       <div className={`px-4 py-2 rounded-2xl max-w-md ${isSender ? 'bg-yellow-400 text-black' : 'bg-white border text-black'}`}>
//                         {msg.text}
//                       </div>
//                     </div>
//                   );
//                 })}
//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Message Input */}
//               <div className="border-t p-4 bg-white">
//                 <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
//                   <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><FiImage className="w-5 h-5 text-gray-400" /></button>
//                   <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><FiPaperclip className="w-5 h-5 text-gray-400" /></button>
//                   <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type message..." className="flex-1" />
//                   <button type="submit" className="w-12 h-12 bg-yellow-400 hover:bg-yellow-500 rounded-lg flex items-center justify-center">
//                     <FiSend className="w-5 h-5 text-black" />
//                   </button>
//                 </form>
//               </div>
//             </>
//           ) : (
//             <div className="flex-1 flex items-center justify-center">
//               <p className="text-gray-500">Select a connection to start chatting</p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Incoming Call Dialog */}
//       <Dialog open={receivingCall} onOpenChange={setReceivingCall}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
//           </DialogHeader>
//           <div className="text-center space-y-4">
//             <Avatar className="w-20 h-20 mx-auto">
//               <AvatarImage src={selectedConnection?.profilePic} />
//               <AvatarFallback className="bg-yellow-400 text-2xl">
//                 {selectedConnection?.name?.charAt(0)}
//               </AvatarFallback>
//             </Avatar>
//             <p className="text-lg font-semibold">{selectedConnection?.name} is calling...</p>
//             <div className="flex space-x-3 justify-center">
//               <Button onClick={answerCall} className="bg-green-500 hover:bg-green-600">
//                 <FiPhone className="mr-2" /> Answer
//               </Button>
//               <Button onClick={() => setReceivingCall(false)} variant="destructive">
//                 <FiPhoneOff className="mr-2" /> Decline
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Active Call Dialog */}
//       <Dialog open={inCall} onOpenChange={(open) => !open && endCall()}>
//         <DialogContent className="max-w-4xl">
//           <DialogHeader>
//             <DialogTitle>{callType === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Remote Video */}
//               <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
//                 <video 
//                   ref={userVideo} 
//                   autoPlay 
//                   playsInline
//                   className="w-full h-full object-cover"
//                 />
//                 <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-sm">
//                   {selectedConnection?.name}
//                 </div>
//               </div>

//               {/* Local Video */}
//               {callType === 'video' && (
//                 <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
//                   <video 
//                     ref={myVideo} 
//                     autoPlay 
//                     playsInline 
//                     muted
//                     className="w-full h-full object-cover"
//                   />
//                   <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-sm">
//                     You
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Call Controls */}
//             <div className="flex justify-center space-x-4">
//               <Button 
//                 onClick={toggleAudio}
//                 variant={audioMuted ? "destructive" : "outline"}
//                 size="lg"
//                 className="rounded-full w-14 h-14"
//               >
//                 {audioMuted ? <FiMicOff /> : <FiMic />}
//               </Button>
//               {callType === 'video' && (
//                 <Button 
//                   onClick={toggleVideo}
//                   variant={videoMuted ? "destructive" : "outline"}
//                   size="lg"
//                   className="rounded-full w-14 h-14"
//                 >
//                   {videoMuted ? <FiVideoOff /> : <FiVideo />}
//                 </Button>
//               )}
//               <Button 
//                 onClick={endCall}
//                 variant="destructive"
//                 size="lg"
//                 className="rounded-full w-14 h-14"
//               >
//                 <FiPhoneOff />
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default Chat;

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Peer from 'simple-peer';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { FiSend, FiPhone, FiVideo, FiImage, FiPaperclip, FiPhoneOff, FiMic, FiMicOff, FiVideoOff, FiArrowLeft } from 'react-icons/fi';
import { API_URL } from '../config/api';

// CRITICAL: This fixes connection drops in direct chats
const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

const Chat = () => {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerSignal, setCallerSignal] = useState(null);
  
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const socket = useSocket();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const peerRef = useRef();

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit('user-connected', user.id);
      
      socket.on('connect', () => {
        socket.emit('user-connected', user.id);
      });

      socket.on('receive-message', (message) => {
        if (selectedConnection && (message.sender === selectedConnection._id || message.receiver === selectedConnection._id)) {
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
          });
        }
      });

      socket.on('message-sent', (message) => {
        setMessages(prev => {
          const filtered = prev.filter(m => !m._id.startsWith('temp-'));
          if (!filtered.some(m => m._id === message._id)) return [...filtered, message];
          return filtered;
        });
      });

      socket.on('message-error', (error) => toast.error(error.error || 'Failed to send message'));

      socket.on('call-signal', (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setCallerSignal(data.signal);
        setCallType(data.callType);
      });

      socket.on('call-accepted', (signal) => {
        if (peerRef.current) peerRef.current.signal(signal);
      });

      socket.on('call-ended', () => {
        endCall();
        toast.info("Call ended");
      });

      return () => {
        socket.off('connect');
        socket.off('receive-message');
        socket.off('message-sent');
        socket.off('message-error');
        socket.off('call-signal');
        socket.off('call-accepted');
        socket.off('call-ended');
      };
    }
  }, [socket, selectedConnection, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inCall && myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [inCall, stream]);

  useEffect(() => {
    if (inCall && userVideo.current && remoteStream) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [inCall, remoteStream]);

  const fetchConnections = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/list`);
      setConnections(response.data.connections);
    } catch (error) {
      console.error('Failed to load connections');
    }
  };

  const fetchMessages = async (connectionId) => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/${connectionId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      setMessages([]);
    }
  };

  const handleSelectConnection = (connection) => {
    setSelectedConnection(connection);
    fetchMessages(connection._id);
  };

  // Support arriving from another page (e.g. Connections) with ?with=<userId> to jump straight into that chat
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || !connections.length || selectedConnection) return;
    const match = connections.find((c) => c._id === withId);
    if (match) handleSelectConnection(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, searchParams]);


  useEffect(() => {
    if (!selectedConnection) return;
    if (socket && socket.connected) return;
    const pollInterval = setInterval(() => {
      fetchMessages(selectedConnection._id);
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [selectedConnection, socket]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConnection) return;

    const messageText = newMessage;
    const messageData = { receiver: selectedConnection._id, text: messageText, sender: user.id };
    setNewMessage('');
    
    const tempMessage = {
      _id: 'temp-' + Date.now(),
      sender: user.id,
      receiver: selectedConnection._id,
      text: messageText,
      createdAt: new Date()
    };
    setMessages(prev => [...prev, tempMessage]);

    if (socket && socket.connected) {
      socket.emit('send-message', messageData);
    } else {
      try {
        const response = await axios.post(`${API_URL}/api/messages/send`, messageData);
        setMessages(prev => {
          const filtered = prev.filter(m => !m._id.startsWith('temp-'));
          return [...filtered, response.data.data];
        });
      } catch (error) {
        toast.error('Failed to send message');
        setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      }
    }
  };

  const startCall = async (type) => {
    if (!selectedConnection) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setStream(mediaStream);
      setCallType(type);
      setInCall(true);

      const peer = new Peer({ 
        initiator: true, 
        trickle: false, 
        stream: mediaStream,
        config: webrtcConfig // <--- STUN/TURN APPLIED HERE
      });

      peer.on('signal', (signal) => {
        socket.emit('call-user', {
          to: selectedConnection._id,
          from: user.id,
          signal: signal,
          callType: type
        });
      });

      peer.on('stream', (rStream) => {
        setRemoteStream(rStream);
      });

      peerRef.current = peer;
    } catch (error) {
      toast.error('Failed to access camera/microphone');
    }
  };

  const answerCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
      setStream(mediaStream);
      setInCall(true);
      setReceivingCall(false);

      const peer = new Peer({ 
        initiator: false, 
        trickle: false, 
        stream: mediaStream,
        config: webrtcConfig // <--- STUN/TURN APPLIED HERE
      });

      peer.on('signal', (signal) => {
        socket.emit('answer-call', { signal: signal, to: caller });
      });

      peer.on('stream', (rStream) => {
        setRemoteStream(rStream);
      });

      peer.signal(callerSignal);
      peerRef.current = peer;
    } catch (error) {
      toast.error('Failed to answer call');
    }
  };

  const endCall = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (peerRef.current) peerRef.current.destroy();
    setInCall(false);
    setReceivingCall(false);
    setStream(null);
    setRemoteStream(null);
    setCallType(null);
    socket?.emit('end-call', { to: selectedConnection?._id });
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 flex h-[calc(100vh-4rem)]">
        {/* Connections List — full width on mobile; hidden once a chat is open */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex-col bg-gray-50 ${selectedConnection ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4">
            <Input placeholder="Search messages..." className="bg-white" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {connections.length > 0 ? connections.map((conn) => (
              <div
                key={conn._id}
                onClick={() => handleSelectConnection(conn)}
                className={`flex items-center space-x-3 p-4 cursor-pointer ${selectedConnection?._id === conn._id ? 'bg-white' : 'hover:bg-gray-100'}`}
              >
                <Link to={`/profile/${conn.username}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <Avatar className="w-12 h-12 hover:opacity-80 transition">
                    <AvatarImage src={conn.profilePic} />
                    <AvatarFallback className="bg-gray-300">{conn.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${conn.username}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-black hover:underline truncate block w-fit">
                    {conn.name}
                  </Link>
                  <p className="text-sm text-green-500">Online</p>
                </div>
              </div>
            )) : <p className="p-8 text-center text-gray-500">No connections</p>}
          </div>
        </div>

        {/* Chat Area — hidden on mobile until a chat is selected */}
        <div className={`flex-1 flex-col ${selectedConnection ? 'flex' : 'hidden md:flex'}`}>
          {selectedConnection ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-white">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConnection(null)}
                    className="md:hidden p-1 -ml-1 text-gray-600 hover:text-black"
                    aria-label="Back to conversations"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                  <Link to={`/profile/${selectedConnection.username}`}>
                    <Avatar className="w-10 h-10 hover:opacity-80 transition">
                      <AvatarImage src={selectedConnection.profilePic} />
                      <AvatarFallback>{selectedConnection.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link to={`/profile/${selectedConnection.username}`} className="font-bold text-black hover:underline">{selectedConnection.name}</Link>
                    <p className="text-sm text-green-500">Online</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-100 rounded-full transition" disabled={inCall}>
                    <FiPhone className="w-5 h-5 text-gray-700" />
                  </button>
                  <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-100 rounded-full transition" disabled={inCall}>
                    <FiVideo className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => {
                  const isSender = msg.sender === user.id || msg.sender === user._id;
                  return (
                    <div key={idx} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-md ${isSender ? 'bg-yellow-400 text-black' : 'bg-white border text-black'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><FiImage className="w-5 h-5 text-gray-400" /></button>
                  <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><FiPaperclip className="w-5 h-5 text-gray-400" /></button>
                  <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type message..." className="flex-1 border-gray-300" />
                  <button type="submit" className="w-12 h-12 bg-yellow-400 hover:bg-yellow-500 rounded-lg flex items-center justify-center">
                    <FiSend className="w-5 h-5 text-black" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Select a connection to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Incoming Call Dialog */}
      <Dialog open={receivingCall} onOpenChange={setReceivingCall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <Avatar className="w-20 h-20 mx-auto">
              <AvatarImage src={selectedConnection?.profilePic} />
              <AvatarFallback className="bg-yellow-400 text-2xl">
                {selectedConnection?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold">{selectedConnection?.name} is calling...</p>
            <div className="flex space-x-3 justify-center">
              <Button onClick={answerCall} className="bg-green-500 hover:bg-green-600">
                <FiPhone className="mr-2" /> Answer
              </Button>
              <Button onClick={() => { setReceivingCall(false); socket?.emit('end-call', { to: caller }); }} variant="destructive">
                <FiPhoneOff className="mr-2" /> Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Call Dialog */}
      <Dialog open={inCall} onOpenChange={(open) => !open && endCall()}>
        <DialogContent className="max-w-4xl bg-gray-900 border-none">
          <DialogHeader>
            <DialogTitle className="text-white">{callType === 'video' ? 'Video' : 'Audio'} Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`grid gap-4 ${callType === 'video' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Remote Video/Audio */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <video 
                  ref={userVideo} 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!remoteStream && <p className="text-gray-400 absolute">Connecting...</p>}
                <div className="absolute bottom-2 left-2 text-white bg-black/60 px-3 py-1 rounded text-sm font-medium">
                  {selectedConnection?.name}
                </div>
              </div>

              {/* Local Video */}
              {callType === 'video' && (
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video 
                    ref={myVideo} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-white bg-black/60 px-3 py-1 rounded text-sm font-medium">
                    You
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4 pt-4">
              <Button onClick={toggleAudio} variant={audioMuted ? "destructive" : "outline"} size="lg" className="rounded-full w-14 h-14">
                {audioMuted ? <FiMicOff className="w-6 h-6"/> : <FiMic className="w-6 h-6"/>}
              </Button>
              {callType === 'video' && (
                <Button onClick={toggleVideo} variant={videoMuted ? "destructive" : "outline"} size="lg" className="rounded-full w-14 h-14 text-white">
                  {videoMuted ? <FiVideoOff className="w-6 h-6"/> : <FiVideo className="w-6 h-6"/>}
                </Button>
              )}
              <Button onClick={endCall} variant="destructive" size="lg" className="rounded-full w-14 h-14">
                <FiPhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
