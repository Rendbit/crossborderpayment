import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";
dotenv.config();

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: `RendBit Cross Border Payment API`,
      version: "1.0.0",
      description: `API documentation for RendBit Cross Border Payment endpoints`,
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
        ? `${process.env.BASE_URL}`
        : `${process.env.PROD_BASE_URL}`
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ apiKey: [] }, { bearerAuth: [] }],
  },
  apis: ["**/*.ts", "./dist/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
