import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import express, { Express } from "express";
import tokenRoutes from "./token";
import { authenticateToken } from "../middleware/auth";
import { deepgramTokenService } from "../utils/deepgram";
import { errorHandler } from "../middleware/errorHandler";

// Mock authentication middleware
vi.mock("../middleware/auth", () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = {
      sub: "test-user-123",
      email: "test-user-123",
      iss: "bb-auth-gate",
    };
    next();
  }),
}));

// Mock deepgram service
vi.mock("../utils/deepgram", () => ({
  deepgramTokenService: {
    generateProjectToken: vi.fn(),
    getTokenTtlMinutes: vi.fn(() => 15),
  },
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  LOG_CONTEXTS: {
    TOKEN: "token",
    API: "api",
  },
}));

describe("Token Routes", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/token", tokenRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/token/deepgram", () => {
    it("should return 200 with Deepgram token", async () => {
      const mockTokenData = {
        token: "mock-deepgram-token-xyz",
        expiresIn: 900,
        expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      };

      vi.mocked(deepgramTokenService.generateProjectToken).mockResolvedValue(
        mockTokenData,
      );

      const response = await request(app)
        .post("/api/token/deepgram")
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token", "mock-deepgram-token-xyz");
      expect(response.body).toHaveProperty("expiresIn", 900);
      expect(response.body).toHaveProperty("expiresAt");
    });

    it("should call generateProjectToken with userId", async () => {
      const mockTokenData = {
        token: "test-token",
        expiresIn: 900,
        expiresAt: new Date().toISOString(),
      };

      vi.mocked(deepgramTokenService.generateProjectToken).mockResolvedValue(
        mockTokenData,
      );

      await request(app)
        .post("/api/token/deepgram")
        .send({});

      expect(deepgramTokenService.generateProjectToken).toHaveBeenCalledWith(
        "test-user-123",
        undefined,
      );
    });

    it("should pass sessionId if provided in body", async () => {
      const mockTokenData = {
        token: "test-token",
        expiresIn: 900,
        expiresAt: new Date().toISOString(),
      };

      vi.mocked(deepgramTokenService.generateProjectToken).mockResolvedValue(
        mockTokenData,
      );

      await request(app)
        .post("/api/token/deepgram")
        .send({ sessionId: "session-abc-123" });

      expect(deepgramTokenService.generateProjectToken).toHaveBeenCalledWith(
        "test-user-123",
        "session-abc-123",
      );
    });

    it("should return 500 if token generation fails", async () => {
      vi.mocked(deepgramTokenService.generateProjectToken).mockRejectedValue(
        new Error("Token generation failed"),
      );

      const response = await request(app)
        .post("/api/token/deepgram")
        .send({});

      expect(response.status).toBe(500);
    });

    it("should require authentication", async () => {
      // Temporarily replace auth middleware to test auth requirement
      vi.mocked(authenticateToken).mockImplementation((req, res, _next) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const response = await request(app).post("/api/token/deepgram").send();

      expect(response.status).toBe(401);
    });

    it("should reject sessionId over 100 characters", async () => {
      const longSessionId = "a".repeat(101);

      const response = await request(app)
        .post("/api/token/deepgram")
        .send({ sessionId: longSessionId });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject non-string sessionId", async () => {

      const response = await request(app)
        .post("/api/token/deepgram")
        .send({ sessionId: 12345 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/token/validate", () => {
    it("should return 200 with the gate identity", async () => {
      const response = await request(app)
        .get("/api/token/validate");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("valid", true);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id", "test-user-123");
      expect(response.body.user).toHaveProperty("email", "test-user-123");
      // No token, so no expiry to report
      expect(response.body).not.toHaveProperty("expiresAt");
    });

    it("should include user information", async () => {
      const response = await request(app)
        .get("/api/token/validate");

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("id");
    });

    it("should compose a display name from the names the gate forwarded", async () => {
      vi.mocked(authenticateToken).mockImplementationOnce((req, _res, next) => {
        req.user = {
          sub: "user@example.com",
          email: "user@example.com",
          iss: "bb-auth-gate",
          givenName: "Emiliano",
          familyName: "De Simoni",
        };
        next();
      });

      const response = await request(app).get("/api/token/validate");

      expect(response.body.user).toHaveProperty("name", "Emiliano De Simoni");
      expect(response.body.user).toHaveProperty("givenName", "Emiliano");
      expect(response.body.user).toHaveProperty("familyName", "De Simoni");
    });

    it("should use whichever name the gate had when only one is present", async () => {
      vi.mocked(authenticateToken).mockImplementationOnce((req, _res, next) => {
        req.user = {
          sub: "user@example.com",
          email: "user@example.com",
          iss: "bb-auth-gate",
          givenName: "Emiliano",
        };
        next();
      });

      const response = await request(app).get("/api/token/validate");

      expect(response.body.user).toHaveProperty("name", "Emiliano");
    });

    it("should omit the display name entirely when the gate had no names", async () => {
      // Sending "" would have the client render a blank heading instead of falling
      // back to the email, so the field must be absent rather than empty.
      const response = await request(app).get("/api/token/validate");

      expect(response.body.user).not.toHaveProperty("name");
    });
  });
});
