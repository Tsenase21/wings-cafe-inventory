import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'], // Ensure compatibility
});

export default socket;
