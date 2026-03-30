const { handler } = require("../index");

describe("SearchMovies Lambda Handler", () => {
  it("returns 400 when query parameter is missing", async () => {
    const mockEvent = {
      queryStringParameters: null,
    };

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("Query parameter is required");
  });

  it("returns 200 and data when query is provided", async () => {
    const mockEvent = {
      queryStringParameters: { query: "Batman" },
    };

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).results[0].title).toContain("Batman");
  });
});
