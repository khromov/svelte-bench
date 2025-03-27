import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import PropsDemo from "./Component.svelte"; // Path to the generated component

describe("PropsDemo component", () => {
  test("renders with default props", () => {
    render(PropsDemo);

    // Check default values
    const nameDisplay = screen.getByTestId("name-display");
    const countDisplay = screen.getByTestId("count-display");

    expect(nameDisplay).toHaveTextContent("Hello, World!");
    expect(countDisplay).toHaveTextContent("Count: 0");

    // Details should not be visible by default
    expect(screen.queryByTestId("details")).not.toBeInTheDocument();
  });

  test("renders with custom props", () => {
    render(PropsDemo, {
      props: { name: "Svelte", count: 5, showDetails: true },
    });

    // Check custom values
    const nameDisplay = screen.getByTestId("name-display");
    const countDisplay = screen.getByTestId("count-display");
    const details = screen.getByTestId("details");

    expect(nameDisplay).toHaveTextContent("Hello, Svelte!");
    expect(countDisplay).toHaveTextContent("Count: 5");
    expect(details).toBeInTheDocument();
    expect(details).toHaveTextContent("Name is Svelte");
    expect(details).toHaveTextContent("Count is 5");
    expect(details).toHaveTextContent("ShowDetails is true");
  });

  test("increment button increases count", async () => {
    const user = userEvent.setup();
    render(PropsDemo, { props: { count: 10 } });

    const incrementButton = screen.getByTestId("increment-button");
    const countDisplay = screen.getByTestId("count-display");

    // Initial count should be 10
    expect(countDisplay).toHaveTextContent("Count: 10");

    // Click the increment button
    await user.click(incrementButton);

    // Count should now be 11
    expect(countDisplay).toHaveTextContent("Count: 11");
  });

  test("conditional rendering works correctly", () => {
    // First render without details
    const { unmount } = render(PropsDemo, { props: { showDetails: false } });
    expect(screen.queryByTestId("details")).not.toBeInTheDocument();

    // Unmount and render again with details
    unmount();
    render(PropsDemo, { props: { showDetails: true } });
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });
});
