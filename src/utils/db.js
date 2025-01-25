const mongoose = require("mongoose");
const config = require("../config/config");

const connectDB = async () => {


  const MONGO_URI =
    "mongodb+srv://sadmansakib452:i5vpVM6hBRe4uEJn@cluster0.ghkwfvp.mongodb.net/dream-radio-db?retryWrites=true&w=majority&appName=Cluster0";
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
