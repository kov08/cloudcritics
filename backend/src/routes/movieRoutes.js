import express from "express";

import movieController from "./controllers/movieController";
import { requireAuth } from "../middleware/authMiddleware";

const router = express.Router();

// GET /api/movies/search?query=Inception
// Protected by requireAuth middleware
router.get("/search", requireAuth, movieController.searchMovies);

export { router };
