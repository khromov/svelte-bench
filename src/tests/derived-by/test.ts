import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import TextAnalyzer from "./Component.svelte";

describe("TextAnalyzer component", () => {
  test("renders with initial state", () => {
    render(TextAnalyzer);

    expect(screen.getByTestId("word-count")).toHaveTextContent("Words: 0");
    expect(screen.getByTestId("char-count")).toHaveTextContent("Characters: 0");
    expect(screen.getByTestId("length-indicator")).toHaveTextContent(
      "Status: Short text"
    );
  });

  test("updates counts when text is entered", async () => {
    const user = userEvent.setup();
    render(TextAnalyzer);

    const input = screen.getByTestId("text-input");

    // Enter a short text
    await user.type(input, "Hello world");

    expect(screen.getByTestId("word-count")).toHaveTextContent("Words: 2");
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Characters: 11"
    );
    expect(screen.getByTestId("length-indicator")).toHaveTextContent(
      "Status: Short text"
    );

    // Clear and enter a longer text
    await user.clear(input);
    await user.type(
      input,
      "This is a much longer text that should have more than fifteen words so that we can test the long text indicator functionality properly"
    );

    expect(screen.getByTestId("word-count")).toHaveTextContent("Words: 24");
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Characters: 134"
    );
    expect(screen.getByTestId("length-indicator")).toHaveTextContent(
      "Status: Long text"
    );
  });

  test("clear button resets the text", async () => {
    const user = userEvent.setup();
    render(TextAnalyzer);

    const input = screen.getByTestId("text-input");
    const clearButton = screen.getByTestId("clear-button");

    // Enter some text
    await user.type(input, "Hello world");

    // Verify counts
    expect(screen.getByTestId("word-count")).toHaveTextContent("Words: 2");

    // Click the clear button
    await user.click(clearButton);

    // Verify everything is reset
    expect(screen.getByTestId("word-count")).toHaveTextContent("Words: 0");
    expect(screen.getByTestId("char-count")).toHaveTextContent("Characters: 0");
    expect(screen.getByTestId("length-indicator")).toHaveTextContent(
      "Status: Short text"
    );
    expect(input).toHaveValue("");
  });
});
