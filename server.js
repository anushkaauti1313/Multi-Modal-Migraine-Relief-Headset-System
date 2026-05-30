// server.js (final with CORS + COM8)
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
app.use(cors()); // allow requests from your PHP pages on localhost
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const ARDUINO_PORT = process.platform === 'win32' ? 'COM8' : '/dev/ttyACM0';
const BAUD = 115200;
const AUTO_DURATION_SEC = 10; // 10s demo

const port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUD }, (err) => {
  if (err) console.error('Error opening serial port:', err.message);
  else console.log('Serial port open:', ARDUINO_PORT);
});
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
parser.on('data', line => console.log('[Arduino]', line.trim()));

function writeSerial(cmd, res = null) {
  if (!port || !port.writable) {
    const msg = 'Serial port not open or not writable';
    console.error(msg);
    if (res) return res.status(500).json({ ok: false, error: msg });
    return;
  }
  port.write(cmd, (err) => {
    if (err) {
      console.error('Serial write error:', err.message);
      if (res) return res.status(500).json({ ok: false, error: err.message });
    } else {
      console.log('Sent to Arduino:', cmd.trim());
      if (res) return res.json({ ok: true });
    }
  });
}

app.post('/start', (req, res) => {
  let v1 = Number(req.body.v1) || 0;
  let v2 = Number(req.body.v2) || 0;
  let v3 = Number(req.body.v3) || 0;
  v1 = Math.max(0, Math.min(255, Math.floor(v1)));
  v2 = Math.max(0, Math.min(255, Math.floor(v2)));
  v3 = Math.max(0, Math.min(255, Math.floor(v3)));
  const cmd = `START ${v1} ${v2} ${v3} ${AUTO_DURATION_SEC}\n`;
  writeSerial(cmd, res);
});

app.post('/stop', (req, res) => {
  const cmd = 'STOP\n';
  writeSerial(cmd, res);
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const HTTP_PORT = 3000;
app.listen(HTTP_PORT, () => {
  console.log(`Server running at http://localhost:${HTTP_PORT}`);
  console.log(`Using Arduino port: ${ARDUINO_PORT} @ ${BAUD}`);
});
