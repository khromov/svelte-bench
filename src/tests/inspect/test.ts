import { render, screen } from "@testing-library/svelte";
import { expect, test, describe, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import InspectDemo from "./Component.svelte";

describe("InspectDemo component", () => {
  test("renders with initial state", () => {
    render(InspectDemo);

    // Check initial counter and message values
    expect(screen.getByTestId("counter-value")).toHaveTextContent("Counter: 0");
    expect(screen.getByTestId("message-value")).toHaveTextContent(
      "Message: Hello"
    );
  });

  test("updates counter when increment button is clicked", async () => {
    const user = userEvent.setup();

    // Mock console.log to verify $inspect is used
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Click the increment button
    await user.click(screen.getByTestId("increment-button"));

    // Check if counter updated
    expect(screen.getByTestId("counter-value")).toHaveTextContent("Counter: 1");

    // Check that console.log was called (by $inspect and/or $effect with $inspect.trace)
    expect(consoleSpy).toHaveBeenCalled();

    // Restore original console.log
    consoleSpy.mockRestore();
  });

  test("updates message when input changes", async () => {
    const user = userEvent.setup();

    // Mock console.log to verify $inspect.with is used
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Change the message input
    const input = screen.getByTestId("message-input");
    await user.clear(input);
    await user.type(input, "New message");

    // Check if message updated
    expect(screen.getByTestId("message-value")).toHaveTextContent(
      "Message: New message"
    );

    // Verify that console.log was called with our custom message
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Message updated to")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New message")
    );

    // Restore original console.log
    consoleSpy.mockRestore();
  });

  test("both counter and message updates trigger the effect with $inspect.trace", async () => {
    const user = userEvent.setup();

    // Mock console.log to verify the $effect with $inspect.trace
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Clear previous calls
    consoleSpy.mockClear();

    // Update counter
    await user.click(screen.getByTestId("increment-button"));

    // Check if the effect logged both values
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Current values")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Counter: 1")
    );

    // Clear previous calls
    consoleSpy.mockClear();

    // Update message
    const input = screen.getByTestId("message-input");
    await user.clear(input);
    await user.type(input, "Testing");

    // Check if the effect logged both values again
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Current values")
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Testing"));

    // Restore original console.log
    consoleSpy.mockRestore();
  });
});
