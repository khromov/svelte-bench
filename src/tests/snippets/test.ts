import { render, screen } from "@testing-library/svelte";
import { expect, test, describe } from "vitest";
import Card from "./Card.svelte";

describe("Card component", () => {
  test("renders with default props", () => {
    render(Card, {
      props: {
        children: () => "Main content",
      },
    });

    expect(screen.getByText("Main content")).toBeInTheDocument();
    const card = screen.getByText("Main content").closest(".card");
    expect(card).toHaveClass("card-default");
    expect(card).toHaveStyle("width: 300px");
  });

  test("renders with provided title", () => {
    render(Card, {
      props: {
        title: "Test Title",
        children: () => "Content with title",
      },
    });

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Content with title")).toBeInTheDocument();
  });

  test("renders with custom width and variant", () => {
    render(Card, {
      props: {
        width: "400px",
        variant: "primary",
        children: () => "Custom styled card",
      },
    });

    const card = screen.getByText("Custom styled card").closest(".card");
    expect(card).toHaveClass("card-primary");
    expect(card).toHaveStyle("width: 400px");
  });

  test("renders with header snippet that overrides title", () => {
    render(Card, {
      props: {
        title: "Default Title",
        header: () => "<h2 data-testid='custom-header'>Custom Header</h2>",
        children: () => "Content with custom header",
      },
    });

    expect(screen.getByTestId("custom-header")).toBeInTheDocument();
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
    expect(screen.queryByText("Default Title")).not.toBeInTheDocument();
  });

  test("renders with footer snippet", () => {
    render(Card, {
      props: {
        children: () => "Content with footer",
        footer: () => "<p data-testid='footer-content'>Footer content</p>",
      },
    });

    expect(screen.getByTestId("footer-content")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  test("does not render footer section when no footer snippet provided", () => {
    render(Card, {
      props: {
        children: () => "Content without footer",
      },
    });

    const footerElements = document.querySelectorAll(".card-footer");
    expect(footerElements.length).toBe(0);
  });

  test("renders with parameters passed to snippets", () => {
    render(Card, {
      props: {
        paramValue: "Test Parameter",
        children: (param) => `Content with parameter: ${param}`,
        footer: (param) => `Footer with parameter: ${param}`,
      },
    });

    expect(
      screen.getByText("Content with parameter: Test Parameter")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Footer with parameter: Test Parameter")
    ).toBeInTheDocument();
  });
});
