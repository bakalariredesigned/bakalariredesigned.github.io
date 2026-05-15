import http from 'node:http';

const data = new URLSearchParams({
  client_id: 'ANDR',
  grant_type: 'password',
  username: 'test',
  password: '123'
}).toString();

const req = http.request('http://localhost:3000/api-proxy/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
