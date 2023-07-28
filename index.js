const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'upload/' });
const session = require('express-session');

// Store registered devices and their firmware versions, MAC addresses, Wi-Fi signal strengths, and IP addresses in memory
const registeredDevices = new Map();

// Store firmware updates flags for devices
const firmwareUpdates = {};

// Store last heartbeat time for each device
const lastHeartbeatTime = new Map();

// Timeout duration for considering a device offline (in milliseconds)
const heartbeatTimeout = 20000;

// Serve the login.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Middleware to parse request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware to handle sessions
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// The hardcoded username and password (replace these with your actual credentials)
const validUsername = 'admin';
const validPassword = 'admin';

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Received login request:', { username, password }); // Debug log to check received data

  if (username === validUsername && password === validPassword) {
    // Set a session variable to indicate successful login
    req.session.isLoggedIn = true;
    res.redirect('/index.html'); // Redirect to the index.html page
  } else {
    console.log('Invalid login attempt:', { username, password }); // Debug log for invalid login attempts
    res.status(401).send('Invalid username or password.');
  }
});

// Endpoint to handle password authentication
app.post('/authenticate', (req, res) => {
  const { password } = req.body;

  // Password for Flash Firmware and Flush device lists
  const validPassword = 'admin';

  if (password === validPassword) {
    res.sendStatus(200); // Password is correct
  } else {
    res.sendStatus(401); // Password is incorrect
  }
});

// Middleware to protect access to index.html
app.get('/index.html', (req, res, next) => {
  if (req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.redirect('/');
  }
});

// Middleware to parse request body
app.use(bodyParser.text());

// Endpoint to handle logout
app.post('/logout', (req, res) => {
  req.session.isLoggedIn = false; // Clear the isLoggedIn session variable to indicate logout
  res.sendStatus(200);
});

// Endpoint to handle ESP8266 registration
app.post('/register', (req, res) => {
  const data = req.body.trim().split('\n');
  const hostName = data[0];
  const firmwareVersion = data[1];
  const macAddress = data[2];
  const wifiSignalStrength = parseInt(data[3]); // Parse Wi-Fi signal strength as an integer
  const ipAddress = data[4]; // Get the IP address sent by the ESP8266

  if (!hostName || !firmwareVersion || !macAddress || isNaN(wifiSignalStrength) || !ipAddress) {
    res.status(400).send('Bad Request.');
    return;
  }

  // Check if the device is already registered
  if (registeredDevices.has(hostName)) {
    // Check if firmware version has changed
    if (registeredDevices.get(hostName).firmwareVersion !== firmwareVersion) {
      console.log(`Firmware version changed for ${hostName}. Re-registering...`);
      firmwareUpdates[hostName] = true;
    }
  } else {
    console.log(`Registering ${hostName}`);
  }

  // Store device information including hostname, firmware version, MAC address, Wi-Fi signal strength, and IP address
  registeredDevices.set(hostName, {
    hostName,
    firmwareVersion,
    macAddress,
    wifiSignalStrength,
    ipAddress
  });

  console.log('Registered devices:', Array.from(registeredDevices.entries()));
  res.status(200).send('Registration successful.');

  // Save registered devices to the text file
  saveRegisteredDevicesToFile();
});

// Endpoint to fetch registered devices
app.get('/getDevices', (req, res) => {
  res.json(Array.from(registeredDevices.keys()));
});

// Endpoint to fetch firmware version for a specific device
app.get('/getFirmwareVersion', (req, res) => {
  const hostName = req.query.hostName;
  if (!hostName) {
    res.status(400).send('Bad Request.');
    return;
  }

  const deviceInfo = registeredDevices.get(hostName);
  if (deviceInfo) {
    res.status(200).send(deviceInfo.firmwareVersion);
  } else {
    res.status(404).send('Firmware version not found.');
  }
});

// Endpoint to handle firmware upload
app.post('/upload', upload.single('firmwareFile'), (req, res) => {
  const hostName = req.query.hostName;
  if (!hostName) {
    res.status(400).send('Bad Request.');
    return;
  }

  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  const filePath = path.join(__dirname, `upload/${hostName}_firmware.bin`);
  fs.renameSync(req.file.path, filePath);

  console.log(`Received firmware binary for ${hostName}.`);
  res.status(200).send('Firmware upload successful.');

  // Set the firmware update flag for the device
  firmwareUpdates[hostName] = true;
});

// Endpoint to check firmware update status
app.get('/updateStatus', (req, res) => {
  const hostName = req.query.hostName;
  if (!hostName) {
    res.status(400).send('Bad Request.');
    return;
  }

  // Check if the firmware update flag is set for the device
  const updateAvailable = firmwareUpdates[hostName] === true;
  if (updateAvailable) {
    // Clear the update flag if update is available
    firmwareUpdates[hostName] = false;
    res.status(200).send('Update Available');
  } else {
    res.status(204).send('No Update Available');
  }
});

// Endpoint to handle heartbeat from ESP8266
app.post('/heartbeat', (req, res) => {
  const hostName = req.body;
  if (!hostName) {
    res.status(400).send('Bad Request.');
    return;
  }

  // Update the last heartbeat time for the device
  lastHeartbeatTime.set(hostName, Date.now());

  res.status(200).send(`Heartbeat received from ${hostName}.`);
});

// Endpoint to flush all registered devices
app.post('/flushAllDevices', (req, res) => {
   registeredDevices.clear();
   lastHeartbeatTime.clear();
   saveRegisteredDevicesToFile(); // Save the empty registered devices to the file
   res.sendStatus(200);
});

// Endpoint to fetch online status and firmware version for all registered devices
app.get('/getOnlineStatus', (req, res) => {
  const deviceStatusList = [];
  const now = Date.now(); // Get the current timestamp

  registeredDevices.forEach((deviceInfo, device) => {
    const lastHeartbeat = lastHeartbeatTime.get(device);
    const online = lastHeartbeat && now - lastHeartbeat <= heartbeatTimeout; // Check if the device is online based on the last heartbeat time
    deviceStatusList.push({
      device: device,
      online: online,
      firmwareVersion: deviceInfo.firmwareVersion,
      macAddress: deviceInfo.macAddress,
      wifiSignalStrength: deviceInfo.wifiSignalStrength,
      ipAddress: deviceInfo.ipAddress
    });
  });

  res.json(deviceStatusList);
});

// Endpoint to serve the firmware binary file
app.get('/upload/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, `upload/${fileName}`);
  if (fs.existsSync(filePath)) {
    // Set appropriate headers for binary file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Length', fs.statSync(filePath).size); // Set Content-Length header
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Firmware not found.');
  }
});

// Start the server
const PORT = 3000;
http.listen(PORT, () => {
  // Load registered devices from the text file
  loadRegisteredDevicesFromFile();

  console.log(`Server is running on port ${PORT}`);
});

// Periodically check for offline devices and remove them from the lastHeartbeatTime map
setInterval(() => {
  const now = Date.now();
  lastHeartbeatTime.forEach((heartbeatTime, device) => {
    if (now - heartbeatTime > heartbeatTimeout) {
      lastHeartbeatTime.delete(device);
    }
  });
}, 1000);

// Function to load registered devices from the text file and populate the `registeredDevices` map
function loadRegisteredDevicesFromFile() {
  const filePath = path.join(__dirname, 'registered_devices.txt');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (!err) {
      try {
        const devices = JSON.parse(data);
        devices.forEach((device) => {
          registeredDevices.set(device.hostName, device);
        });
        console.log('Registered devices loaded successfully.');
      } catch (error) {
        console.error('Error parsing registered devices file:', error.message);
      }
    } else {
      console.error('Error reading registered devices file:', err.message);
    }
  });
}

// Function to save registered devices to the text file
function saveRegisteredDevicesToFile() {
  const devices = Array.from(registeredDevices.values());
  const filePath = path.join(__dirname, 'registered_devices.txt');

  fs.writeFile(filePath, JSON.stringify(devices, null, 2), (err) => {
    if (err) {
      console.error('Error saving registered devices to file:', err.message);
    } else {
      console.log('Registered devices saved successfully.');
    }
  });
}