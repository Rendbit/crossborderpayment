import request from "supertest";
import express from "express";
import { apiKeyValidator } from "../middlewares/apiKeyValidator";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.API_KEY || "";
const app = express();
app.use(express.json()); // For parsing JSON request bodies

const testEmail = "testEmail12@gmail.com";
const testStellarPublicKey = "12";

// Test route with the apiKeyValidator middleware
app.post("/waitlist-api/user/join", apiKeyValidator, (req, res) => {
  res.status(200).json({ message: "Success" });
});

describe("apiKeyValidator Middleware", () => {
  it("should return 400 if no API key is provided", async () => {
    const response = await request(app).post("/waitlist-api/user/join").send({
      firstName: "John",
      lastName: "Doe",
      email: testEmail,
      stellarPublicKey: testStellarPublicKey,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Bad Request: Missing API key.");
  });

  it("should return 403 if the API key is invalid", async () => {
    const response = await request(app)
      .post("/waitlist-api/user/join")
      .set("x-api-key", API_KEY + '1')
      .send({
        firstName: "John",
        lastName: "Doe",
        email: testEmail,
        stellarPublicKey: testStellarPublicKey,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden: Invalid API key.");
  });

  it("should call next if the API key is valid", async () => {
    const response = await request(app)
      .post("/waitlist-api/user/join")
      .set("x-api-key", API_KEY)
      .send({
        firstName: "John",
        lastName: "Doe",
        email: testEmail,
        stellarPublicKey: testStellarPublicKey,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Success");
  });
});
