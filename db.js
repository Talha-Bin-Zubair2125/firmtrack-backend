const moongoose = require("mongoose");
require("dotenv").config();

const ConnectDB = async () => {
  try {
    if (moongoose.connection.readyState == 0) {
      console.log("MONGO_URI:", process.env.MONGO_URI);
      await moongoose.connect(process.env.MONGO_URI);
    }
    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

module.exports = ConnectDB;
