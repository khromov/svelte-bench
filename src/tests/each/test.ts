import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import CharacterList from "./Component.svelte";

describe("CharacterList component", () => {
  test("renders all characters initially", () => {
    render(CharacterList);

    const characterElements = screen.getAllByTestId("character");
    expect(characterElements.length).toBe(3);
    expect(characterElements[0]).toHaveTextContent("Jerry");
    expect(characterElements[1]).toHaveTextContent("Elaine");
    expect(characterElements[2]).toHaveTextContent("Kramer");
  });

  test("adds George to the list when button clicked", async () => {
    const user = userEvent.setup();
    render(CharacterList);

    // Initial check
    let characterElements = screen.getAllByTestId("character");
    expect(characterElements.length).toBe(3);

    // Click the button to add George
    await user.click(screen.getByTestId("add-george-button"));

    // Get updated elements
    characterElements = screen.getAllByTestId("character");

    // Check that George was added
    expect(characterElements.length).toBe(4);
    expect(characterElements[3]).toHaveTextContent("George");

    // Verify original characters are still there
    expect(characterElements[0]).toHaveTextContent("Jerry");
    expect(characterElements[1]).toHaveTextContent("Elaine");
    expect(characterElements[2]).toHaveTextContent("Kramer");
  });
});
