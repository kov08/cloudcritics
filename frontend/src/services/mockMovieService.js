import apiClient from "../api/client";

export const movieService = {
  searchMovies: async (query, config = {}) => {
    // MOCK IMPLEMENTATION: Simulating network latency and returning static data
    return new Promise((resolve, reject) => {
      if (config.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      }
      const timer = setTimeout(() => {
        resolve({
          data: {
            results: [
              { id: "tt1375666", title: "Inception", year: "2010" },
              { id: "tt0816692", title: "Interstellar", year: "2014" },
            ].filter((m) =>
              m.title.toLowerCase().includes(query.toLowerCase()),
            ),
          },
        });
      }, 800);

      config.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });

    // FUTURE IMPLEMENTATION:
    // return apiClient.get(`/movies?query=${query}`);
  },
};
