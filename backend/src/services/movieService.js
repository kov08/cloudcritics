import axios from "axios";

const fetchMoviesFromIMDB = async (query) => {
  const IMDB_API_URL =
    process.env.IMDB_API_URL || "https://api.imdb.com/v1/search";
  const API_KEY = process.env.IMDB_API_KEY;

  // Axios call. In a real scenario, use the IMDB endpoint.
  //   const response = await axios.get(
  //     `${IMDB_API_URL}?q=${query}&apiKey=${API_KEY}`,
  //   );
  //   return response.data;

  return [
    { id: "tt1375666", title: `${query} Part 1`, year: "2024" },
    { id: "tt0816692", title: `${query} Returns`, year: "2025" },
  ];
};

export { fetchMoviesFromIMDB };
