import { page } from "./state.svelte.js";
export async function goto(url: URL) {
  history.replaceState({}, "", url);
  // Kit 3 keeps page.url unchanged during shallow navigation.
  page.shallow = { url: new URL(url) };
}
