import { handler } from "../index";
import axios from "axios";
import { SecretManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

jest.mock("axios");
jest.mock("@aws/client-secrets-manager");
jest.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mocckReturnValue({ send: jest.fn() }),
    },
    PutCommand: jest.fn(),
  };
});

describe("SearchMovies Lambda with DynamoDB", () => {
  let mockDocClientSend;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Secrets
    SecretManagerClient.prototype.send = jest
      .fn()
      .mockResolvedValue({ SecretString: JSON.stringify({ API_KEY: "mock" }) });

    // Mock Axios
    axios.get.mockResolvedValue({ data: { results: [{ title: "Batman" }] } });

    // Mock for docClient.send
    mockDocClientSend = DynamoDBDocumentClient.from().send;
    mockDocClientSend.mockResolvedValue({});
  });

  it("writes to DynamoDB and returns movies", async () => {
    const mockEvent = {
      queryStringParameters: { query: "Batman" },
      requestContext: {
        authorizer: { jwt: { claims: { email: "test@test.com" } } },
      },
    };
    const response = await handler(mockEvent);

    // Verify PutCommand was constructed with correct Partition Key(PK)
    expect(PutCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Item: expect.objectContaining({
          PK: "USER#test@test.com",
          query: "Batman",
        }),
      }),
    );

    expect(mockDocClientSend).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });

  it("gracefully handles DynamoDB failure without crashing", async () => {
    // Force the DB to fail
    mockDocClientSend.mockRejectedValueOnce(
      new Error("Provisioned Throughput Exceeded Exception"),
    );

    const mockEvent = { queryStringParameters: { query: "Batman" } };

    // The handler should still succeed
    const response = await handler(mockEvent);

    expect(mockDocClientSend).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200); // UI still gets data!
  });
});

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
