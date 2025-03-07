import { render, screen, fireEvent } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import Counter from "./Counter.svelte"; // Adjust the path to your component

describe("Counter component", () => {
  test("renders with initial count of 0", () => {
    render(Counter);

    // Check that the count is displayed and is initially 0
    const countElement = screen.getByText("0");
    expect(countElement).toBeInTheDocument();

    // Check that both buttons are present
    const decrementButton = screen.getByRole("button", { name: "-" });
    const incrementButton = screen.getByRole("button", { name: "+" });

    expect(decrementButton).toBeInTheDocument();
    expect(incrementButton).toBeInTheDocument();
  });

  test("increments the count when + button is clicked", async () => {
    const user = userEvent.setup();
    render(Counter);

    const incrementButton = screen.getByRole("button", { name: "+" });

    // Initial count should be 0
    expect(screen.getByText("0")).toBeInTheDocument();

    // Click the increment button
    await user.click(incrementButton);

    // Count should now be 1
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("decrements the count when - button is clicked", async () => {
    const user = userEvent.setup();
    render(Counter);

    const decrementButton = screen.getByRole("button", { name: "-" });

    // Initial count should be 0
    expect(screen.getByText("0")).toBeInTheDocument();

    // Click the decrement button
    await user.click(decrementButton);

    // Count should now be -1
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  test("handles multiple clicks correctly", async () => {
    const user = userEvent.setup();
    render(Counter);

    const decrementButton = screen.getByRole("button", { name: "-" });
    const incrementButton = screen.getByRole("button", { name: "+" });

    // Increment twice
    await user.click(incrementButton);
    await user.click(incrementButton);
    expect(screen.getByText("2")).toBeInTheDocument();

    // Decrement once
    await user.click(decrementButton);
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
