import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import NumberDoubler from "./Component.svelte";

describe("NumberDoubler component", () => {
  test("renders with initial state", () => {
    render(NumberDoubler);

    expect(screen.getByTestId("number-value")).toHaveTextContent("Number: 5");
    expect(screen.getByTestId("doubled-value")).toHaveTextContent(
      "Doubled: 10"
    );
  });

  test("updates doubled value when number increments", async () => {
    const user = userEvent.setup();
    render(NumberDoubler);

    await user.click(screen.getByTestId("increment-button"));

    expect(screen.getByTestId("number-value")).toHaveTextContent("Number: 6");
    expect(screen.getByTestId("doubled-value")).toHaveTextContent(
      "Doubled: 12"
    );

    // Click again
    await user.click(screen.getByTestId("increment-button"));

    expect(screen.getByTestId("number-value")).toHaveTextContent("Number: 7");
    expect(screen.getByTestId("doubled-value")).toHaveTextContent(
      "Doubled: 14"
    );
  });
});
