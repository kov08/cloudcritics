// import axios from "axios";
import {
  ComprehendClient,
  BatchDetectSentimentCommand,
} from "@aws-sdk/client-comprehend";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Global TCP connection reuse
const comprehendClient = new ComprehendClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Helper: Fetch reviews (Mocking an external API call)
const fetchReviews = async (movieId) => {
  //  call an API and Simulate returning 30 reviews.

  return Array(30).fill(
    "This movie was absolutely fantastic, I loved the cinematography!",
  );
};

// Chunk array into smaller arrays of a specific size (Max 25 for Comprehend)
const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const handler = async (event) => {
  const movieId = event.queryStringParameters?.movieId;
  const userEmail =
    event.requestContext?.authorizer?.jwt?.claims?.email || "anonymous";

  if (!movieId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "movieId required" }),
    };
  }

  try {
    const rawReviews = await fetchReviews(movieId);

    // 1. Data Transformation: Enforce AWS Comprehend 5,000 byte limit
    // We use substring(0, 4900) to be safe with multi-byte characters.
    const sanitizedReviews = rawReviews.map((review) =>
      review.substring(0, 4900),
    );

    // 2. Chunking: Comprehend Batch API strictly accepts max 25 items per call
    const reviewBatches = chunkArray(sanitizedReviews, 25);

    // Aggregation state
    const sentimentScores = {
      POSITIVE: 0,
      NEGATIVE: 0,
      NEUTRAL: 0,
      MIXED: 0,
      total: 0,
    };

    // 3. Process batches concurrently
    const comprehendPromises = reviewBatches.map(async (batch) => {
      const command = new BatchDetectSentimentCommand({
        TextList: batch,
        LanguageCode: "en",
      });
      const response = await comprehendClient.send(command);

      // Tally the results
      response.ResultList.forEach((result) => {
        sentimentScores[result.Sentiment] += 1;
        sentimentScores.total += 1;
      });

      if (response.ErrorList && response.ErrorList.length > 0) {
        console.warn(
          `Partial Batch Failure: ${response.ErrorList.length} items failed.`,
          response.ErrorList,
        );
      }
    });

    // Waits for all promises to finish, regardless of success or failure : allSetteled
    await Promise.allSettled(comprehendPromises);

    // 4. Calculate Percentages
    const aggregatedResult = {
      movieId,
      totalReviewsAnalyzed: sentimentScores.total,
      positivePct: (
        (sentimentScores.POSITIVE / sentimentScores.total) *
        100
      ).toFixed(1),
      negativePct: (
        (sentimentScores.NEGATIVE / sentimentScores.total) *
        100
      ).toFixed(1),
      neutralPct: (
        (sentimentScores.NEUTRAL / sentimentScores.total) *
        100
      ).toFixed(1),
      mixedPct: ((sentimentScores.MIXED / sentimentScores.total) * 100).toFixed(
        1,
      ),
    };

    // 5. Persist to DynamoDB
    const timestamp = new Date().toISOString();
    const putCommand = new PutCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        PK: `USER#${userEmail}`,
        SK: `SENTIMENT#${movieId}#${timestamp}`,
        GSI1PK: `TYPE#SENTIMENT`,
        GSI1SK: timestamp,
        ...aggregatedResult,
        createdAt: timestamp,
      },
    });

    await docClient.send(putCommand);

    // 6. Return synchronous response
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(aggregatedResult),
    };
  } catch (error) {
    console.error("Sentiment Analysis Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
