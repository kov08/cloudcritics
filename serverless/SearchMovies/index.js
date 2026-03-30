import axios from "axios";

export async function handler(event) {
  // API Gateway Proxy Integration places query parameters here
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
    const IMDB_API_URL =
      process.env.IMDB_API_URL || "https://api.imdb.com/v1/search";

    // const response = await axios.get(`${IMDB_API_URL}?Q=${query}`, {
    //   timeout: 25000,
    // });

    // Mocking the Axios call for the shell implementation
    const results = [
      { id: "tt1375666", title: `${query} Part 1`, year: "2024" },
      { id: "tt0816692", title: `${query} Returns`, year: "2025" },
    ];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results }),
    };
  } catch (error) {
    console.error("Lambda Execution Error: ", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}
