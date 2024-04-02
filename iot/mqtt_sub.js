// Import required libraries
const awsIot = require("aws-iot-device-sdk");
const AWS = require("aws-sdk");
require("dotenv").config();
const axios = require("axios"); // Use axios instead of node-fetch

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Function to download a file from S3
async function downloadFromS3(bucket, key) {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const data = await s3.getObject(params).promise();
  return data.Body.toString("utf-8");
}

async function initializeIoTDevice() {
  const bucketName = "awscertstorage";
  // Paths to your certificates in S3
  const privateKeyPath =
    "device_certs_new/a67d13b1b7436d1540c6be5ac27f0142e74d8119181511bda3faf9d0e141acbd-private.pem.key";
  const certificatePath =
    "device_certs_new/a67d13b1b7436d1540c6be5ac27f0142e74d8119181511bda3faf9d0e141acbd-certificate.pem.crt";
  const caPath = "device_certs_new/AmazonRootCA1.pem";

  // Download certificates
  const [privateKey, certificate, caCertificate] = await Promise.all([
    downloadFromS3(bucketName, privateKeyPath),
    downloadFromS3(bucketName, certificatePath),
    downloadFromS3(bucketName, caPath),
  ]);

  // Initialize AWS IoT device connection
  const device = awsIot.device({
    privateKey: Buffer.from(privateKey),
    clientCert: Buffer.from(certificate),
    caCert: Buffer.from(caCertificate),
    clientId: process.env.AWS_IOT_CLIENT_ID,
    host: "atdrbdfrzmr3g-ats.iot.us-east-1.amazonaws.com",
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
