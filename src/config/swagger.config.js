const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dream Radio Video API",
      version: "1.0.0",
      description: "API documentation for Dream Radio video streaming service",
      contact: {
        name: "API Support",
        email: "support@dreamradio.com",
      },
    },
    servers: [
      {
        url: process.env.SERVER_URL || "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/models/*.js", "./src/swagger/*.yaml"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
