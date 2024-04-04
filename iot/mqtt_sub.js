// Import required libraries
const awsIot = require("aws-iot-device-sdk");
const AWS = require("aws-sdk");
require("dotenv").config();
const axios = require("axios"); // Use axios instead of node-fetch

async function initializeIoTDevice() {
  // Initialize AWS IoT device connection
  device = awsIot.device({
    keyPath:
      "/Users/visshal/Elgo/Repositories/elgo-iot-datastream-app/iot/device_certs/035f080b642abfd092baf164202f09e1967d1d7189fc3aca1b1d84bee86662e8-private.pem.key",
    certPath:
      "/Users/visshal/Elgo/Repositories/elgo-iot-datastream-app/iot/device_certs/035f080b642abfd092baf164202f09e1967d1d7189fc3aca1b1d84bee86662e8-certificate.pem.crt",
    caPath:
      "/Users/visshal/Elgo/Repositories/elgo-iot-datastream-app/iot/device_certs/AmazonRootCA1.pem",
    clientId: "iotconsole-elgo-client-02",
    host: "a1smcl0622itjw-ats.iot.us-east-1.amazonaws.com",
  });

  const topics = [
    "elgo/v1/kitchenappliance1/power",
    "elgo/v1/kitchenappliance2/power",
    "elgo/v1/refrigerator/power",
    "elgo/v1/HVAC/power",
    "elgo/v1/lighting/power",
  ]; // Add topics to this array
  console.log("Trying to Connect....");

  device.on("connect", function () {
    console.log("Connected to AWS IoT");
    topics.forEach((topic) => {
      device.subscribe(topic);
      console.log(`Subscribed to ${topic}`);
    });
  });
  // Handle message event
  device.on("message", async function (topic, payload) {
    console.log("Message received:", topic, payload.toString());
    const message = JSON.parse(payload.toString());
    const data = {
      device_label: message.deviceLabel,
      power: parseFloat(message.devicePower),
      timestamp: new Date(message.recordedTimestamp).toISOString(), // Ensure timestamp is in ISO format for JSON serialization
      on_off: false,
    };

    try {
      const response = await axios.post(process.env.BACKEND_URL, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Datastream record created:", response.data);
    } catch (error) {
      console.error("Error creating datastream record:", error);
    }
  });

  // Handle other device events
  device.on("close", () => console.log("Connection closed"));
  device.on("reconnect", () => console.log("Reconnecting"));
  device.on("offline", () => console.log("Went offline"));
  device.on("error", (error) => console.error("Connection Error:", error));
}

module.exports = { initializeIoTDevice };
