import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import ColorList from "./Component.svelte";

describe("ColorList component", () => {
  test("renders all colors initially", () => {
    render(ColorList);

    expect(screen.getByTestId("colors-list").children.length).toBe(3);
    expect(screen.getByTestId("color-0")).toHaveTextContent("Red");
    expect(screen.getByTestId("color-1")).toHaveTextContent("Green");
    expect(screen.getByTestId("color-2")).toHaveTextContent("Blue");
  });

  test("converts colors to uppercase when button clicked", async () => {
    const user = userEvent.setup();
    render(ColorList);

    await user.click(screen.getByTestId("uppercase-button"));

    expect(screen.getByTestId("color-0")).toHaveTextContent("RED");
    expect(screen.getByTestId("color-1")).toHaveTextContent("GREEN");
    expect(screen.getByTestId("color-2")).toHaveTextContent("BLUE");
  });
});
