import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import BookList from "./Component.svelte";

describe("Simple Snippet component", () => {
  test("renders the correct number of book titles", () => {
    render(BookList);

    const bookItems = screen.getAllByTestId("book-item");
    expect(bookItems.length).toBe(3);

    const bookTitles = screen.getAllByTestId("book-title");
    expect(bookTitles.length).toBe(3);
  });

  test("displays correct book titles", () => {
    render(BookList);

    const bookTitles = screen.getAllByTestId("book-title");

    expect(bookTitles[0]).toHaveTextContent("The Lord of the Rings");
    expect(bookTitles[1]).toHaveTextContent("To Kill a Mockingbird");
    expect(bookTitles[2]).toHaveTextContent("1984");
  });

  test("has the correct structure for each book item", () => {
    render(BookList);

    const bookItems = screen.getAllByTestId("book-item");

    bookItems.forEach((item) => {
      expect(item.tagName).toBe("LI");

      const title = item.querySelector('[data-testid="book-title"]');
      expect(title).toBeInTheDocument();
      expect(title?.tagName).toBe("SPAN");
    });
  });
});
