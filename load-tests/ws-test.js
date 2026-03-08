import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 500,
  duration: '30s',
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/socket.io/?EIO=4&transport=websocket';

export default function () {
  const params = { tags: { my_tag: 'websocket' } };

  const res = ws.connect(WS_URL, params, function (socket) {
    socket.on('open', function open() {
      console.log('connected');
      socket.send('42["join_show", {"showId": 1}]'); // Socket.IO join message
    });

    socket.on('message', function (message) {
      if (message.startsWith('42')) {
        check(message, { 'received update': (msg) => msg.length > 0 });
      }
    });

    socket.on('close', () => console.log('disconnected'));
    
    socket.setTimeout(function () {
      socket.close();
    }, 30000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
