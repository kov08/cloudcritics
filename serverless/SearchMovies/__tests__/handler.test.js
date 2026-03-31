import { handler } from "../index";
import axios from "axios";
import { SecretManagerClient } from "@aws-sdk/client-secrets-manager";

jest.mock("axios");
jest.mock("@aws/client-secrets-manager");

describe("SearchMovies Lambda Handler", () => {
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the AWS SDK send command
    mockSend = jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({ API_KEY: "mock-secret-key" }),
    });
    SecretManagerClient.prototype.send = mockSend;

    // Mock axios response
    axios.get.mockResolvedValue({ data: [{ title: "Batman" }] });
  });

  it("fetches secret and calls IMDB API successfully", async () => {
    const mockEvent = { queryStringParameters: { query: "Batman" } };

    const response = await handler(mockEvent, false);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("Batman"),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer mock-secret-key",
          Accept: "application/json",
        },
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).results[0].title).toBe("Batman");
  });

  it("caches the secret across multiple invocations", async () => {
    const mockEvent = {
      queryStringParameters: { query: "Batman" },
      isRetry: false,
    };

    await handler(mockEvent); // Call 1 (Cold)
    await handler(mockEvent); // Call 2 (Warm)

    // The AWS SDK should only be called ONCE due to global caching
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when query parameter is missing", async () => {
    const mockEvent = {
      queryStringParameters: null,
      fasle,
    };

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("Query parameter is required");
  });

  it("returns 200 and data when query is provided", async () => {
    const mockEvent = {
      queryStringParameters: { query: "Batman" },
      isRetry: false,
    };

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).results[0].title).toContain("Batman");
  });
});
