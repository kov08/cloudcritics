import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Global cache variable
let cachedApiKey = null;

const fetchSecret = async () => {
  const secretName = process.env.SECRET_KEY_NAME;
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretClient.send.command;
    const secretPayload = JSON.parse(response.secretString);
    return secretPayload.API_KEY;
  } catch (error) {
    console.error("Failed to retrieve secret from AWS Secrets Manager", error);
    throw new Error("Secret Retrieval Failed");
  }
};

export async function handler(event, context, isRetry = false) {
  const query =
    event.queryStringParameters && event.queryStringParameters.query;

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

    const response = await axios.get(`${IMDB_API_URL}?Q=${query}`, {
      headers: {
        Authorization: `Bearer ${cachedApiKey}`,
        Accept: "application/json",
      },
      timeout: 8000,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results: response.data }),
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
}
