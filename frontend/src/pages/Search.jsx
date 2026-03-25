import React, { useState } from "react";
import { movieService } from "../services/mockMovieService";

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  let abortController = new AbortController();

  const handleSearch = async (e) => {
    e.preventDefault();
    abortController.abort();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await movieService.searchMovies(query, {
        signal: abortController.signal,
      });
      setResults(response.data.results);
    } catch (err) {
      if (err.name == "AbortError") {
        console.log("Previous req cancelled due to new input");
      }
      setError("Failed to fetch movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-container">
      <h2>Search Movies</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter movie title..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="results-grid">
        {results.map((movie) => (
          <div key={movie.id} className="movie-card">
            <h3>
              {movie.title} ({movie.year})
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;
