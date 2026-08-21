const { io } = require('socket.io-client');

// Replace this fake token with a real JWT from POST /auth/login
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTg3NGI5Njc0OGU1M2U5YzBmMTBlNjEiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzg3MjU2ODI0LCJleHAiOjE3ODcyNjA0MjR9.LUfKdeu8ziviz9NdpNxJL3r4sBCIxtOevIZk27AJqiY';

const socket = io('http://localhost:3000', {
  auth: {
    // Send the JWT during the Socket.IO handshake
    token: accessToken,
  },
});

socket.on('connect', () => {
  // Confirm that the authenticated WebSocket connection succeeded
  console.log('Connected to WebSocket server');
});

socket.on('telemetry', (data) => {
  // Receive realtime telemetry pushed by NestJS
  console.log('Received realtime telemetry:', data);
});

socket.on('disconnect', () => {
  // Log when the server disconnects this client
  console.log('Disconnected from WebSocket server');
});