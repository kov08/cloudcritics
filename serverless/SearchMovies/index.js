import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

//Initialize clients globally (TCP connection resuse)
const secretClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

//Wrap ddb in the Document CLient for native JSON  handling
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// Global cache variable
let cachedApiKey = null;

const fetchSecret = async () => {
  const secretName = process.env.SECRET_KEY_NAME;
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretClient.send(command);
    const secretPayload = JSON.parse(response.secretString);
    return secretPayload.API_KEY;
  } catch (error) {
    console.error("Failed to retrieve secret from AWS Secrets Manager", error);
    throw new Error("Secret Retrieval Failed");
  }
};

export const handler = async (event, context, isRetry = false) => {
  const query =
    event.queryStringParameters && event.queryStringParameters.query;

  // In API Gateway HTTP APIs with JWT authorizer, the user emails are injected here
  const userEmail =
    event.requestContext?.authorizer?.jwt?.claims?.email || "anonymous";

  if (!query) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Query parameter is required" }),
    };
  }

  try {
    if (!cachedApiKey) {
      console.log("Cold Start or Cache Miss: Fetching secret from AWS");
      cachedApiKey = await fetchSecret();
    }

    //Fetch Movies
    const IMDB_API_URL = process.env.IMDB_API_URL;
    const response = await axios.get(`${IMDB_API_URL}?q=${query}`, {
      headers: {
        Authorization: `Bearer ${cachedApiKey}`,
        Accept: "application/json",
      },
      timeout: 8000,
    });

    const movieData = response.data;

    // Construct DynamoDB Item according to Single-Table Design
    const timestamp = new Date().toISOString();
    const putCommand = new PutCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        PK: `USER#${userEmail}`,
        SK: `SEARCH#${timestamp}`,
        GSI1PK: `TYPE#SEARCH`,
        GSI1SK: timestamp,
        query: query,
        resultsCount: response.data?.results?.length || 0,
        createdAt: timestamp,
      },
    });

    try {
      // Await the database write
      await docClient.send(putCommand);
    } catch (error) {
      console.error(
        "Non-fatal: Failed to write search history to DynamoDB",
        error,
      );
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results: movieData }),
    };
  } catch (error) {
    // console.error("Lambda Execution Error: ", error);

    let statusCode = 500;
    let errorMessage = "Internal Server Error";

    if (error.response?.status === 401) {
      console.warn("401 Unauthorized. Wiping cache.");
      cachedApiKey = null; // Wipe the bad key

      if (!isRetry) {
        console.log("Retrying the handler one time with fresh cache.");
        return await exports.handler(event, context, true);
      }

      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Upstream auth failed twice." }),
      };
    } else if (error.code === "ECONNABORTED") {
      statusCode = 504;
      errorMessage = "Upstream service timeout.";
    }

    return {
      statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
