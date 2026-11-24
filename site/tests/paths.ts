export function resolve(_route: string, params: { path: string }) {
  return `/svelte-bench/${params.path}`;
}
export function asset(path: string) {
  return `/svelte-bench/${path}`;
}
