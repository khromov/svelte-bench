import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import HelloWorld from "../../tmp/HelloWorld.svelte"; // Path to the generated component

describe("HelloWorld component", () => {
  test("renders with Hello, World! text", () => {
    render(HelloWorld);

    // Get the greeting element
    const greetingElement = screen.getByTestId("greeting");

    // Check that it contains the correct text
    expect(greetingElement).toHaveTextContent("Hello, World!");
  });

  test("has the correct styling class", () => {
    render(HelloWorld);

    // Get the greeting element
    const greetingElement = screen.getByTestId("greeting");

    // Check that it has the greeting class
    expect(greetingElement).toHaveClass("greeting");
  });
});
