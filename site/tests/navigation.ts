import { page } from "./state.svelte.js";
export async function goto(url: URL, options?: { shallow?: boolean }) {
  history.replaceState({}, "", url);
  // Kit 3 keeps page.url unchanged during shallow navigation.
  if (options?.shallow) page.shallow = { url: new URL(url) };
  else {
    page.url = new URL(url);
    page.shallow = null;
  }
}
