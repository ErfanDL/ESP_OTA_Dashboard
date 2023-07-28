# ESP OTA Dashboard
an efficient and user friendly OTA server equipped with a powerful WEB UI, designed to effortlessly manage both your ESP8266 and ESP32 Firmware and Status. This OTA solution simplifies the process of updating and monitoring your ESP devices.

# Table of Contents
- [Features](#features)
- [Devices list](#devices-list)
- [Screenshots](#screenshots)
- [Server installation](#server-installation)
  - [Prerequisites](#prerequisites)
  - [Clone the GitHub repository](#clone-the-github-repository)
  - [Navigate into the project directory](#navigate-into-the-project-directory)
  - [Create a new package.json file](#create-a-new-packagejson-file)
  - [Install the required Node.js packages](#install-the-required-nodejs-packages)
  - [Run the Node.js app](#run-the-nodejs-app)
- [Default Username and Password for the Login page](#default-username-and-password-for-the-login-page)
- [Default Password for Flash Firmware and Flush All Devices](#default-password-for-flash-firmware-and-flush-all-devices)
- [Arduino instruction](#arduino-instruction)
  - [Download and install the ESPOTADASH arduino library](#download-and-install-the-espotadash-arduino-library)
  - [Load the example Arduino sketch](#load-the-example-arduino-sketch)


## Features
- Lightweight Node.js server
- Support both ESP8266 and ESP32
- User friendly WEB UI to manage Firmware updates remotely
- Secure frontend login page by username and password
- Secured Flash Firmware by password in WEB UI
- Register devices to server by devices hostname
- Display the registered devices information in WEB UI: MAC address, IP address, Signal strength, Firmware version, and hostname
- Display the number of Registered, Online and Offline devices in WEB UI
- Monitor the Online/Offline status of devices in WEB UI
- Option to Flush all registered devcies
- Load registered devices at server startup
- Custom library for Arduino to support ESP8266 and ESP32 [ESPOTADASH](https://github.com/ErfanDL/ESPOTADASH_Library)

## Devices list
By default, 6 registered devices are displayed. If you have more than 6 devices, click on the 'Show All Devices' button to see the list of all devices.

## Screenshots
- Login page
![](doc/login.png)
- OTA and Devices
![](doc/devices.jpg)
- Show All Devices
![](doc/all.jpg)

## Server installation
Prerequisites

1. Before proceeding, make sure you have the following prerequisites:

- Node.js and npm installed on your system.
  
- installation instruction: [Node.js and NPM](https://github.com/nodesource/distributions#debinstall)

2. Clone the GitHub repository using the following command:

`git clone https://github.com/ErfanDL/ESP_OTA_Dashboard.git`

3. Navigate into the project directory using the following command:

`cd ESP_OTA_Dashboard`

4. Create a new package.json file for managing project dependencies using the following command:

`npm init -y`

5. Install the required Node.js packages:

`npm install express http path fs body-parser multer express-session`

6. In the terminal, run the Node.js app using the following command:

`node index.js`

The app will start running on port **3000**, as specified in the code.

Open a web browser and visit **http://localhost:3000** to access the WEB UI.

## Default Username and Password for the Login page
Default Username and Password for the login page are: **admin**

You can change the default Username and Password by editing lines 40 and 41 in the index.js server file.

## Default Password for Flash Firmware and Flush All Devices
The default Password for Flash Firmware and Flush All Devices is: **admin**

You can also modify it on line 63 in the index.js server file.

## Arduino instruction

1. Download and install the ESPOTADASH arduino library from this link: [ESPOTADASH Library](https://github.com/ErfanDL/ESPOTADASH_Library)

2. Load the below example sketch in Arduino IDE and upload the sketch to ESP8266 or ESP32

Do not forget to edit ssid, password, serverAddress According to your Wi-Fi network and server IP address

### Notice: edit the hostName for each ESP8266 or ESP32 devices. If you assign the same hostname in two or more devices, they will conflict with each other.

### Example Arduino Sketch

```cpp
#include "ESPOTADASH.h"

const char* ssid = "Your_SSID";
const char* password = "Your_WiFi_Password";
const char* hostName = "ESP8266"; // You can modify this to your desired host name
const char* serverAddress = "http://Your_Server_IP:3000"; // Replace with your Node.js server address

unsigned long heartbeatInterval = 10000; // Modify the heartbeat interval (e.g., 10 seconds)
unsigned long registrationInterval = 30000; // Modify the registration interval (e.g., 30 seconds)
const char* firmwareVersion = "1.0.0"; // Modify the firmware version

ESPOTADASH ota(ssid, password, hostName, serverAddress, heartbeatInterval, registrationInterval, firmwareVersion);

void setup() {
  ota.begin();
}

void loop() {
  ota.loop();
}
`````

Now you should see your device in the Dashboard WEB UI devices list.

## Flash Firmware through Web UI

Now you can flash the firmware through the Web UI by exporting the BIN firmware file from the Arduino IDE and uploading it in the ESP Firmware Flasher WEB UI.

1. Select the bin file by clicking the Upload Firmware button

![](/doc/uf.jpg)

2. Select your ESP from the devices list:

![](/doc/se.jpg)

3. Click the Flash Firmware button and enter the Password to start OTA process

![](/doc/ff.jpg)

## Misc

If you like my work and want to support me, you can send me a donation via crypto:

Ethereum: 0x283D333C14500dDB93aEE219D2AC1ab3a95ADd5E

Tether USDT (TRC20): TPTeQGyVVjK7yk3jXCqXeDZto38jWVU4v8

