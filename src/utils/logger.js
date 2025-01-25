const morgan = require("morgan");

const logger = {
  info: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.log("ℹ️", ...args);
    }
  },
  error: (...args) => {
    console.error("❌", ...args);
  },
  debug: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.debug("🔍", ...args);
    }
  },
  warn: (...args) => {
    console.warn("⚠️", ...args);
  },
};

// Custom morgan format
const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }
);

module.exports = { logger, morganMiddleware };
