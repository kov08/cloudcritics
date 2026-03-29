import express from "express";
import cors from "cors";
import helmet from "helmet";

import movieRoutes from "./routes/movieRoutes";
import { globalErrorHandler } from "./middleware/errorHandler";

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json()); // Parses application/json payload

// API Routes
app.use("/api/movies", movieRoutes);

// Global Error Handler
app.use(globalErrorHandler);

export { app };
