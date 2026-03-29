import movieService from "../services/movieService";

const searchMovies = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const results = await movieService.fetchMoviesFromIMDB(query);
    res.status(200).json({ results });
  } catch (error) {
    // Pass to global error handler
    next(error);
  }
};

export { searchMovies };
