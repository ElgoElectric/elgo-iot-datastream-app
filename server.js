const express = require("express");
const app = express();
const { initializeIoTDevice } = require("./iot/mqtt_sub.js");
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});
app.use(express.json());
app.get("/", (req, res) => {
  console.info("INFO: Server Started Successfully");
  res.json({ "message:": "Welcome to Elgo IoT Datastream" });
});

initializeIoTDevice()
  .then(() => {
    console.log("IoT Device Initialization Complete.");
  })
  .catch((error) => {
    console.error("IoT Device Initialization Failed:", error);
  });

// Error handling middleware
app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Export the server for Vercel
module.exports = app;
