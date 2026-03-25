import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Search from "../Search";
import { movieService } from "../../services/mockMovieService";

// Mock the service layer, NOT Axios directly. This keeps tests resilient to HTTP client changes.
jest.mock("../../services/mockMovieService");

describe("Search Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays search results on successful API call", async () => {
    const mockData = {
      data: { results: [{ id: "1", title: "Batman", year: "2022" }] },
    };
    movieService.searchMovies.mockResolvedValueOnce(mockData);

    render(<Search />);

    const input = screen.getByPlaceholderText("Enter movie title...");
    const button = screen.getByRole("button", { name: /search/i });

    fireEvent.change(input, { target: { value: "Batman" } });
    fireEvent.click(button);

    // Assert loading state
    expect(screen.getByRole("button")).toHaveTextContent("Searching...");

    // Wait for results to render
    await waitFor(() => {
      expect(screen.getByText("Batman (2022)")).toBeInTheDocument();
    });
    expect(movieService.searchMovies).toHaveBeenCalledWith("Batman");
  });

  it("displays error message when API call fails", async () => {
    movieService.searchMovies.mockRejectedValueOnce(new Error("Network Error"));

    render(<Search />);

    fireEvent.change(screen.getByPlaceholderText("Enter movie title..."), {
      target: { value: "Batman" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch movies/i)).toBeInTheDocument();
    });
  });
});
