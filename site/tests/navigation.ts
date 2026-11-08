import { page } from "./state.svelte.js";
export async function goto(url: URL) {
  history.replaceState({}, "", url);
  page.url = new URL(url);
}
