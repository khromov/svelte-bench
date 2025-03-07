import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import Counter from "./Counter.svelte"; // Adjust the path to your component

describe("Counter component", () => {
  test("renders with initial count of 0", () => {
    render(Counter);

    // Use data-testid to get elements
    const countElement = screen.getByTestId("count-value");
    const decrementButton = screen.getByTestId("decrement-button");
    const incrementButton = screen.getByTestId("increment-button");

    // Check initial state
    expect(countElement).toHaveTextContent("0");
    expect(decrementButton).toBeInTheDocument();
    expect(incrementButton).toBeInTheDocument();
  });

  test("increments the count when + button is clicked", async () => {
    const user = userEvent.setup();
    render(Counter);

    const incrementButton = screen.getByTestId("increment-button");
    const countElement = screen.getByTestId("count-value");

    // Initial count should be 0
    expect(countElement).toHaveTextContent("0");

    // Click the increment button
    await user.click(incrementButton);

    // Count should now be 1
    expect(countElement).toHaveTextContent("1");
  });

  test("decrements the count when - button is clicked", async () => {
    const user = userEvent.setup();
    render(Counter);

    const decrementButton = screen.getByTestId("decrement-button");
    const countElement = screen.getByTestId("count-value");

    // Initial count should be 0
    expect(countElement).toHaveTextContent("0");

    // Click the decrement button
    await user.click(decrementButton);

    // Count should now be -1
    expect(countElement).toHaveTextContent("-1");
  });

  test("handles multiple clicks correctly", async () => {
    const user = userEvent.setup();
    render(Counter);

    const decrementButton = screen.getByTestId("decrement-button");
    const incrementButton = screen.getByTestId("increment-button");
    const countElement = screen.getByTestId("count-value");

    // Increment twice
    await user.click(incrementButton);
    await user.click(incrementButton);
    expect(countElement).toHaveTextContent("2");

    // Decrement once
    await user.click(decrementButton);
    expect(countElement).toHaveTextContent("1");
  });
});
