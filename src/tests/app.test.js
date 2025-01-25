const request = require("supertest");
const app = require("../app");

describe("Health Check", () => {
  it("should return OK status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toHaveProperty("status", "OK");
  });
});
