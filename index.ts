import {
  runTests,
  render,
  fireEvent,
  assertEquals,
  assertExists,
} from "./testRunner";
import path from "path";

async function main() {
  const counterPath = path.resolve("./Counter.svelte");

  const tests = [
    {
      name: "renders with initial count of 0",
      test: async () => {
        const { getByText } = render(counterPath);
        const countElement = getByText("0");
        assertExists(countElement, "Should display initial count of 0");
      },
    },
    {
      name: "increments the count when + button is clicked",
      test: async () => {
        const { getByText } = render(counterPath);
        const incrementButton = getByText("+");

        await fireEvent.click(incrementButton);

        const countElement = getByText("1");
        assertExists(countElement, "Count should be incremented to 1");
      },
    },
    {
      name: "decrements the count when - button is clicked",
      test: async () => {
        const { getByText } = render(counterPath);

        // First increment to 1
        const incrementButton = getByText("+");
        await fireEvent.click(incrementButton);

        // Then decrement back to 0
        const decrementButton = getByText("-");
        await fireEvent.click(decrementButton);

        const countElement = getByText("0");
        assertExists(countElement, "Count should be decremented back to 0");
      },
    },
  ];

  // Run all tests
  const results = await runTests(tests);

  // Process the results
  if (results.passed) {
    console.log("All tests passed! 🎉");
  } else {
    console.error("Some tests failed 😢");
    process.exit(1);
  }
}

// Run the tests
main().catch((err) => {
  console.error("Error running tests:", err);
  process.exit(1);
});
