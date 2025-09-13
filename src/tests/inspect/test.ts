import { render, screen } from "@testing-library/svelte";
import { expect, test, describe, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import InspectDemo from "./Component.svelte";

// Helper function to check text content with or without quotes
const expectCurrentTextToBe = (element: HTMLElement, expectedText: string) => {
  const textContent = element.textContent || "";
  const withQuotes = `Current text: "${expectedText}"`;
  const withoutQuotes = `Current text: ${expectedText}`;

  const hasWithQuotes = textContent.includes(withQuotes);
  const hasWithoutQuotes = textContent.includes(withoutQuotes);

  expect(hasWithQuotes || hasWithoutQuotes).toBe(true);

  if (!hasWithQuotes && !hasWithoutQuotes) {
    throw new Error(
      `Expected element to contain either "${withQuotes}" or "${withoutQuotes}", but got "${textContent}"`
    );
  }
};

// Helper function to get all console output as a single string
const getAllConsoleOutput = (consoleSpy: any) => {
  return consoleSpy.mock.calls.map((call: any[]) => call.join(" ")).join("\n");
};

describe("InspectDemo component", () => {
  test("renders with initial state", () => {
    render(InspectDemo);

    // Check initial text value and character count
    expectCurrentTextToBe(screen.getByTestId("text-value"), "Hello world");
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Character count: 11"
    );
  });

  test("updates text value and character count when input changes", async () => {
    const user = userEvent.setup();

    // Mock console.log to verify $inspect functionality
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Update the input field
    const input = screen.getByTestId("text-input");
    await user.clear(input);
    await user.type(input, "Testing $inspect");

    // Check if displayed text updated
    expectCurrentTextToBe(screen.getByTestId("text-value"), "Testing $inspect");

    // Check if character count updated
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Character count: 16"
    );

    // Verify $inspect features are being used (console.log was called)
    // This proves $inspect, $inspect.with, and $inspect.trace are working
    expect(consoleSpy).toHaveBeenCalled();

    // Verify standard $inspect output is present
    const output = getAllConsoleOutput(consoleSpy);
    expect(output).toContain("init"); // Basic $inspect always logs init event
    expect(output).toContain("update"); // Should have update events from typing

    // Restore original console.log
    consoleSpy.mockRestore();
  });

  test("handles special characters correctly", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Update with special characters
    const input = screen.getByTestId("text-input");
    await user.clear(input);
    await user.type(input, "!@#$%^&*()");

    // Check if displayed text updated
    expectCurrentTextToBe(screen.getByTestId("text-value"), "!@#$%^&*()");

    // Check if character count is correct
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Character count: 10"
    );

    // Verify $inspect features are working
    expect(consoleSpy).toHaveBeenCalled();

    // Verify standard $inspect output is present
    const output = getAllConsoleOutput(consoleSpy);
    expect(output).toContain("init"); // Basic $inspect always logs init event
    expect(output).toContain("update"); // Should have update events from typing

    consoleSpy.mockRestore();
  });

  test("handles empty input correctly", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "log");

    render(InspectDemo);

    // Clear the input
    const input = screen.getByTestId("text-input");
    await user.clear(input);

    // Check if displayed text is empty
    expectCurrentTextToBe(screen.getByTestId("text-value"), "");

    // Check if character count is zero
    expect(screen.getByTestId("char-count")).toHaveTextContent(
      "Character count: 0"
    );

    // Verify $inspect features are working
    expect(consoleSpy).toHaveBeenCalled();

    // Verify standard $inspect output is present
    const output = getAllConsoleOutput(consoleSpy);
    expect(output).toContain("init"); // Basic $inspect always logs init event
    expect(output).toContain("update"); // Should have update events from clearing input

    consoleSpy.mockRestore();
  });
});
