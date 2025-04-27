## docs/svelte/01-introduction/01-overview.md

# Svelte Overview

Svelte is a UI framework that compiles components into optimized JavaScript. Use it for standalone components or full-stack apps with SvelteKit.

```svelte
<!file: App.svelte>
<script>
	function greet() {
		alert('Welcome to Svelte!');
	}
</script>

<button onclick={greet}>click me</button>

<style>
	button {
		font-size: 2em;
	}
</style>
```

Try Svelte in the [interactive tutorial](/tutorial), [playground](/playground), or [StackBlitz](https://sveltekit.new).

## docs/svelte/01-introduction/02-getting-started.md

# Getting Started with Svelte 5

## Quick Start

```bash
npx sv create myapp
cd myapp
npm install
npm run dev
```

SvelteKit is the recommended framework for most projects. Alternatively:

```bash
npm create vite@latest
# Select svelte option
```

## Editor Support

- [VS Code extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
- Command line: `sv check`

## Help Resources

- [Discord](/chat)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/svelte)

## docs/svelte/01-introduction/03-svelte-files.md

# Svelte Files

## `<script>`

Contains JavaScript/TypeScript that runs when a component instance is created.

```svelte
<script>
  // instance-level logic
  // use runes for reactivity
</script>
```

## `<script module>`

Runs once when module evaluates. Variables can be referenced in component but not vice versa.

```svelte
<script module>
  let total = 0;
  // Can export bindings (except default)
</script>

<script>
  total += 1;
  console.log(`instantiated ${total} times`);
</script>
```

## `<style>`

CSS is scoped to the component.

```svelte
<style>
  p {
    /* only affects <p> in this component */
    color: burlywood;
  }
</style>
```

All three sections (script, styles, markup) are optional.

## docs/svelte/01-introduction/04-svelte-js-files.md

# .svelte.js and .svelte.ts files

Svelte 5 operates on `.svelte.js` and `.svelte.ts` files in addition to `.svelte` files.

These files:
- Behave like regular JS/TS modules
- Support runes for reactive logic
- Allow sharing reactive state across your app

```js
// store.svelte.js
export let $state count = 0;
export const increment = () => count += 1;
```

> Note: You cannot export reassigned state across modules.

## docs/svelte/02-runes/01-what-are-runes.md

# Svelte 5 Runes

Runes are compiler-controlled symbols in `.svelte` and `.svelte.js`/`.svelte.ts` files with a `$` prefix.

```js
let message = $state('hello');
```

Key characteristics:
- No imports needed
- Not assignable to variables or passable as arguments
- Only valid in specific positions
- Introduced in Svelte 5

## docs/svelte/02-runes/02-$state.md

# Svelte 5 Runes - Condensed Documentation

## $state

Creates reactive state that triggers UI updates when changed.

```svelte
<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>
	clicks: {count}
</button>
```

### Deep state

Arrays and objects become deeply reactive state proxies:

```svelte
<script>
	let todos = $state([
		{
			done: false,
			text: 'add more todos'
		}
	]);
</script>
```

- Modifying nested properties triggers UI updates
- New objects added to arrays are automatically proxified
- Destructuring breaks reactivity

### Classes

Use $state in class fields:

```js
class Todo {
	done = $state(false);
	text = $state();

	constructor(text) {
		this.text = text;
	}

	reset() {
		this.text = '';
		this.done = false;
	}
}
```

When using methods, handle `this` context:
```svelte
<!-- Won't work -->
<button onclick={todo.reset}>reset</button>

<!-- Works -->
<button onclick={() => todo.reset()}>reset</button>
```

Or use arrow functions in class:
```js
reset = () => {
	this.text = '';
	this.done = false;
}
```

## $state.raw

For non-deeply reactive state:

```js
let person = $state.raw({
	name: 'Heraclitus',
	age: 49
});

// No effect
person.age += 1;

// Works - creates new object
person = {
	name: 'Heraclitus',
	age: 50
};
```

## $state.snapshot

Create static copy of reactive state:

```svelte
<script>
	let counter = $state({ count: 0 });

	function onclick() {
		console.log($state.snapshot(counter)); // { count: ... } not Proxy
	}
</script>
```

## Passing state

State is passed by value, not by reference:

```js
function add(a, b) {
	return a + b;
}

let a = $state(1);
let b = $state(2);
let total = add(a, b); // total = 3

a = 3; // total still 3
```

## Cross-module state

Can't export directly reassigned state:

```js
// Not allowed
export let count = $state(0);

export function increment() {
	count += 1;
}
```

Instead, either:

1. Export object with properties:
```js
export const counter = $state({
	count: 0
});

export function increment() {
	counter.count += 1;
}
```

2. Export getter functions:
```js
let count = $state(0);

export function getCount() {
	return count;
}

export function increment() {
	count += 1;
}
```

## docs/svelte/02-runes/03-$derived.md

# $derived Rune

The `$derived` rune creates reactive values that update when their dependencies change.

## Basic Usage

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
	{doubled}
</button>

<p>{count} doubled is {doubled}</p>
```

## $derived.by

For complex derivations, use `$derived.by` with a function:

```svelte
<script>
	let numbers = $state([1, 2, 3]);
	let total = $derived.by(() => {
		let total = 0;
		for (const n of numbers) {
			total += n;
		}
		return total;
	});
</script>

<button onclick={() => numbers.push(numbers.length + 1)}>
	{numbers.join(' + ')} = {total}
</button>
```

## Dependencies

Dependencies are automatically tracked when read synchronously inside the `$derived` expression. Use `untrack` to exclude dependencies.

## Overriding Derived Values

You can temporarily override derived values by reassignment:

```svelte
<script>
	let { post, like } = $props();
	let likes = $derived(post.likes);

	async function onclick() {
		// Optimistic update
		likes += 1;
		try {
			await like();
		} catch {
			// Rollback on failure
			likes -= 1;
		}
	}
</script>

<button {onclick}>🧡 {likes}</button>
```

## Reactivity Behavior

- Unlike `$state`, `$derived` values are not deeply reactive proxies
- When accessing a property from reactive state, mutations to that property affect the underlying state:

```svelte
let items = $state([...]);
let index = $state(0);
let selected = $derived(items[index]);
```

## Update Propagation

Svelte uses push-pull reactivity:
- Changes are immediately pushed to dependents
- Derived values are only recalculated when read
- Updates are skipped if the new value is referentially identical to the previous value

```svelte
<script>
	let count = $state(0);
	let large = $derived(count > 10);
</script>

<button onclick={() => count++}>
	{large}
</button>
```

## docs/svelte/02-runes/04-$effect.md

# Svelte 5 $effect Rune

## Basic Usage

Effects run when state updates, useful for third-party libraries, canvas manipulation, or network requests. They only run in the browser.

```svelte
<script>
	let size = $state(50);
	let color = $state('#ff3e00');
	let canvas;

	$effect(() => {
		const context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);

		// this will re-run whenever `color` or `size` change
		context.fillStyle = color;
		context.fillRect(0, 0, size, size);
	});
</script>

<canvas bind:this={canvas} width="100" height="100"></canvas>
```

## Lifecycle

- Effects run after DOM mounting and in a microtask after state changes
- Re-runs are batched and happen after DOM updates
- Can return a teardown function that runs before effect re-runs or when destroyed

```svelte
<script>
	let count = $state(0);
	let milliseconds = $state(1000);

	$effect(() => {
		const interval = setInterval(() => {
			count += 1;
		}, milliseconds);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<h1>{count}</h1>

<button onclick={() => (milliseconds *= 2)}>slower</button>
<button onclick={() => (milliseconds /= 2)}>faster</button>
```

## Dependencies

- Automatically tracks reactive values read synchronously
- Async values (after `await` or in `setTimeout`) aren't tracked
- Only reruns when the object it reads changes, not when properties change
- Dependencies update based on what was read in the last run

```ts
$effect(() => {
	const context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);

	// this will re-run whenever `color` changes...
	context.fillStyle = color;

	setTimeout(() => {
		// ...but not when `size` changes
		context.fillRect(0, 0, size, size);
	}, 0);
});
```

## Variants

### `$effect.pre`

Runs before DOM updates:

```svelte
<script>
	import { tick } from 'svelte';

	let div = $state();
	let messages = $state([]);

	$effect.pre(() => {
		if (!div) return; // not yet mounted
		messages.length; // reference to trigger re-runs

		// autoscroll when new messages are added
		if (div.offsetHeight + div.scrollTop > div.scrollHeight - 20) {
			tick().then(() => {
				div.scrollTo(0, div.scrollHeight);
			});
		}
	});
</script>

<div bind:this={div}>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
```

### `$effect.tracking`

Tells if code is running in a tracking context:

```svelte
<script>
	console.log('in component setup:', $effect.tracking()); // false

	$effect(() => {
		console.log('in effect:', $effect.tracking()); // true
	});
</script>

<p>in template: {$effect.tracking()}</p> 
```

### `$effect.root`

Creates a non-tracked scope without auto-cleanup:

```js
const destroy = $effect.root(() => {
	$effect(() => {
		// setup
	});

	return () => {
		// cleanup
	};
});

// later...
destroy();
```

## Best Practices

Avoid using `$effect` for state synchronization. Instead of:

```svelte
<script>
	let count = $state(0);
	let doubled = $state();

	// don't do this!
	$effect(() => {
		doubled = count * 2;
	});
</script>
```

Use `$derived`:

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>
```

For linked values, use function bindings instead of effects:

```svelte
<script>
	let total = 100;
	let spent = $state(0);
	let left = $state(total);

	function updateSpent(value) {
		spent = value;
		left = total - spent;
	}

	function updateLeft(value) {
		left = value;
		spent = total - left;
	}
</script>

<label>
	<input type="range" bind:value={() => spent, updateSpent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" bind:value={() => left, updateLeft} max={total} />
	{left}/{total} left
</label>
```

## docs/svelte/02-runes/05-$props.md

# $props in Svelte 5

The `$props` rune defines component inputs.

## Basic Usage

```svelte
<!-- App.svelte -->
<script>
	import MyComponent from './MyComponent.svelte';
</script>

<MyComponent adjective="cool" />
```

```svelte
<!-- MyComponent.svelte -->
<script>
	let { adjective } = $props();
</script>

<p>this component is {adjective}</p>
```

## Fallback Values

```js
let { adjective = 'happy' } = $props();
```

> Note: Fallback values are not reactive state proxies

## Renaming Props

```js
let { super: trouper = 'lights are gonna find me' } = $props();
```

## Rest Props

```js
let { a, b, c, ...others } = $props();
```

## Updating Props

Props update when parent values change. Child components can temporarily override prop values:

```svelte
<!-- App.svelte -->
<script>
	import Child from './Child.svelte';
	let count = $state(0);
</script>

<button onclick={() => (count += 1)}>
	clicks (parent): {count}
</button>

<Child {count} />
```

```svelte
<!-- Child.svelte -->
<script>
	let { count } = $props();
</script>

<button onclick={() => (count += 1)}>
	clicks (child): {count}
</button>
```

### Important Rules

1. You can reassign props but should not mutate them unless they are `$bindable`
2. Mutating regular objects has no effect
3. Mutating reactive state proxies works but triggers an `ownership_invalid_mutation` warning
4. Fallback values are not reactive state proxies, so mutations won't cause updates

## Type Safety

```svelte
<script lang="ts">
	let { adjective }: { adjective: string } = $props();
</script>
```

Or with JSDoc:

```svelte
<script>
	/** @type {{ adjective: string }} */
	let { adjective } = $props();
</script>
```

With separate type declaration:

```svelte
<script lang="ts">
	interface Props {
		adjective: string;
	}

	let { adjective }: Props = $props();
</script>
```

## $props.id()

Generates a unique ID for the component instance:

```svelte
<script>
	const uid = $props.id();
</script>

<form>
	<label for="{uid}-firstname">First Name: </label>
	<input id="{uid}-firstname" type="text" />

	<label for="{uid}-lastname">Last Name: </label>
	<input id="{uid}-lastname" type="text" />
</form>
```

## docs/svelte/02-runes/06-$bindable.md

# Svelte 5 Runes: $bindable

## Basic Usage

`$bindable` enables two-way data flow between parent and child components.

```svelte
/// file: FancyInput.svelte
<script>
	let { value = $bindable(), ...props } = $props();
</script>

<input bind:value={value} {...props} />
```

Parent component can bind to the value:

```svelte
/// file: App.svelte
<script>
	import FancyInput from './FancyInput.svelte';

	let message = $state('hello');
</script>

<FancyInput bind:value={message} />
<p>{message}</p>
```

## Default Values

Provide fallback values when no prop is passed:

```js
/// file: FancyInput.svelte
let { value = $bindable('fallback'), ...props } = $props();
```

## Notes

- Use sparingly - props typically flow one way (parent to child)
- Without `bind:` in parent, behaves like a normal prop
- Allows child components to mutate parent state

## docs/svelte/02-runes/07-$inspect.md

# Svelte 5 Documentation: $inspect

## Basic Usage

```svelte
<script>
	let count = $state(0);
	let message = $state('hello');

	$inspect(count, message); // logs when `count` or `message` change
</script>

<button onclick={() => count++}>Increment</button>
<input bind:value={message} />
```

> **Note**: `$inspect` only works during development. In production, it becomes a no-op.

## $inspect(...).with

Customize logging behavior with a callback:

```svelte
<script>
	let count = $state(0);

	$inspect(count).with((type, count) => {
		if (type === 'update') {
			debugger; // or `console.trace`, or whatever you want
		}
	});
</script>

<button onclick={() => count++}>Increment</button>
```

Quick trace shorthand:

```js
$inspect(stuff).with(console.trace);
```

## $inspect.trace(...)

Traces reactive dependencies in development:

```svelte
<script>
	import { doSomeWork } from './elsewhere';

	$effect(() => {
		$inspect.trace(); // logs which reactive values triggered this effect
		doSomeWork();
	});
</script>
```

Optional label parameter available.

## docs/svelte/02-runes/08-$host.md

# $host

When compiling a component as a custom element, the `$host` rune provides access to the host element.

```svelte
/// file: Stepper.svelte
<svelte:options customElement="my-stepper" />

<script>
	function dispatch(type) {
		$host().dispatchEvent(new CustomEvent(type));
	}
</script>

<button onclick={() => dispatch('decrement')}>decrement</button>
<button onclick={() => dispatch('increment')}>increment</button>
```

```svelte
/// file: App.svelte
<script>
	import './Stepper.svelte';

	let count = $state(0);
</script>

<my-stepper
	ondecrement={() => count -= 1}
	onincrement={() => count += 1}
></my-stepper>

<p>count: {count}</p>
```

## docs/svelte/03-template-syntax/01-basic-markup.md

# Svelte 5 Basic Markup

## Tags

```svelte
<script>
	import Widget from './Widget.svelte';
</script>

<div>
	<Widget />
</div>
```

- Lowercase tags (`<div>`) = HTML elements
- Capitalized tags or dot notation (`<Widget>`, `<my.stuff>`) = components

## Element Attributes

```svelte
<div class="foo">
	<button disabled>can't touch this</button>
</div>
```

- Values can be unquoted: `<input type=checkbox />`
- Can contain JS expressions: `<a href="page/{p}">page {p}</a>`
- Can be JS expressions: `<button disabled={!clickable}>...</button>`
- Boolean attributes included if truthy, excluded if falsy
- Other attributes included unless nullish (`null`/`undefined`)
- Shorthand: `<button {disabled}>...</button>` instead of `<button disabled={disabled}>...</button>`

## Component Props

```svelte
<Widget foo={bar} answer={42} text="hello" />
```

- Shorthand: `{name}` instead of `name={name}`
- Spread props: `<Widget {...things} />`

## Events

```svelte
<button onclick={() => console.log('clicked')}>click me</button>
```

- Case sensitive: `onclick` ≠ `onClick`
- Shorthand: `<button {onclick}>click me</button>`
- Can be spread: `<button {...eventAttrs}>click me</button>`
- `ontouchstart`/`ontouchmove` are passive by default

### Event Delegation
Svelte delegates many common events (click, input, keydown, etc.) to a single listener at the root.

Gotchas:
- Manual dispatched events need `{bubbles: true}`
- Avoid `stopPropagation` with `addEventListener`
- Use `on` from `svelte/events` instead of `addEventListener`

## Text Expressions

```svelte
<h1>Hello {name}!</h1>
<p>{a} + {b} = {a + b}.</p>

<div>{(/^[A-Za-z ]+$/).test(value) ? x : y}</div>
```

- `null`/`undefined` are omitted, others coerced to strings
- RegExp literals need parentheses
- Expressions are escaped to prevent injection
- For HTML: `{@html potentiallyUnsafeHtmlString}`

## Comments

```svelte
<!-- This is a comment -->
<!-- svelte-ignore a11y-autofocus -->
<input bind:value={name} autofocus />

<!-- @component
This comment will show when hovering over the component name
-->
```

## docs/svelte/03-template-syntax/02-if.md

# {#if ...}

```svelte
{#if expression}...{/if}
{#if expression}...{:else if expression}...{/if}
{#if expression}...{:else}...{/if}
```

Conditionally render content with if blocks:

```svelte
{#if answer === 42}
	<p>what was the question?</p>
{/if}
```

Chain conditions with `{:else if}` and `{:else}`:

```svelte
{#if porridge.temperature > 100}
	<p>too hot!</p>
{:else if 80 > porridge.temperature}
	<p>too cold!</p>
{:else}
	<p>just right!</p>
{/if}
```

Note: Blocks can wrap elements or text within elements.

## docs/svelte/03-template-syntax/03-each.md

# Svelte 5 Each Blocks

## Basic Usage

```svelte
{#each expression as name}...{/each}
{#each expression as name, index}...{/each}
```

Iterate over arrays, array-likes, or iterables (Map, Set, etc.):

```svelte
<h1>Shopping list</h1>
<ul>
	{#each items as item}
		<li>{item.name} x {item.qty}</li>
	{/each}
</ul>
```

With index:

```svelte
{#each items as item, i}
	<li>{i + 1}: {item.name} x {item.qty}</li>
{/each}
```

## Keyed Each Blocks

```svelte
{#each expression as name (key)}...{/each}
{#each expression as name, index (key)}...{/each}
```

Keys help Svelte efficiently update lists when data changes:

```svelte
{#each items as item (item.id)}
	<li>{item.name} x {item.qty}</li>
{/each}

{#each items as item, i (item.id)}
	<li>{i + 1}: {item.name} x {item.qty}</li>
{/each}
```

## Destructuring

```svelte
{#each items as { id, name, qty }, i (id)}
	<li>{i + 1}: {name} x {qty}</li>
{/each}

{#each objects as { id, ...rest }}
	<li><span>{id}</span><MyComponent {...rest} /></li>
{/each}

{#each items as [id, ...rest]}
	<li><span>{id}</span><MyComponent values={rest} /></li>
{/each}
```

## Each Without Item

For repeating n times:

```svelte
{#each { length: 8 }, rank}
	{#each { length: 8 }, file}
		<div class:black={(rank + file) % 2 === 1}></div>
	{/each}
{/each}
```

## Else Blocks

For empty lists:

```svelte
{#each todos as todo}
	<p>{todo.text}</p>
{:else}
	<p>No tasks today!</p>
{/each}
```

## docs/svelte/03-template-syntax/04-key.md

# {#key ...}

```svelte
{#key expression}...{/key}
```

Key blocks destroy and recreate their contents when an expression value changes:

```svelte
{#key value}
	<Component />
{/key}
```

Useful for:
- Reinstantiating components when values change
- Triggering transitions on value changes:

```svelte
{#key value}
	<div transition:fade>{value}</div>
{/key}
```

## docs/svelte/03-template-syntax/05-await.md

# {#await ...}

Await blocks handle the three states of a Promise: pending, fulfilled, or rejected.

```svelte
{#await promise}
	<p>waiting for the promise to resolve...</p>
{:then value}
	<p>The value is {value}</p>
{:catch error}
	<p>Something went wrong: {error.message}</p>
{/await}
```

> During SSR, only the pending branch renders. If expression isn't a Promise, only `:then` branch renders.

## Simplified Variants

Omit `:catch` when error handling isn't needed:
```svelte
{#await promise}
	<p>waiting for the promise to resolve...</p>
{:then value}
	<p>The value is {value}</p>
{/await}
```

Omit pending state:
```svelte
{#await promise then value}
	<p>The value is {value}</p>
{/await}
```

Show only error state:
```svelte
{#await promise catch error}
	<p>The error is {error}</p>
{/await}
```

> You can use `#await` for lazy component loading:
> ```svelte
> {#await import('./Component.svelte') then { default: Component }}
> 	<Component />
> {/await}
> ```

## docs/svelte/03-template-syntax/06-snippet.md

# Svelte 5 Snippets

## {#snippet ...}

```svelte
{#snippet name()}...{/snippet}
{#snippet name(param1, param2, paramN)}...{/snippet}
```

Snippets create reusable markup chunks within components:

```svelte
{#snippet figure(image)}
	<figure>
		<img src={image.src} alt={image.caption} width={image.width} height={image.height} />
		<figcaption>{image.caption}</figcaption>
	</figure>
{/snippet}

{#each images as image}
	{#if image.href}
		<a href={image.href}>
			{@render figure(image)}
		</a>
	{:else}
		{@render figure(image)}
	{/if}
{/each}
```

Snippets can have parameters with default values and support destructuring (no rest parameters).

## Scope

Snippets can access outer scope values:

```svelte
<script>
	let { message = `it's great to see you!` } = $props();
</script>

{#snippet hello(name)}
	<p>hello {name}! {message}!</p>
{/snippet}

{@render hello('alice')}
{@render hello('bob')}
```

Snippets are visible to siblings and their children. They can reference themselves and other snippets:

```svelte
{#snippet countdown(n)}
	{#if n > 0}
		<span>{n}...</span>
		{@render countdown(n - 1)}
	{:else}
		{@render blastoff()}
	{/if}
{/snippet}

{#snippet blastoff()}
	<span>🚀</span>
{/snippet}

{@render countdown(10)}
```

## Passing Snippets to Components

### Explicit Props

```svelte
<script>
	import Table from './Table.svelte';

	const fruits = [
		{ name: 'apples', qty: 5, price: 2 },
		{ name: 'bananas', qty: 10, price: 1 },
		{ name: 'cherries', qty: 20, price: 0.5 }
	];
</script>

{#snippet header()}
	<th>fruit</th>
	<th>qty</th>
	<th>price</th>
	<th>total</th>
{/snippet}

{#snippet row(d)}
	<td>{d.name}</td>
	<td>{d.qty}</td>
	<td>{d.price}</td>
	<td>{d.qty * d.price}</td>
{/snippet}

<Table data={fruits} {header} {row} />
```

### Implicit Props

Snippets inside a component become props on that component:

```svelte
<Table data={fruits}>
	{#snippet header()}
		<th>fruit</th>
		<th>qty</th>
		<th>price</th>
		<th>total</th>
	{/snippet}

	{#snippet row(d)}
		<td>{d.name}</td>
		<td>{d.qty}</td>
		<td>{d.price}</td>
		<td>{d.qty * d.price}</td>
	{/snippet}
</Table>
```

### Implicit `children` Snippet

Non-snippet content becomes the `children` snippet:

```svelte
<!-- App.svelte -->
<Button>click me</Button>
```

```svelte
<!-- Button.svelte -->
<script>
	let { children } = $props();
</script>

<button>{@render children()}</button>
```

> Note: Avoid having props named `children` if you also have content inside the component

### Optional Snippet Props

Using optional chaining:
```svelte
<script>
    let { children } = $props();
</script>

{@render children?.()}
```

Using fallback content:
```svelte
<script>
    let { children } = $props();
</script>

{#if children}
    {@render children()}
{:else}
    fallback content
{/if}
```

## Typing Snippets

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		data: any[];
		children: Snippet;
		row: Snippet<[any]>;
	}

	let { data, children, row }: Props = $props();
</script>
```

With generics:
```svelte
<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	let {
		data,
		children,
		row
	}: {
		data: T[];
		children: Snippet;
		row: Snippet<[T]>;
	} = $props();
</script>
```

## Exporting Snippets

Top-level snippets can be exported from `<script module>` (requires Svelte 5.5.0+):

```svelte
<script module>
	export { add };
</script>

{#snippet add(a, b)}
	{a} + {b} = {a + b}
{/snippet}
```

## Advanced Usage

- Programmatic snippets can be created with `createRawSnippet` API
- Slots from Svelte 4 are deprecated in Svelte 5 in favor of snippets

## docs/svelte/03-template-syntax/07-@render.md

# {@render ...}

Use `{@render ...}` to render [snippets](snippet).

```svelte
{#snippet sum(a, b)}
	<p>{a} + {b} = {a + b}</p>
{/snippet}

{@render sum(1, 2)}
{@render sum(3, 4)}
{@render sum(5, 6)}
```

The expression can be an identifier or any JavaScript expression:

```svelte
{@render (cool ? coolSnippet : lameSnippet)()}
```

## Optional snippets

For potentially undefined snippets, use optional chaining:

```svelte
{@render children?.()}
```

Or use an `{#if ...}` block with fallback content:

```svelte
{#if children}
	{@render children()}
{:else}
	<p>fallback content</p>
{/if}
```

## docs/svelte/03-template-syntax/08-@html.md

# {@html ...}

Use `{@html ...}` to inject raw HTML:

```svelte
<article>
	{@html content}
</article>
```

> [!NOTE] Always escape strings or use controlled values to prevent XSS attacks.

## Limitations

- Expression must be valid standalone HTML
- Will not compile Svelte code
- Content is 'invisible' to Svelte

## Styling

Content rendered with `{@html ...}` won't receive scoped styles. Use `:global` modifier:

```svelte
<style>
	article:global{
		a { color: hotpink }
		img { width: 100% }
	}
</style>
```

## docs/svelte/03-template-syntax/09-@const.md

# {@const ...}

The `{@const ...}` tag defines a local constant within a block.

```svelte
{#each boxes as box}
	{@const area = box.width * box.height}
	{box.width} * {box.height} = {area}
{/each}
```

Only allowed as an immediate child of:
- Blocks (`{#if ...}`, `{#each ...}`, `{#snippet ...}`, etc.)
- Components (`<Component />`)
- `<svelte:boundary>`

## docs/svelte/03-template-syntax/10-@debug.md

# {@debug ...}

The `{@debug ...}` tag provides debugging capabilities in Svelte components:

```svelte
<script>
	let user = {
		firstname: 'Ada',
		lastname: 'Lovelace'
	};
</script>

{@debug user}

<h1>Hello {user.firstname}!</h1>
```

## Usage

- Logs values when they change and pauses execution if devtools are open
- Accepts comma-separated variable names (not expressions):

```svelte
{@debug user}
{@debug user1, user2, user3}
```

- Without arguments, triggers on any state change:

```svelte
{@debug}
```

❌ Invalid usage (expressions not allowed):
```svelte
{@debug user.firstname}
{@debug myArray[0]}
{@debug !isReady}
{@debug typeof user === 'object'}
```

## docs/svelte/03-template-syntax/11-bind.md

# Svelte 5 and SvelteKit Condensed Documentation

## bind:

Data flows down from parent to child. `bind:` allows data to flow upward.

```svelte
<input bind:value={value} />
<input bind:value /> <!-- shorthand when names match -->
```

### Function bindings (v5.9.0+)

```svelte
<input bind:value={
	() => value,
	(v) => value = v.toLowerCase()}
/>

<!-- For readonly bindings -->
<div
	bind:clientWidth={null, redraw}
	bind:clientHeight={null, redraw}
>...</div>
```

### Input bindings

```svelte
<!-- Text input -->
<script>
	let message = $state('hello');
</script>
<input bind:value={message} />

<!-- Numeric input coerces to number -->
<script>
	let a = $state(1);
	let b = $state(2);
</script>
<input type="number" bind:value={a} min="0" max="10" />
<input type="range" bind:value={b} min="0" max="10" />

<!-- Checkbox -->
<input type="checkbox" bind:checked={accepted} />

<!-- Form reset with defaultValue (v5.6.0+) -->
<form>
	<input bind:value defaultValue="not the empty string">
	<input type="reset" value="Reset">
</form>

<!-- Checkbox with defaultChecked (v5.6.0+) -->
<form>
	<input type="checkbox" bind:checked defaultChecked={true}>
	<input type="reset" value="Reset">
</form>
```

### Group bindings

```svelte
<script>
	let tortilla = $state('Plain');
	/** @type {Array<string>} */
	let fillings = $state([]);
</script>

<!-- Radio buttons -->
<input type="radio" bind:group={tortilla} value="Plain" />
<input type="radio" bind:group={tortilla} value="Whole wheat" />

<!-- Checkboxes -->
<input type="checkbox" bind:group={fillings} value="Rice" />
<input type="checkbox" bind:group={fillings} value="Beans" />
```

### File inputs

```svelte
<script>
	let files = $state();

	function clear() {
		files = new DataTransfer().files; // null/undefined won't work
	}
</script>

<input bind:files type="file" />
<button onclick={clear}>clear</button>
```

### Select bindings

```svelte
<!-- Single select -->
<select bind:value={selected}>
	<option value={a}>a</option>
	<option value={b}>b</option>
</select>

<!-- Multiple select -->
<select multiple bind:value={fillings}>
	<option>Rice</option> <!-- value attribute can be omitted -->
	<option>Beans</option>
</select>

<!-- Default selection -->
<select bind:value={selected}>
	<option value={a}>a</option>
	<option value={b} selected>b</option>
</select>
```

### Media element bindings

```svelte
<!-- Audio bindings -->
<audio 
  src={clip} 
  bind:duration 
  bind:currentTime 
  bind:paused
></audio>

<!-- Video has same bindings as audio plus: -->
<video bind:videoWidth bind:videoHeight></video>

<!-- Image bindings -->
<img bind:naturalWidth bind:naturalHeight />
```

### Other element bindings

```svelte
<!-- Details -->
<details bind:open={isOpen}>
	<summary>Title</summary>
	<p>Content</p>
</details>

<!-- Contenteditable -->
<div contenteditable="true" bind:innerHTML={html}></div>

<!-- Dimensions (readonly) -->
<div bind:offsetWidth={width} bind:offsetHeight={height}>
	<Chart {width} {height} />
</div>
```

### bind:this

```svelte
<script>
	/** @type {HTMLCanvasElement} */
	let canvas;

	$effect(() => {
		const ctx = canvas.getContext('2d');
		drawStuff(ctx);
	});
</script>

<canvas bind:this={canvas}></canvas>

<!-- Component instances -->
<ShoppingCart bind:this={cart} />
<button onclick={() => cart.empty()}>Empty cart</button>
```

### Component bindings

```svelte
<!-- Parent -->
<Keypad bind:value={pin} />

<!-- Child (Keypad.svelte) -->
<script>
	let { value = $bindable() } = $props();
</script>

<!-- With fallback -->
<script>
	let { bindableProperty = $bindable('fallback value') } = $props();
</script>
```

## docs/svelte/03-template-syntax/12-use.md

# use: Directive in Svelte 5

Actions are functions called when an element is mounted, added with the `use:` directive.

## Basic Usage

```svelte
<script>
	/** @type {import('svelte/action').Action} */
	function myaction(node) {
		$effect(() => {
			// setup code
			return () => {
				// cleanup code
			};
		});
	}
</script>

<div use:myaction>...</div>
```

## With Parameters

```svelte
<script>
	/** @type {import('svelte/action').Action} */
	function myaction(node, data) {
		// ...
	}
</script>

<div use:myaction={data}>...</div>
```

> Note: Actions run once when mounted (not during SSR). They don't re-run if parameters change.

## Typing

```svelte
<script>
	/**
	 * @type {import('svelte/action').Action<
	 * 	HTMLDivElement,
	 * 	undefined,
	 * 	{
	 * 		onswiperight: (e: CustomEvent) => void;
	 * 		onswipeleft: (e: CustomEvent) => void;
	 * 	}
	 * >}
	 */
	function gestures(node) {
		$effect(() => {
			// ...
			node.dispatchEvent(new CustomEvent('swipeleft'));
			// ...
			node.dispatchEvent(new CustomEvent('swiperight'));
		});
	}
</script>

<div
	use:gestures
	onswipeleft={next}
	onswiperight={prev}
>...</div>
```

The `Action` interface accepts three optional type arguments:
1. Node type (can be `Element` for all elements)
2. Parameter type
3. Custom event handlers created by the action

## docs/svelte/03-template-syntax/13-transition.md

# Svelte 5 Transitions

## Basic Usage

Transitions are triggered when elements enter or leave the DOM due to state changes.

```svelte
<script>
	import { fade } from 'svelte/transition';
	let visible = $state(false);
</script>

<button onclick={() => visible = !visible}>toggle</button>

{#if visible}
	<div transition:fade>fades in and out</div>
{/if}
```

## Local vs Global

Transitions are local by default - they only play when their immediate block is created/destroyed.

```svelte
{#if x}
	{#if y}
		<p transition:fade>fades in and out only when y changes</p>
		<p transition:fade|global>fades in and out when x or y change</p>
	{/if}
{/if}
```

## Parameters

Transitions can accept parameters:

```svelte
{#if visible}
	<div transition:fade={{ duration: 2000 }}>fades in and out over two seconds</div>
{/if}
```

## Custom Transitions

Custom transitions return an object with animation properties:

```svelte
<script>
	import { elasticOut } from 'svelte/easing';

	export let visible;

	function whoosh(node, params) {
		const existingTransform = getComputedStyle(node).transform.replace('none', '');

		return {
			delay: params.delay || 0,
			duration: params.duration || 400,
			easing: params.easing || elasticOut,
			css: (t, u) => `transform: ${existingTransform} scale(${t})`
		};
	}
</script>

{#if visible}
	<div in:whoosh>whooshes in</div>
{/if}
```

Use `css` function when possible (runs off main thread). For complex animations, use `tick`:

```svelte
<script>
	export let visible = false;

	function typewriter(node, { speed = 1 }) {
		const valid = node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE;

		if (!valid) {
			throw new Error(`This transition only works on elements with a single text node child`);
		}

		const text = node.textContent;
		const duration = text.length / (speed * 0.01);

		return {
			duration,
			tick: (t) => {
				const i = ~~(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}
</script>

{#if visible}
	<p in:typewriter={{ speed: 1 }}>The quick brown fox jumps over the lazy dog</p>
{/if}
```

Custom transitions receive an `options` object with `direction` (`in`, `out`, or `both`).

## Events

Transition elements dispatch these events:
- `introstart`
- `introend`
- `outrostart`
- `outroend`

```svelte
{#if visible}
	<p
		transition:fly={{ y: 200, duration: 2000 }}
		onintrostart={() => (status = 'intro started')}
		onoutrostart={() => (status = 'outro started')}
		onintroend={() => (status = 'intro ended')}
		onoutroend={() => (status = 'outro ended')}
	>
		Flies in and out
	</p>
{/if}
```

## docs/svelte/03-template-syntax/14-in-and-out.md

# in: and out: Directives

These directives create unidirectional transitions, unlike bidirectional `transition:` directives.

- `in:` transitions play when element enters
- `out:` transitions play when element leaves
- Both transitions run simultaneously during direction changes
- Aborted transitions restart from scratch

```svelte
<script>
  import { fade, fly } from 'svelte/transition';
  
  let visible = $state(false);
</script>

<label>
  <input type="checkbox" bind:checked={visible}>
  visible
</label>

{#if visible}
	<div in:fly={{ y: 200 }} out:fade>flies in, fades out</div>
{/if}
```

## docs/svelte/03-template-syntax/15-animate.md

# animate:

Animations trigger when contents of a keyed each block are re-ordered (not when elements are added/removed).

```svelte
{#each list as item, index (item)}
	<li animate:flip>{item}</li>
{/each}
```

## Animation Parameters

```svelte
{#each list as item, index (item)}
	<li animate:flip={{ delay: 500 }}>{item}</li>
{/each}
```

## Custom animation functions

```js
animation = (node: HTMLElement, { from: DOMRect, to: DOMRect }, params: any) => {
	delay?: number,
	duration?: number,
	easing?: (t: number) => number,
	css?: (t: number, u: number) => string,
	tick?: (t: number, u: number) => void
}
```

Custom animations receive:
- `node`: The HTML element
- `animation`: Object with `from` and `to` DOMRect properties
- `parameters`: Any custom parameters

Return an object with:
- `css` method: Creates a web animation (preferred for performance)
- `tick` method: Called during animation (use only when CSS can't achieve the effect)

The `t` argument is a value from 0-1 after easing, `u` equals `1-t`.

### CSS Example

```svelte
<script>
	import { cubicOut } from 'svelte/easing';

	/**
	 * @param {HTMLElement} node
	 * @param {{ from: DOMRect; to: DOMRect }} states
	 * @param {any} params
	 */
	function whizz(node, { from, to }, params) {
		const dx = from.left - to.left;
		const dy = from.top - to.top;

		const d = Math.sqrt(dx * dx + dy * dy);

		return {
			delay: 0,
			duration: Math.sqrt(d) * 120,
			easing: cubicOut,
			css: (t, u) => `transform: translate(${u * dx}px, ${u * dy}px) rotate(${t * 360}deg);`
		};
	}
</script>

{#each list as item, index (item)}
	<div animate:whizz>{item}</div>
{/each}
```

### Tick Example

```svelte
<script>
	import { cubicOut } from 'svelte/easing';

	/**
	 * @param {HTMLElement} node
	 * @param {{ from: DOMRect; to: DOMRect }} states
	 * @param {any} params
	 */
	function whizz(node, { from, to }, params) {
		const dx = from.left - to.left;
		const dy = from.top - to.top;

		const d = Math.sqrt(dx * dx + dy * dy);

		return {
			delay: 0,
			duration: Math.sqrt(d) * 120,
			easing: cubicOut,
			tick: (t, u) => Object.assign(node.style, { color: t > 0.5 ? 'Pink' : 'Blue' })
		};
	}
</script>

{#each list as item, index (item)}
	<div animate:whizz>{item}</div>
{/each}
```

> Prefer `css` over `tick` when possible - web animations run off the main thread for better performance.

## docs/svelte/03-template-syntax/17-style.md

# style: directive

The `style:` directive provides a shorthand for setting styles on elements.

## Basic Usage

```svelte
<div style:color="red">...</div>
<!-- Equivalent to -->
<div style="color: red;">...</div>
```

## Dynamic Values

```svelte
<div style:color={myColor}>...</div>
```

## Shorthand Form

```svelte
<div style:color>...</div>
```

## Multiple Styles

```svelte
<div 
  style:color 
  style:width="12rem" 
  style:background-color={darkMode ? 'black' : 'white'}>
  ...
</div>
```

## Important Modifier

```svelte
<div style:color|important="red">...</div>
```

## Precedence

When combined with `style` attributes, directives take precedence:

```svelte
<div style="color: blue;" style:color="red">This will be red</div>
```

## docs/svelte/03-template-syntax/18-class.md

# Svelte Class Handling

## Class Attribute

### Basic Usage

```svelte
<div class={large ? 'large' : 'small'}>...</div>
```

> Note: Falsy values are stringified, but `null` and `undefined` omit the attribute entirely.

### Objects and Arrays (Svelte 5.16+)

**Objects** - truthy keys are added:

```svelte
<script>
	let { cool } = $props();
</script>

<div class={{ cool, lame: !cool }}>...</div>
```

**Arrays** - truthy values are combined:

```svelte
<div class={[faded && 'saturate-0 opacity-50', large && 'scale-200']}>...</div>
```

**Combining with props**:

```svelte
<!file: Button.svelte>
<script>
	let props = $props();
</script>

<button {...props} class={['cool-button', props.class]}>
	{@render props.children?.()}
</button>
```

Usage:

```svelte
<!file: App.svelte>
<script>
	import Button from './Button.svelte';
	let useTailwind = $state(false);
</script>

<Button
	onclick={() => useTailwind = true}
	class={{ 'bg-blue-700 sm:w-1/2': useTailwind }}
>
	Accept the inevitability of Tailwind
</Button>
```

### TypeScript Support

```svelte
<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	const props: { class: ClassValue } = $props();
</script>

<div class={['original', props.class]}>...</div>
```

## Class Directive (Legacy)

```svelte
<div class:cool={cool} class:lame={!cool}>...</div>
```

Shorthand when name matches value:

```svelte
<div class:cool class:lame={!cool}>...</div>
```

> Note: Prefer using the class attribute with objects/arrays over class: directives in Svelte 5.16+.

## docs/svelte/04-styling/01-scoped-styles.md

# Scoped Styles in Svelte

## Basic Scoping

Styles in `<style>` tags are automatically scoped to the component using a generated class (e.g., `svelte-123xyz`).

```svelte
<style>
	p {
		/* this will only affect <p> elements in this component */
		color: burlywood;
	}
</style>
```

## Specificity

- Scoped selectors get a specificity boost of 0-1-0 from the added class
- Component styles override global styles with the same selector, even if loaded later
- Multiple occurrences of the scoping class after the first use `:where(.svelte-xyz123)` to avoid further specificity increases

## Scoped Keyframes

Keyframe animations are also scoped to the component:

```svelte
<style>
	.bouncy {
		animation: bounce 10s;
	}

	/* these keyframes are only accessible inside this component */
	@keyframes bounce {
		/* ... */
	}
</style>
```

## docs/svelte/04-styling/02-global-styles.md

# Global Styles in Svelte

## :global(...)

Apply styles globally to specific selectors:

```svelte
<style>
	:global(body) {
		/* applies to <body> */
		margin: 0;
	}

	div :global(strong) {
		/* applies to all <strong> elements, in any component,
		   that are inside <div> elements belonging
		   to this component */
		color: goldenrod;
	}

	p:global(.big.red) {
		/* applies to all <p> elements belonging to this component
		   with `class="big red"`, even if it is applied
		   programmatically (for example by a library) */
	}
</style>
```

For global keyframes, prepend names with `-global-`:

```svelte
<style>
	@keyframes -global-my-animation-name {
		/* code goes here */
	}
</style>
```

## :global

Apply styles to multiple selectors globally using a block:

```svelte
<style>
	:global {
		/* applies to every <div> in your application */
		div { ... }

		/* applies to every <p> in your application */
		p { ... }
	}

	.a :global {
		/* applies to every `.b .c .d` element, in any component,
		   that is inside an `.a` element in this component */
		.b .c .d {...}
	}
</style>
```

## docs/svelte/04-styling/03-custom-properties.md

# Custom Properties

Pass CSS custom properties to components:

```svelte
<Slider
	bind:value
	min={0}
	max={100}
	--track-color="black"
	--thumb-color="rgb({r} {g} {b})"
/>
```

This desugars to:

```svelte
<svelte-css-wrapper style="display: contents; --track-color: black; --thumb-color: rgb({r} {g} {b})">
	<Slider
		bind:value
		min={0}
		max={100}
	/>
</svelte-css-wrapper>
```

For SVG elements, it uses `<g>` instead:

```svelte
<g style="--track-color: black; --thumb-color: rgb({r} {g} {b})">
	<Slider
		bind:value
		min={0}
		max={100}
	/>
</g>
```

Inside components, access these properties with fallbacks:

```svelte
<style>
	.track {
		background: var(--track-color, #aaa);
	}

	.thumb {
		background: var(--thumb-color, blue);
	}
</style>
```

Custom properties can also be defined on parent elements (like `:root`) to apply globally.

> Note: The wrapper element won't affect layout but may impact CSS selectors using the `>` combinator.

## docs/svelte/04-styling/04-nested-style-elements.md

# Nested `<style>` elements

Only one top-level `<style>` tag is allowed per component. Nested `<style>` tags inside elements or logic blocks are inserted as-is into the DOM without Svelte's scoping or processing.

```svelte
<div>
	<style>
		/* this style tag will be inserted as-is */
		div {
			/* this will apply to all `<div>` elements in the DOM */
			color: red;
		}
	</style>
</div>
```

## docs/svelte/05-special-elements/01-svelte-boundary.md

# `<svelte:boundary>`

```svelte
<svelte:boundary onerror={handler}>...</svelte:boundary>
```

Error boundaries guard against rendering errors in parts of your app, preventing them from breaking the entire application.

## Usage

Boundaries catch errors during:
- Component rendering
- Component updates
- `$effect` functions within the boundary

They do NOT catch errors in:
- Event handlers
- Timeouts
- Async operations

## Properties

### `failed`

Renders a fallback UI with the error and reset function:

```svelte
<svelte:boundary>
	<FlakyComponent />

	{#snippet failed(error, reset)}
		<button onclick={reset}>oops! try again</button>
	{/snippet}
</svelte:boundary>
```

### `onerror`

Handles errors programmatically:

```svelte
<svelte:boundary onerror={(e) => report(e)}>
	...
</svelte:boundary>
```

Can be used to manage error state outside the boundary:

```svelte
<script>
	let error = $state(null);
	let reset = $state(() => {});

	function onerror(e, r) {
		error = e;
		reset = r;
	}
</script>

<svelte:boundary {onerror}>
	<FlakyComponent />
</svelte:boundary>

{#if error}
	<button onclick={() => {
		error = null;
		reset();
	}}>
		oops! try again
	</button>
{/if}
```

Errors in `onerror` will propagate to parent boundaries.

## docs/svelte/05-special-elements/02-svelte-window.md

# Svelte Window Element

## `<svelte:window>`

Adds event listeners to the `window` object without manual cleanup.

```svelte
<svelte:window onevent={handler} />
<svelte:window bind:prop={value} />
```

Must appear at the top level of your component.

### Event Example

```svelte
<script>
	function handleKeydown(event) {
		alert(`pressed the ${event.key} key`);
	}
</script>

<svelte:window onkeydown={handleKeydown} />
```

### Bindable Properties

```svelte
<svelte:window bind:scrollY={y} />
```

**Read/Write Properties:**
- `scrollX`
- `scrollY`

**Readonly Properties:**
- `innerWidth`
- `innerHeight`
- `outerWidth`
- `outerHeight`
- `online` (alias for `window.navigator.onLine`)
- `devicePixelRatio`

> **Note:** Page won't scroll to initial bound values of `scrollX`/`scrollY` for accessibility reasons. Use `scrollTo()` in an `$effect` if needed.

## docs/svelte/05-special-elements/03-svelte-document.md

# <svelte:document>

```svelte
<svelte:document onevent={handler} />
<svelte:document bind:prop={value} />
```

Allows adding event listeners and actions to the `document` object.

- Must appear only at the top level of your component
- Never place inside blocks or elements
- Useful for events that don't fire on `window` (e.g., `visibilitychange`)

```svelte
<svelte:document onvisibilitychange={handleVisibilityChange} use:someAction />
```

## Bindable Properties (readonly)

- `activeElement`
- `fullscreenElement`
- `pointerLockElement`
- `visibilityState`

## docs/svelte/05-special-elements/04-svelte-body.md

# <svelte:body>

```svelte
<svelte:body onevent={handler} />
```

Allows adding event listeners and actions to `document.body`.

```svelte
<svelte:body onmouseenter={handleMouseenter} onmouseleave={handleMouseleave} use:someAction />
```

**Rules:**
- Must only appear at top level of component
- Cannot be inside blocks or elements
- Useful for events like `mouseenter`/`mouseleave` that don't fire on `window`

## docs/svelte/05-special-elements/05-svelte-head.md

# <svelte:head>

```svelte
<svelte:head>...</svelte:head>
```

Inserts elements into `document.head`. During SSR, head content is exposed separately from body content.

**Rules:**
- Must appear at top level of component
- Cannot be inside blocks or elements

**Example:**
```svelte
<svelte:head>
	<title>Hello world!</title>
	<meta name="description" content="This is where the description goes for SEO" />
</svelte:head>
```

## docs/svelte/05-special-elements/06-svelte-element.md

# <svelte:element>

```svelte
<svelte:element this={expression} />
```

Renders an element that is unknown at author time (e.g., from a CMS). Properties and event listeners are applied to the element.

- Only supports `bind:this` binding
- If `this` is nullish, nothing renders
- If `this` is a void element with children, throws runtime error in dev mode

```svelte
<script>
	let tag = $state('hr');
</script>

<svelte:element this={tag}>
	This text cannot appear inside an hr element
</svelte:element>
```

Specify namespace explicitly when needed:

```svelte
<svelte:element this={tag} xmlns="http://www.w3.org/2000/svg" />
```

Note: `this` must be a valid DOM element tag; `#text` or `svelte:head` won't work.

## docs/svelte/05-special-elements/07-svelte-options.md

# `<svelte:options>`

```svelte
<svelte:options option={value} />
```

## Available Options

- `runes={true|false}` - Forces component into runes or legacy mode
- `namespace="html|svg|mathml"` - Sets component namespace (default: "html")
- `customElement={...}` - Options for custom element compilation
- `css="injected"` - Injects styles inline

```svelte
<svelte:options customElement="my-custom-element" />
```

> Note: `immutable`, `accessors` options are deprecated in Svelte 5 and non-functional in runes mode.

## docs/svelte/06-runtime/01-stores.md

# Svelte Stores

## Overview

A store is an object that allows reactive access to a value via a store contract. Access store values in components with the `$` prefix.

```svelte
<script>
	import { writable } from 'svelte/store';

	const count = writable(0);
	console.log($count); // logs 0

	count.set(1);
	console.log($count); // logs 1

	$count = 2;
	console.log($count); // logs 2
</script>
```

## When to Use Stores

In Svelte 5, runes are preferred for most use cases:

```ts
/// file: state.svelte.js
export const userState = $state({
	name: 'name',
	/* ... */
});
```

```svelte
<script>
	import { userState } from './state.svelte.js';
</script>

<p>User name: {userState.name}</p>
<button onclick={() => {
	userState.name = 'new name';
}}>
	change name
</button>
```

Use stores for complex async data streams or when manual control over updates is needed.

## svelte/store API

### `writable`

Creates a store with values that can be set externally.

```js
import { writable } from 'svelte/store';

const count = writable(0);

count.subscribe((value) => {
	console.log(value);
}); // logs '0'

count.set(1); // logs '1'

count.update((n) => n + 1); // logs '2'
```

With start/stop functions:

```js
import { writable } from 'svelte/store';

const count = writable(0, () => {
	console.log('got a subscriber');
	return () => console.log('no more subscribers');
});

count.set(1); // does nothing

const unsubscribe = count.subscribe((value) => {
	console.log(value);
}); // logs 'got a subscriber', then '1'

unsubscribe(); // logs 'no more subscribers'
```

### `readable`

Creates a store whose value cannot be set externally.

```ts
import { readable } from 'svelte/store';

const time = readable(new Date(), (set) => {
	set(new Date());

	const interval = setInterval(() => {
		set(new Date());
	}, 1000);

	return () => clearInterval(interval);
});

const ticktock = readable('tick', (set, update) => {
	const interval = setInterval(() => {
		update((sound) => (sound === 'tick' ? 'tock' : 'tick'));
	}, 1000);

	return () => clearInterval(interval);
});
```

### `derived`

Derives a store from one or more other stores.

```ts
import { derived } from 'svelte/store';

const doubled = derived(a, ($a) => $a * 2);
```

Asynchronous derivation:

```ts
import { derived } from 'svelte/store';

const delayed = derived(
	a,
	($a, set) => {
		setTimeout(() => set($a), 1000);
	},
	2000
);

const delayedIncrement = derived(a, ($a, set, update) => {
	set($a);
	setTimeout(() => update((x) => x + 1), 1000);
});
```

With cleanup function:

```ts
import { derived } from 'svelte/store';

const tick = derived(
	frequency,
	($frequency, set) => {
		const interval = setInterval(() => {
			set(Date.now());
		}, 1000 / $frequency);

		return () => {
			clearInterval(interval);
		};
	},
	2000
);
```

Multiple source stores:

```ts
import { derived } from 'svelte/store';

const summed = derived([a, b], ([$a, $b]) => $a + $b);

const delayed = derived([a, b], ([$a, $b], set) => {
	setTimeout(() => set($a + $b), 1000);
});
```

### `readonly`

Makes a store readonly.

```js
import { readonly, writable } from 'svelte/store';

const writableStore = writable(1);
const readableStore = readonly(writableStore);

readableStore.subscribe(console.log);

writableStore.set(2); // console: 2
// readableStore.set(2); // ERROR
```

### `get`

Retrieves the current value of a store without subscribing.

```ts
import { get } from 'svelte/store';

const value = get(store);
```

## Store Contract

A valid store must:

1. Have a `.subscribe` method that accepts a subscription function
2. Call the subscription function immediately with the current value
3. Return an unsubscribe function
4. Optionally have a `.set` method (for writable stores)

## docs/svelte/06-runtime/02-context.md

# Context

Context allows components to access values from parent components without prop-drilling.

## Basic Usage

```svelte
<!-- Parent.svelte -->
<script>
	import { setContext } from 'svelte';

	setContext('my-context', 'hello from Parent.svelte');
</script>
```

```svelte
<!-- Child.svelte -->
<script>
	import { getContext } from 'svelte';

	const message = getContext('my-context');
</script>

<h1>{message}, inside Child.svelte</h1>
```

Usage:
```svelte
<Parent>
	<Child />
</Parent>
```

Available functions: `setContext`, `getContext`, `hasContext`, `getAllContexts`

## Using Context with State

```svelte
<script>
	import { setContext } from 'svelte';
	import Child from './Child.svelte';

	let counter = $state({
		count: 0
	});

	setContext('counter', counter);
</script>

<button onclick={() => counter.count += 1}>
	increment
</button>

<Child />
<Child />
<Child />
```

⚠️ Update properties directly rather than reassigning the object:

```svelte
<!-- CORRECT -->
<button onclick={() => counter.count = 0}>
	reset
</button>

<!-- WRONG - breaks reactivity -->
<button onclick={() => counter = { count: 0 }}>
	reset
</button>
```

## Type-Safe Context

```js
/// file: context.js
// @filename: ambient.d.ts
interface User {}

// @filename: index.js
//cut
import { getContext, setContext } from 'svelte';

const key = {};

/** @param {User} user */
export function setUserContext(user) {
	setContext(key, user);
}

export function getUserContext() {
	return /** @type {User} */ (getContext(key));
}
```

## Alternative to Global State

Context is safer than global state for server-side rendering, as it's not shared between requests.

```js
/// file: state.svelte.js
export const myGlobalState = $state({
	user: {
		// ...
	}
	// ...
});
```

Using global state during SSR can leak data between users.

## docs/svelte/06-runtime/03-lifecycle-hooks.md

# Svelte 5 Lifecycle Hooks

## `onMount`

Runs after component is mounted to the DOM. Not executed during SSR.

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('the component has mounted');
  });
</script>
```

Return a function for cleanup:

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const interval = setInterval(() => {
      console.log('beep');
    }, 1000);

    return () => clearInterval(interval);
  });
</script>
```

> [!NOTE] Cleanup only works when function is returned synchronously (not with async functions).

## `onDestroy`

Runs before component unmounts. Works in SSR components.

```svelte
<script>
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    console.log('the component is being destroyed');
  });
</script>
```

## `tick`

Returns a promise that resolves after pending state changes are applied.

```svelte
<script>
  import { tick } from 'svelte';

  $effect.pre(() => {
    console.log('the component is about to update');
    tick().then(() => {
      console.log('the component just updated');
    });
  });
</script>
```

## Deprecated: `beforeUpdate` / `afterUpdate`

Replaced by `$effect.pre` and `$effect` in Svelte 5.

### Chat Window Example

```svelte
<script>
  import {beforeUpdate, afterUpdate, tick } from 'svelte';

  let updatingMessages = false;
  let theme = $state('dark');
  let messages = $state([]);

  let viewport;

  $effect.pre(() => {
    if (!updatingMessages) return;
    messages;
    const autoscroll = viewport && viewport.offsetHeight + viewport.scrollTop > viewport.scrollHeight - 50;

    if (autoscroll) {
      tick().then(() => {
        viewport.scrollTo(0, viewport.scrollHeight);
      });
    }

    updatingMessages = false;
  });

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      const text = event.target.value;
      if (!text) return;

      updatingMessages = true;
      messages = [...messages, text];
      event.target.value = '';
    }
  }

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }
</script>

<div class:dark={theme === 'dark'}>
  <div bind:this={viewport}>
    {#each messages as message}
      <p>{message}</p>
    {/each}
  </div>

  <input onkeydown={handleKeydown} />

  <button onclick={toggle}> Toggle dark mode </button>
</div>
```

## docs/svelte/06-runtime/04-imperative-component-api.md

# Imperative Component API

## `mount`

Creates and mounts a component to a target element:

```js
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.querySelector('#app'),
  props: { some: 'property' }
});
```

**Note**: Effects (including `onMount` callbacks and action functions) don't run during `mount`. Use `flushSync()` to force pending effects to run.

## `unmount`

Removes a previously mounted component:

```js
import { mount, unmount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.body });

// later
unmount(app, { outro: true });
```

Returns a `Promise` that resolves after transitions complete (if `outro: true`) or immediately.

## `render`

Server-side only. Renders a component to HTML:

```js
import { render } from 'svelte/server';
import App from './App.svelte';

const result = render(App, {
  props: { some: 'property' }
});
result.body; // HTML for <body>
result.head; // HTML for <head>
```

## `hydrate`

Makes server-rendered HTML interactive:

```js
import { hydrate } from 'svelte';
import App from './App.svelte';

const app = hydrate(App, {
  target: document.querySelector('#app'),
  props: { some: 'property' }
});
```

Like `mount`, effects don't run during `hydrate` - use `flushSync()` afterward if needed.

## docs/svelte/07-misc/02-testing.md

# Svelte Testing Guide

## Unit and Integration Testing with Vitest

### Setup

```bash
npm install -D vitest
```

Configure Vite:

```js
// vite.config.js
import { defineConfig } from'vitest/config';

export default defineConfig({
  // Tell Vitest to use browser entry points
  resolve: process.env.VITEST
    ? { conditions: ['browser'] }
    : undefined
});
```

### Testing JavaScript Functions

```js
// multiplier.svelte.test.js
import { flushSync } from 'svelte';
import { expect, test } from 'vitest';
import { multiplier } from './multiplier.svelte.js';

test('Multiplier', () => {
  let double = multiplier(0, 2);
  expect(double.value).toEqual(0);
  
  double.set(5);
  expect(double.value).toEqual(10);
});
```

### Using Runes in Tests

Filename must include `.svelte`:

```js
// multiplier.svelte.test.js
import { flushSync } from 'svelte';
import { expect, test } from 'vitest';
import { multiplier } from './multiplier.svelte.js';

test('Multiplier', () => {
  let count = $state(0);
  let double = multiplier(() => count, 2);
  
  expect(double.value).toEqual(0);
  count = 5;
  expect(double.value).toEqual(10);
});
```

### Testing Effects

Wrap in `$effect.root` and use `flushSync()`:

```js
// logger.svelte.test.js
import { flushSync } from 'svelte';
import { expect, test } from 'vitest';
import { logger } from './logger.svelte.js';

test('Effect', () => {
  const cleanup = $effect.root(() => {
    let count = $state(0);
    let log = logger(() => count);
    
    flushSync();
    expect(log.value).toEqual([0]);
    
    count = 1;
    flushSync();
    expect(log.value).toEqual([0, 1]);
  });
  
  cleanup();
});
```

## Component Testing

### Setup

```bash
npm install -D jsdom
```

Update Vite config:

```js
// vite.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  resolve: process.env.VITEST
    ? { conditions: ['browser'] }
    : undefined
});
```

### Basic Component Test

```js
// component.test.js
import { flushSync, mount, unmount } from 'svelte';
import { expect, test } from 'vitest';
import Component from './Component.svelte';

test('Component', () => {
  const component = mount(Component, {
    target: document.body,
    props: { initial: 0 }
  });
  
  expect(document.body.innerHTML).toBe('<button>0</button>');
  
  document.body.querySelector('button').click();
  flushSync();
  
  expect(document.body.innerHTML).toBe('<button>1</button>');
  
  unmount(component);
});
```

### Using Testing Library

```js
// component.test.js
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import Component from './Component.svelte';

test('Component', async () => {
  const user = userEvent.setup();
  render(Component);
  
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent(0);
  
  await user.click(button);
  expect(button).toHaveTextContent(1);
});
```

## E2E Testing with Playwright

### Setup

Install via VS Code extension or:

```bash
npm init playwright
```

Configure Playwright:

```js
// playwright.config.js
const config = {
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
```

### Writing Tests

```js
// tests/hello-world.spec.js
import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

## docs/svelte/07-misc/03-typescript.md

# Svelte 5 TypeScript Guide

## Basic Usage

Add `lang="ts"` to script tags:

```svelte
<script lang="ts">
	let name: string = 'world';

	function greet(name: string) {
		alert(`Hello, ${name}!`);
	}
</script>

<button onclick={(e: Event) => greet(e.target.innerText)}>
	{name as string}
</button>
```

Only type-only features are supported by default. Features requiring code generation (enums, access modifiers with initializers) need a preprocessor.

## Setup

### SvelteKit/Vite (Recommended)

```ts
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess()
};

export default config;
```

For non-type-only features:

```ts
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess({ script: true })
};

export default config;
```

### tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "target": "ES2022", // or "ES2015" with "useDefineForClassFields": true
    "verbatimModuleSyntax": true,
    "isolatedModules": true
  }
}
```

## Typing Runes

### $props

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		requiredProperty: number;
		optionalProperty?: boolean;
		snippetWithStringArgument: Snippet<[string]>;
		eventHandler: (arg: string) => void;
		[key: string]: unknown;
	}

	let {
		requiredProperty,
		optionalProperty,
		snippetWithStringArgument,
		eventHandler,
		...everythingElse
	}: Props = $props();
</script>
```

### Generic $props

```svelte
<script lang="ts" generics="Item extends { text: string }">
	interface Props {
		items: Item[];
		select(item: Item): void;
	}

	let { items, select }: Props = $props();
</script>
```

### $state

```ts
// With initial value
let count: number = $state(0);

// Without initial value (use casting if needed)
let count = $state() as number;

// In classes
class Counter {
	count = $state() as number;
	constructor(initial: number) {
		this.count = initial;
	}
}
```

## Component Types

### Component Type

```svelte
<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		DynamicComponent: Component<{ prop: string }>;
	}

	let { DynamicComponent }: Props = $props();
</script>

<DynamicComponent prop="foo" />
```

### ComponentProps

```ts
import type { Component, ComponentProps } from 'svelte';
import MyComponent from './MyComponent.svelte';

function withProps<TComponent extends Component<any>>(
	component: TComponent,
	props: ComponentProps<TComponent>
) {}

withProps(MyComponent, { foo: 'bar' });
```

### Component Instance

```svelte
<script lang="ts">
	import MyComponent from './MyComponent.svelte';

	let componentConstructor: typeof MyComponent = MyComponent;
	let componentInstance: MyComponent;
</script>

<MyComponent bind:this={componentInstance} />
```

## Wrapper Components

```svelte
<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let { children, ...rest }: HTMLButtonAttributes = $props();
</script>

<button {...rest}>
	{@render children?.()}
</button>
```

For elements without dedicated types:

```svelte
<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';

	let { children, ...rest }: SvelteHTMLElements['div'] = $props();
</script>
```

## Extending DOM Types

```ts
// additional-svelte-typings.d.ts
declare namespace svelteHTML {
	interface IntrinsicElements {
		'my-custom-element': { someattribute: string; 'on:event': (e: CustomEvent<any>) => void };
	}
	interface HTMLAttributes<T> {
		onbeforeinstallprompt?: (event: any) => any;
		mycustomattribute?: any;
	}
}
```

Alternative approach:

```ts
// additional-svelte-typings.d.ts
import { HTMLButtonAttributes } from 'svelte/elements';

declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'custom-button': HTMLButtonAttributes;
	}

	export interface HTMLButtonAttributes {
		veryexperimentalattribute?: string;
	}
}

export {};
```

## docs/kit/10-getting-started/10-introduction.md

# SvelteKit Introduction

## What is SvelteKit?

SvelteKit is a framework for building web applications using Svelte. Similar to Next.js (React) or Nuxt (Vue).

## What is Svelte?

Svelte is a UI component framework that compiles components to optimized JavaScript and CSS.

## SvelteKit vs Svelte

Svelte handles UI components. SvelteKit provides a complete application framework with:

- Routing
- Build optimizations
- Offline support
- Page preloading
- Configurable rendering (SSR, CSR, prerendering)
- Image optimization
- HMR development experience via Vite

## Getting Started

For beginners, check out the [interactive tutorial](/tutorial/kit) or get help in [Discord](/chat).

## docs/kit/10-getting-started/20-creating-a-project.md

# Creating a SvelteKit Project

```bash
npx sv create my-app
cd my-app
npm install
npm run dev
```

This scaffolds a new project with optional TypeScript setup. Server runs on [localhost:5173](http://localhost:5173).

## Core Concepts

- Pages are Svelte components
- Pages are created in `src/routes` directory
- Pages are server-rendered first, then hydrated client-side

## Editor Setup

- Recommended: VS Code with [Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
- [Other editor support](https://sveltesociety.dev/resources#editor-support)

## docs/kit/10-getting-started/25-project-types.md

# Project Types in SvelteKit

SvelteKit offers configurable rendering to build various application types. Rendering settings can be mixed to optimize different parts of your application.

## Default Rendering

- First page: Server-side rendering (SSR)
- Subsequent pages: Client-side rendering (CSR)
- Benefits: Better SEO, perceived performance, and smooth navigation

## Static Site Generation (SSG)

```js
// Use adapter-static
// In svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter()
  }
};

// Prerender specific pages with
// +page.js or +page.server.js
export const prerender = true;
```

## Single-Page App (SPA)

```js
// In src/routes/+layout.js
export const ssr = false;
```

## Multi-Page App

```html
<!-- Disable client-side navigation for a page -->
<script>
  export const csr = false;
</script>

<!-- Or for specific links -->
<a href="/about" data-sveltekit-reload>About</a>
```

## Deployment Options

- **Separate Backend**: Deploy SvelteKit frontend separately using `adapter-node` or serverless adapters
- **Serverless**: Use `adapter-auto` (default), `adapter-vercel`, `adapter-netlify`, or `adapter-cloudflare`
- **Own Server/Container**: Use `adapter-node`
- **Library**: Use `@sveltejs/package` add-on
- **Offline/PWA**: Leverage [service workers](service-workers)
- **Mobile Apps**: Use Tauri or Capacitor with a SvelteKit SPA
- **Desktop Apps**: Use Tauri, Wails, or Electron with a SvelteKit SPA
- **Browser Extensions**: Use `adapter-static` or community adapters
- **Embedded Devices**: Consider `bundleStrategy: 'single'` to reduce concurrent requests

For mobile, desktop, and embedded applications, consider:

```js
// svelte.config.js
export default {
  kit: {
    output: {
      bundleStrategy: 'single' // Reduces concurrent connections
    }
  }
};
```

## docs/kit/10-getting-started/30-project-structure.md

# Project Structure in SvelteKit

A typical SvelteKit project structure:

```bash
my-project/
├ src/
│ ├ lib/
│ │ ├ server/      # Server-only code
│ │ └ [lib files]  # Shared components/utilities
│ ├ params/        # Param matchers
│ ├ routes/        # Application routes
│ ├ app.html       # Page template
│ ├ error.html     # Error page
│ ├ hooks.client.js
│ ├ hooks.server.js
│ └ service-worker.js
├ static/          # Static assets
├ tests/           # Tests
├ package.json
├ svelte.config.js
├ tsconfig.json
└ vite.config.js
```

## Key Files

### src/app.html
Template with placeholders:
- `%sveltekit.head%` - Links, scripts, and `<svelte:head>` content
- `%sveltekit.body%` - Rendered page markup (place inside a container element)
- `%sveltekit.assets%` - Path to assets
- `%sveltekit.nonce%` - CSP nonce
- `%sveltekit.env.[NAME]%` - Environment variables (must start with `PUBLIC_`)

### src/error.html
Fallback error page with placeholders:
- `%sveltekit.status%` - HTTP status
- `%sveltekit.error.message%` - Error message

### src/lib
Library code importable via `$lib` alias. Server-only code goes in `src/lib/server` and is importable via `$lib/server`.

### src/routes
Contains application routes and their components.

### static
Static assets served as-is (favicon, robots.txt, etc.)

### Configuration Files
- **package.json**: Must include `@sveltejs/kit`, `svelte`, and `vite` as `devDependencies`
- **svelte.config.js**: Svelte and SvelteKit configuration
- **vite.config.js**: Vite configuration with `@sveltejs/kit/vite` plugin
- **tsconfig.json**: TypeScript configuration

### Generated Files
The `.svelte-kit` directory contains generated files that can be safely deleted (they'll be regenerated).

## docs/kit/10-getting-started/40-web-standards.md

# Svelte Web Standards

## Fetch APIs

SvelteKit uses standard `fetch` for network requests in hooks, server routes, and browser.

> Special `fetch` version in `load` functions, server hooks, and API routes allows direct endpoint invocation during SSR without HTTP calls, preserving credentials.

### Request

```js
// Access in hooks and server routes
export function GET({ request }) {
  const data = await request.json(); // or request.formData()
}
```

### Response

```js
// Return from server routes
import { json } from '@sveltejs/kit';

export function GET({ request }) {
  return json({ data: 'value' });
}
```

### Headers

```js
/// file: src/routes/what-is-my-user-agent/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ request }) {
  // log all headers
  console.log(...request.headers);

  // create a JSON Response using a header we received
  return json({
    // retrieve a specific header
    userAgent: request.headers.get('user-agent')
  }, {
    // set a header on the response
    headers: { 'x-custom-header': 'potato' }
  });
}
```

## FormData

```js
/// file: src/routes/hello/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
  const body = await event.request.formData();

  // log all fields
  console.log([...body]);

  return json({
    // get a specific field's value
    name: body.get('name') ?? 'world'
  });
}
```

## Stream APIs

Use `ReadableStream`, `WritableStream`, and `TransformStream` for large responses or chunked data.

## URL APIs

Access URL properties via `event.url` in hooks/server routes, `page.url` in pages, and `from`/`to` in navigation events.

### URLSearchParams

```js
const foo = url.searchParams.get('foo');
```

## Web Crypto

```js
const uuid = crypto.randomUUID();
```

## docs/kit/20-core-concepts/10-routing.md

# SvelteKit Routing

## +page

### +page.svelte

Defines a page component rendered on server (SSR) and browser (CSR).

```svelte
<h1>Hello and welcome to my site!</h1>
<a href="/about">About my site</a>
```

Receive data from load functions:

```svelte
<script>
	/** @type {import('./$types').PageProps} */
	let { data } = $props();
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
```

### +page.js

Load data for pages:

```js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	if (params.slug === 'hello-world') {
		return {
			title: 'Hello world!',
			content: 'Welcome to our blog. Lorem ipsum dolor sit amet...'
		};
	}

	error(404, 'Not found');
}
```

Configure page behavior with exports:
- `export const prerender = true|false|'auto'`
- `export const ssr = true|false`
- `export const csr = true|false`

### +page.server.js

Server-only load functions:

```js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const post = await getPostFromDatabase(params.slug);

	if (post) {
		return post;
	}

	error(404, 'Not found');
}
```

Also supports form actions.

## +error

Custom error pages:

```svelte
<script>
	import { page } from '$app/state';
</script>

<h1>{page.status}: {page.error.message}</h1>
```

SvelteKit walks up the tree to find the closest error boundary.

## +layout

### +layout.svelte

Shared UI elements across multiple pages:

```svelte
<script>
	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/settings">Settings</a>
</nav>

{@render children()}
```

Layouts can be nested:

```svelte
<script>
	/** @type {import('./$types').LayoutProps} */
	let { data, children } = $props();
</script>

<h1>Settings</h1>

<div class="submenu">
	{#each data.sections as section}
		<a href="/settings/{section.slug}">{section.title}</a>
	{/each}
</div>

{@render children()}
```

### +layout.js

Load data for layouts:

```js
/** @type {import('./$types').LayoutLoad} */
export function load() {
	return {
		sections: [
			{ slug: 'profile', title: 'Profile' },
			{ slug: 'notifications', title: 'Notifications' }
		]
	};
}
```

### +layout.server.js

Server-only layout data loading.

## +server

API routes with HTTP verb handlers:

```js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const min = Number(url.searchParams.get('min') ?? '0');
	const max = Number(url.searchParams.get('max') ?? '1');

	const d = max - min;

	if (isNaN(d) || d < 0) {
		error(400, 'min and max must be numbers, and min must be less than max');
	}

	const random = min + Math.random() * d;

	return new Response(String(random));
}
```

Handling POST requests:

```js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const { a, b } = await request.json();
	return json(a + b);
}
```

Fallback handler for unhandled methods:

```js
/** @type {import('./$types').RequestHandler} */
export async function fallback({ request }) {
	return text(`I caught your ${request.method} request!`);
}
```

Content negotiation: SvelteKit determines whether to serve a page or API response based on the `accept` header.

## $types

TypeScript definitions for route files:
- `PageProps`/`LayoutProps` - For component props
- `PageLoad`/`PageServerLoad`/`LayoutLoad`/`LayoutServerLoad` - For load functions
- `RequestHandler` - For server endpoints

## docs/kit/20-core-concepts/20-load.md

# Loading Data in SvelteKit

## Page Data

Load data for pages using `+page.js` or `+page.server.js`:

```js
// src/routes/blog/[slug]/+page.js
export function load({ params }) {
  return {
    post: {
      title: `Title for ${params.slug} goes here`,
      content: `Content for ${params.slug} goes here`
    }
  };
}
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  let { data } = $props();
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>
```

## Layout Data

Load data for layouts using `+layout.js` or `+layout.server.js`:

```js
// src/routes/blog/[slug]/+layout.server.js
export async function load() {
  return {
    posts: await db.getPostSummaries()
  };
}
```

```svelte
<!-- src/routes/blog/[slug]/+layout.svelte -->
<script>
  let { data, children } = $props();
</script>

<main>{@render children()}</main>

<aside>
  <h2>More posts</h2>
  <ul>
    {#each data.posts as post}
      <li><a href="/blog/{post.slug}">{post.title}</a></li>
    {/each}
  </ul>
</aside>
```

Child components can access parent layout data:

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  import { page } from '$app/state';
  let { data } = $props();
  
  let index = $derived(data.posts.findIndex(post => post.slug === page.params.slug));
  let next = $derived(data.posts[index + 1]);
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>

{#if next}
  <p>Next post: <a href="/blog/{next.slug}">{next.title}</a></p>
{/if}
```

## Universal vs Server Load Functions

**Server load functions** (`+page.server.js`, `+layout.server.js`):
- Always run on the server
- Can access database, filesystem, private env vars
- Must return serializable data
- Have access to `cookies`, `locals`, etc.

**Universal load functions** (`+page.js`, `+layout.js`):
- Run on server during SSR, then in browser
- Useful for fetching from external APIs
- Can return non-serializable data (like component constructors)
- Receive data from server load functions via the `data` property

## Making Fetch Requests

Use the provided `fetch` function for enhanced features:

```js
// src/routes/items/[id]/+page.js
export async function load({ fetch, params }) {
  const res = await fetch(`/api/items/${params.id}`);
  const item = await res.json();
  return { item };
}
```

## Headers and Cookies

Set response headers:

```js
export async function load({ fetch, setHeaders }) {
  const response = await fetch(url);
  
  setHeaders({
    age: response.headers.get('age'),
    'cache-control': response.headers.get('cache-control')
  });
  
  return response.json();
}
```

Access cookies in server load functions:

```js
export async function load({ cookies }) {
  const sessionid = cookies.get('sessionid');
  return {
    user: await db.getUser(sessionid)
  };
}
```

## Using Parent Data

Access data from parent load functions:

```js
export async function load({ parent }) {
  const { a } = await parent();
  return { b: a + 1 };
}
```

## Errors and Redirects

Throw errors:

```js
import { error } from '@sveltejs/kit';

export function load({ locals }) {
  if (!locals.user) {
    error(401, 'not logged in');
  }
}
```

Redirect users:

```js
import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (!locals.user) {
    redirect(307, '/login');
  }
}
```

## Streaming with Promises

Server load functions can stream promises as they resolve:

```js
export async function load({ params }) {
  return {
    comments: loadComments(params.slug),
    post: await loadPost(params.slug)
  };
}
```

```svelte
<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>

{#await data.comments}
  Loading comments...
{:then comments}
  {#each comments as comment}
    <p>{comment.content}</p>
  {/each}
{:catch error}
  <p>error loading comments: {error.message}</p>
{/await}
```

## Rerunning Load Functions

Load functions rerun when:
- Referenced params or URL properties change
- A parent load function reran and `await parent()` was called
- A dependency was invalidated with `invalidate(url)` or `invalidateAll()`

Manually invalidate load functions:

```js
// In load function
export async function load({ fetch, depends }) {
  depends('app:random');
  // ...
}

// In component
import { invalidate } from '$app/navigation';
function rerunLoadFunction() {
  invalidate('app:random');
}
```

## Dependency Tracking

Exclude from dependency tracking with `untrack`:

```js
export async function load({ untrack, url }) {
  if (untrack(() => url.pathname === '/')) {
    return { message: 'Welcome!' };
  }
}
```

## docs/kit/20-core-concepts/30-form-actions.md

# Svelte Form Actions

## Default Actions

Define a default action in `+page.server.js`:

```js
/// file: src/routes/login/+page.server.js
/** @satisfies {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		// TODO log the user in
	}
};
```

Use it with a simple form:

```svelte
<form method="POST">
	<label>
		Email
		<input name="email" type="email">
	</label>
	<label>
		Password
		<input name="password" type="password">
	</label>
	<button>Log in</button>
</form>
```

From other pages, specify the action path:

```html
<form method="POST" action="/login">
	<!-- form content -->
</form>
```

## Named Actions

Multiple actions in one page:

```js
/// file: src/routes/login/+page.server.js
/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async (event) => {
		// TODO log the user in
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

Invoke with query parameter:

```svelte
<form method="POST" action="?/register">
	<!-- form content -->
</form>
```

Use `formaction` for multiple actions in one form:

```svelte
<form method="POST" action="?/login">
	<!-- inputs -->
	<button>Log in</button>
	<button formaction="?/register">Register</button>
</form>
```

> Note: Can't mix default and named actions

## Action Implementation

```js
import * as db from '$lib/server/db';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		cookies.set('sessionid', await db.createSession(user), { path: '/' });

		return { success: true };
	}
};
```

Access returned data in component:

```svelte
<script>
	/** @type {import('./$types').PageProps} */
	let { data, form } = $props();
</script>

{#if form?.success}
	<p>Successfully logged in! Welcome back, {data.user.name}</p>
{/if}
```

### Validation Errors

Return errors with the `fail` function:

```js
import { fail } from '@sveltejs/kit';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (!email) {
			return fail(400, { email, missing: true });
		}

		const user = await db.getUser(email);
		if (!user || user.password !== db.hash(password)) {
			return fail(400, { email, incorrect: true });
		}

		// Success case
	}
};
```

Handle errors in the component:

```svelte
<form method="POST" action="?/login">
	{#if form?.missing}<p class="error">The email field is required</p>{/if}
	{#if form?.incorrect}<p class="error">Invalid credentials!</p>{/if}
	<label>
		Email
		<input name="email" type="email" value={form?.email ?? ''}>
	</label>
	<!-- other fields -->
</form>
```

### Redirects

```js
import { fail, redirect } from '@sveltejs/kit';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request, url }) => {
		// validation logic...

		if (url.searchParams.has('redirectTo')) {
			redirect(303, url.searchParams.get('redirectTo'));
		}

		return { success: true };
	}
};
```

## Loading Data

After an action runs, the page's `load` functions run. If you modify cookies in an action, update `event.locals` too:

```js
/// file: src/routes/account/+page.server.js
/** @satisfies {import('./$types').Actions} */
export const actions = {
	logout: async (event) => {
		event.cookies.delete('sessionid', { path: '/' });
		event.locals.user = null;
	}
};
```

## Progressive Enhancement

### use:enhance

Basic enhancement:

```svelte
<script>
	import { enhance } from '$app/forms';
	/** @type {import('./$types').PageProps} */
	let { form } = $props();
</script>

<form method="POST" use:enhance>
	<!-- form content -->
</form>
```

Default behavior:
- Updates `form` property and `page.form` (only for same-page actions)
- Resets the form
- Invalidates all data on success
- Handles redirects and errors
- Resets focus

### Customizing use:enhance

```svelte
<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel, submitter }) => {
		// Pre-submission logic

		return async ({ result, update }) => {
			// Post-submission logic
		};
	}}
>
```

Custom handling with `applyAction`:

```svelte
<script>
	import { enhance, applyAction } from '$app/forms';
	import { goto } from '$app/navigation';
</script>

<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel }) => {
		return async ({ result }) => {
			if (result.type === 'redirect') {
				goto(result.location);
			} else {
				await applyAction(result);
			}
		};
	}}
>
```

### Custom Event Listener

```svelte
<script>
	import { invalidateAll, goto } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';

	/** @param {SubmitEvent & { currentTarget: EventTarget & HTMLFormElement}} event */
	async function handleSubmit(event) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);

		const response = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: data
		});

		/** @type {import('@sveltejs/kit').ActionResult} */
		const result = deserialize(await response.text());

		if (result.type === 'success') {
			await invalidateAll();
		}

		applyAction(result);
	}
</script>

<form method="POST" onsubmit={handleSubmit}>
	<!-- form content -->
</form>
```

To target `+page.server.js` actions with fetch:

```js
const response = await fetch(this.action, {
	method: 'POST',
	body: data,
	headers: {
		'x-sveltekit-action': 'true'
	}
});
```

## GET Forms

For forms that don't need to POST data:

```html
<form action="/search">
	<label>
		Search
		<input name="q">
	</label>
</form>
```

These navigate like `<a>` elements and support the same data attributes for controlling router behavior.

## docs/kit/20-core-concepts/40-page-options.md

# Svelte 5 Page Options

## Core Concepts

### Rendering Modes

SvelteKit supports three rendering strategies:

- **Server-Side Rendering (SSR)**: Default, renders on server first
- **Client-Side Rendering (CSR)**: Hydrates server-rendered HTML
- **Prerendering**: Generates static HTML at build time

Options can be set in `+page.js`, `+page.server.js`, `+layout.js`, or `+layout.server.js`. Child pages override parent layouts.

## Page Options

### prerender

Generate static HTML at build time:

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = true; // Enable for this route
export const prerender = false; // Disable for this route
export const prerender = 'auto'; // Prerender but keep in SSR manifest
```

**When to use prerendering**:
- Content must be the same for all users
- No need for `url.searchParams` during prerendering
- Pages with [actions](form-actions) cannot be prerendered

**Route conflicts**: Use file extensions for server routes to avoid conflicts:
```
src/routes/foo.json/+server.js  // Creates foo.json
src/routes/foo/bar.json/+server.js  // Creates foo/bar.json
```

### entries

For dynamic routes that need prerendering:

```js
/// file: src/routes/blog/[slug]/+page.server.js
/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return [
    { slug: 'hello-world' },
    { slug: 'another-blog-post' }
  ];
}

export const prerender = true;
```

### ssr

Disable server-side rendering:

```js
/// file: +page.js
export const ssr = false;
// Creates empty shell page, renders only on client
```

### csr

Disable client-side rendering:

```js
/// file: +page.js
export const csr = false;
// No JavaScript sent to client, links cause full page navigation
```

Enable CSR only during development:

```js
/// file: +page.js
import { dev } from '$app/environment';

export const csr = dev;
```

### trailingSlash

Control URL trailing slashes:

```js
/// file: src/routes/+layout.js
export const trailingSlash = 'always'; // '/about/' format
// Options: 'never' (default), 'always', 'ignore'
```

### config

Platform-specific configuration for adapters:

```js
/// file: src/routes/+page.js
/** @type {import('some-adapter').Config} */
export const config = {
  runtime: 'edge'
};
```

Config objects merge at the top level but not deeper levels.

## Best Practices

- Use prerendering for static content
- Use SSR for dynamic, SEO-important pages
- Use CSR-only (SPA mode) for admin sections
- Avoid ignoring trailing slashes (harmful for SEO)
- Keep browser-only code in component files, not in page option files

## docs/kit/20-core-concepts/50-state-management.md

# Svelte 5 State Management

## Server State Guidelines

### Avoid Shared State on Server

Servers are stateless and shared by multiple users. Never store user data in shared variables:

```js
// NEVER DO THIS!
let user; // Shared by all users

export function load() {
  return { user };
}

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    user = { // BAD: exposes one user's data to others
      name: data.get('name'),
      secret: data.get('secret')
    };
  }
}
```

Instead, authenticate users with cookies and store data in databases.

### No Side-Effects in Load

Load functions should be pure:

```js
// NEVER DO THIS!
import { user } from '$lib/user';

export async function load({ fetch }) {
  const response = await fetch('/api/user');
  user.set(await response.json()); // BAD: shared state
}
```

Instead, return the data:

```js
export async function load({ fetch }) {
  const response = await fetch('/api/user');
  return {
    user: await response.json()
  };
}
```

## Using Context for State

Use Svelte's context API for component tree state:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { setContext } from 'svelte';
  
  let { data } = $props();
  setContext('user', () => data.user);
</script>
```

```svelte
<!-- src/routes/user/+page.svelte -->
<script>
  import { getContext } from 'svelte';
  const user = getContext('user');
</script>

<p>Welcome {user().name}</p>
```

> Pass functions to `setContext` to maintain reactivity across boundaries.

## Component State Preservation

SvelteKit reuses components during navigation. Make values reactive to handle updates:

```svelte
<!-- BUGGY: values won't update on navigation -->
<script>
  let { data } = $props();
  const wordCount = data.content.split(' ').length;
  const estimatedReadingTime = wordCount / 250;
</script>
```

Correct approach:

```svelte
<script>
  let { data } = $props();
  let wordCount = $derived(data.content.split(' ').length);
  let estimatedReadingTime = $derived(wordCount / 250);
</script>
```

To force component remounting on navigation:

```svelte
<script>
  import { page } from '$app/state';
</script>

{#key page.url.pathname}
  <BlogPost title={data.title} content={data.title} />
{/key}
```

## State Storage Options

### URL State
For state that should survive reloads, use URL search parameters (`?sort=price&order=ascending`).
Access via:
- Load functions: `url` parameter
- Components: `page.url.searchParams`

### Ephemeral State
For UI state that should persist during session navigation but can be lost on refresh, use [snapshots](snapshots).

## docs/kit/25-build-and-deploy/10-building-your-app.md

# Building your app

## Build Process

SvelteKit builds in two stages when running `vite build`:
1. Vite creates optimized production builds of server code, browser code, and service worker
2. An adapter tunes the build for your target environment

## During the build

Skip code execution during build phase:

```js
import { building } from '$app/environment';
import { setupMyDatabase } from '$lib/server/database';

if (!building) {
	setupMyDatabase();
}

export function load() {
	// ...
}
```

## Preview

Preview production build locally with `vite preview` (via `npm run preview`). Note that this runs in Node and doesn't perfectly reproduce deployment environment (adapter-specific features like the `platform` object aren't available).

## docs/kit/25-build-and-deploy/20-adapters.md

# Adapters

Adapters convert your SvelteKit app for deployment to specific platforms.

## Official Adapters

- `@sveltejs/adapter-cloudflare` - For Cloudflare Workers and Pages
- `@sveltejs/adapter-netlify` - For Netlify
- `@sveltejs/adapter-node` - For Node servers
- `@sveltejs/adapter-static` - For static site generation (SSG)
- `@sveltejs/adapter-vercel` - For Vercel

[Community adapters](https://sveltesociety.dev/packages?category=sveltekit-adapters) are available for other platforms.

## Configuration

Specify your adapter in `svelte.config.js`:

```js
/// file: svelte.config.js
import adapter from 'svelte-adapter-foo';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // adapter options go here
    })
  }
};

export default config;
```

## Platform-specific Context

Adapters can provide platform-specific information via the `platform` property in the `RequestEvent` object used in hooks and server routes. Refer to each adapter's documentation for details.

## docs/kit/25-build-and-deploy/55-single-page-apps.md

# Single-page apps in SvelteKit

## Basic Setup

Convert any SvelteKit app to a SPA by disabling SSR in the root layout:

```js
/// file: src/routes/+layout.js
export const ssr = false;
```

> **Note**: Not recommended for most cases due to SEO, performance, and accessibility issues.

## Using adapter-static

For apps without server-side logic, use `adapter-static` with a fallback page:

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter({
			fallback: '200.html' // platform-specific
		})
	}
};
```

The fallback page loads your app and navigates to the correct route. The filename varies by hosting platform.

## Apache Configuration

For Apache, add a `static/.htaccess` file:

```
<IfModule mod_rewrite.c>
	RewriteEngine On
	RewriteBase /
	RewriteRule ^200\.html$ - [L]
	RewriteCond %{REQUEST_FILENAME} !-f
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteRule . /200.html [L]
</IfModule>
```

## Selective Prerendering

Enable prerendering for specific pages:

```js
/// file: src/routes/my-prerendered-page/+page.js
export const prerender = true;
export const ssr = true;
```

## docs/kit/30-advanced/10-advanced-routing.md

# Advanced Routing in SvelteKit

## Rest Parameters

Use rest syntax for unknown number of route segments:

```bash
/[org]/[repo]/tree/[branch]/[...file]
```

For `/sveltejs/kit/tree/main/documentation/docs/04-advanced-routing.md`:

```js
{
	org: 'sveltejs',
	repo: 'kit',
	branch: 'main',
	file: 'documentation/docs/04-advanced-routing.md'
}
```

> Note: `src/routes/a/[...rest]/z/+page.svelte` matches `/a/z`, `/a/b/z`, etc. Always validate rest parameters.

### Custom 404 Pages

For custom 404s with nested routes, create a catch-all route:

```js
/// file: src/routes/marx-brothers/[...path]/+page.js
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load(event) {
	error(404, 'Not Found');
}
```

## Optional Parameters

Make parameters optional with double brackets: `[[lang]]/home`

This matches both `/home` and `/en/home`.

> Note: Optional parameters can't follow rest parameters.

## Matching

Ensure parameters are well-formed with matchers:

```js
/// file: src/params/fruit.js
/**
 * @param {string} param
 * @return {param is ('apple' | 'orange')}
 * @satisfies {import('@sveltejs/kit').ParamMatcher}
 */
export function match(param) {
	return param === 'apple' || param === 'orange';
}
```

Use in routes:

```
src/routes/fruits/[page=fruit]
```

## Sorting

Routes are sorted by:
1. Specificity (more specific routes have higher priority)
2. Matchers (routes with matchers have higher priority)
3. Optional/rest parameters (lowest priority)
4. Alphabetically (for ties)

## Encoding

Use hexadecimal escape sequences for special characters:
- `[x+5c]` for `\`
- `[x+2f]` for `/`
- `[x+23]` for `#`
- etc.

Example: For `/smileys/:-)` create `src/routes/smileys/[x+3a]-[x+29]/+page.svelte`

Unicode escapes also work: `src/routes/[u+d83e][u+dd2a]/+page.svelte` equals `src/routes/🤪/+page.svelte`

## Advanced Layouts

### (group)

Group routes without affecting URL paths:

```tree
src/routes/
│ (app)/
│ ├ dashboard/
│ ├ item/
│ └ +layout.svelte
│ (marketing)/
│ ├ about/
│ ├ testimonials/
│ └ +layout.svelte
├ admin/
└ +layout.svelte
```

### Breaking Out of Layouts

Use `@` to break out of layout hierarchy:

- `+page@[id].svelte` - inherits from segment's layout
- `+page@item.svelte` - inherits from parent segment's layout
- `+page@(app).svelte` - inherits from group layout
- `+page@.svelte` - inherits from root layout

Example:

```tree
src/routes/
├ (app)/
│ ├ item/
│ │ ├ [id]/
│ │ │ ├ embed/
│ │ │ │ └ +page@(app).svelte
│ │ │ └ +layout.svelte
│ │ └ +layout.svelte
│ └ +layout.svelte
└ +layout.svelte
```

Layouts can also break out with `+layout@.svelte`.

Consider composition as an alternative to complex layout grouping:

```svelte
<!file: src/routes/nested/route/+layout@.svelte>
<script>
	import ReusableLayout from '$lib/ReusableLayout.svelte';
	let { data, children } = $props();
</script>

<ReusableLayout {data}>
	{@render children()}
</ReusableLayout>
```

## docs/kit/30-advanced/20-hooks.md

# SvelteKit Hooks

Hooks are app-wide functions that SvelteKit calls in response to specific events.

## Files

- `src/hooks.server.js` - server hooks
- `src/hooks.client.js` - client hooks
- `src/hooks.js` - universal hooks (both client and server)

## Server Hooks

### handle

Runs on every request to determine the response.

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/custom')) {
    return new Response('custom response');
  }

  const response = await resolve(event);
  return response;
}
```

`resolve` accepts optional parameters:

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('old', 'new'),
    filterSerializedResponseHeaders: (name) => name.startsWith('x-'),
    preload: ({ type, path }) => type === 'js' || path.includes('/important/')
  });

  return response;
}
```

### locals

Add custom data to the request:

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.user = await getUserInformation(event.cookies.get('sessionid'));
  
  const response = await resolve(event);
  response.headers.set('x-custom-header', 'potato');
  
  return response;
}
```

### handleFetch

Modify or replace fetch requests in server-side `load` or `action` functions:

```js
/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ request, fetch }) {
  if (request.url.startsWith('https://api.yourapp.com/')) {
    request = new Request(
      request.url.replace('https://api.yourapp.com/', 'http://localhost:9999/'),
      request
    );
  }

  return fetch(request);
}
```

## Shared Hooks (Server and Client)

### handleError

Handle unexpected errors during loading or rendering:

```js
/** @type {import('@sveltejs/kit').HandleServerError} */
export async function handleError({ error, event, status, message }) {
  const errorId = crypto.randomUUID();
  
  // Log to service like Sentry
  Sentry.captureException(error, {
    extra: { event, errorId, status }
  });

  return {
    message: 'Whoops!',
    errorId
  };
}
```

### init

Runs once when server is created or app starts in browser:

```js
/** @type {import('@sveltejs/kit').ServerInit} */
export async function init() {
  await db.connect();
}
```

## Universal Hooks

### reroute

Change how URLs translate to routes:

```js
/** @type {import('@sveltejs/kit').Reroute} */
export function reroute({ url }) {
  const translated = {
    '/en/about': '/en/about',
    '/de/ueber-uns': '/de/about',
    '/fr/a-propos': '/fr/about',
  };

  if (url.pathname in translated) {
    return translated[url.pathname];
  }
}
```

Can be async since v2.18:

```js
/** @type {import('@sveltejs/kit').Reroute} */
export async function reroute({ url, fetch }) {
  if (url.pathname === '/api/reroute') return;

  const api = new URL('/api/reroute', url);
  api.searchParams.set('pathname', url.pathname);

  const result = await fetch(api).then(r => r.json());
  return result.pathname;
}
```

### transport

Pass custom types across server/client boundary:

```js
/** @type {import('@sveltejs/kit').Transport} */
export const transport = {
  Vector: {
    encode: (value) => value instanceof Vector && [value.x, value.y],
    decode: ([x, y]) => new Vector(x, y)
  }
};
```

## docs/kit/30-advanced/25-errors.md

# Svelte Errors

## Error Objects

SvelteKit handles two types of errors:
- Expected errors (created with `error` helper)
- Unexpected errors (other exceptions)

Both are represented as `{ message: string }` objects by default, but can be extended.

## Expected Errors

```js
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const post = await db.getPost(params.slug);

  if (!post) {
    error(404, {
      message: 'Not found'
    });
  }

  return { post };
}
```

Access errors in components:

```svelte
<script>
  import { page } from '$app/state';
</script>

<h1>{page.error.message}</h1>
```

Shorthand for simple errors:

```js
error(404, 'Not found'); // Same as error(404, { message: 'Not found' })
```

Add custom properties:

```js
error(404, {
  message: 'Not found',
  code: 'NOT_FOUND'
});
```

## Unexpected Errors

Unexpected errors are any other exceptions. For security, their details aren't exposed to users.

Default error shape: `{ "message": "Internal Error" }`

Use `handleError` hook for custom error handling (reporting, custom responses).

## Error Responses

Error handling depends on context:
- In `handle` or `+server.js`: Returns fallback error page or JSON
- In `load` functions: Renders nearest `+error.svelte` component

Custom fallback error page (`src/error.html`):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>%sveltekit.error.message%</title>
  </head>
  <body>
    <h1>My custom error page</h1>
    <p>Status: %sveltekit.status%</p>
    <p>Message: %sveltekit.error.message%</p>
  </body>
</html>
```

## Type Safety

Customize error shape with TypeScript:

```ts
declare global {
  namespace App {
    interface Error {
      code: string;
      id: string;
    }
  }
}

export {};
```

## docs/kit/30-advanced/30-link-options.md

# Link Options in SvelteKit

SvelteKit uses standard `<a>` elements for navigation between routes. When clicking a link within your app, SvelteKit imports the code and calls necessary `load` functions to fetch data.

## data-sveltekit-preload-data

Controls when data preloading begins:

- `"hover"` - starts on mouse hover or mobile `touchstart`
- `"tap"` - starts on `touchstart` or `mousedown`

Default setup in `app.html`:

```html
<body data-sveltekit-preload-data="hover">
	<div style="display: contents">%sveltekit.body%</div>
</body>
```

For time-sensitive data:

```html
<a data-sveltekit-preload-data="tap" href="/stonks">
	Get current stonk values
</a>
```

Preloading is skipped if `navigator.connection.saveData` is `true`.

## data-sveltekit-preload-code

Controls when code preloading begins:

- `"eager"` - preloads immediately
- `"viewport"` - preloads when link enters viewport
- `"hover"` - preloads on hover
- `"tap"` - preloads on tap/click

`viewport` and `eager` only apply to links present in DOM immediately after navigation.

## data-sveltekit-reload

Forces full-page navigation:

```html
<a data-sveltekit-reload href="/path">Path</a>
```

Links with `rel="external"` behave the same and are ignored during prerendering.

## data-sveltekit-replacestate

Replaces current history entry instead of creating a new one:

```html
<a data-sveltekit-replacestate href="/path">Path</a>
```

## data-sveltekit-keepfocus

Maintains focus on the current element after navigation:

```html
<form data-sveltekit-keepfocus>
	<input type="text" name="query">
</form>
```

Avoid using on links for accessibility reasons. Only use on elements that exist after navigation.

## data-sveltekit-noscroll

Prevents scrolling to top after navigation:

```html
<a href="path" data-sveltekit-noscroll>Path</a>
```

## Disabling Options

Use `"false"` to disable options within a parent element:

```html
<div data-sveltekit-preload-data>
	<a href="/a">a</a>
	
	<div data-sveltekit-preload-data="false">
		<a href="/d">d</a>
	</div>
</div>
```

Conditional application:

```svelte
<div data-sveltekit-preload-data={condition ? 'hover' : false}>
```

## docs/kit/30-advanced/40-service-workers.md

# Service Workers in SvelteKit

Service workers act as proxy servers for network requests, enabling offline support and faster navigation through precaching.

## Basic Setup

SvelteKit automatically registers `src/service-worker.js` (or `src/service-worker/index.js`).

```js
// Manual registration (if you disable automatic registration)
if ('serviceWorker' in navigator) {
	addEventListener('load', function () {
		navigator.serviceWorker.register('./path/to/service-worker.js');
	});
}
```

## Inside the Service Worker

Access the `$service-worker` module for paths to assets, build files, and prerendered pages.

```js
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files  // everything in `static`
];

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// if there's no cache, then just error out
			throw err;
		}
	}

	event.respondWith(respond());
});
```

> Be careful with caching - stale data may be worse than unavailable data, and browsers will empty caches if they get too full.

## Development Mode

Service workers are bundled for production but not during development. Only browsers supporting modules in service workers will work in dev mode.

```js
import { dev } from '$app/environment';

navigator.serviceWorker.register('/service-worker.js', {
	type: dev ? 'module' : 'classic'
});
```

> `build` and `prerendered` are empty arrays during development

## Type Safety

```js
/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
```

## Alternatives

- [Vite PWA plugin](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html) for Workbox integration
- [MDN Service Worker docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

## docs/kit/30-advanced/50-server-only-modules.md

# Server-only modules

## Private environment variables

[`$env/static/private`]($env-static-private) and [`$env/dynamic/private`]($env-dynamic-private) can only be imported into server-side modules like `hooks.server.js` or `+page.server.js`.

## Server-only utilities

[`$app/server`]($app-server) module with its [`read`]($app-server#read) function can only be imported by server code.

## Your modules

Make your modules server-only by:
- Adding `.server` to filename: `secrets.server.js`
- Placing in `$lib/server`: `$lib/server/secrets.js`

## How it works

SvelteKit prevents importing server-only code in public-facing components:

```js
/// file: $lib/server/secrets.js
export const atlantisCoordinates = [/* redacted */];
```

```js
/// file: src/routes/utils.js
export { atlantisCoordinates } from '$lib/server/secrets.js';

export const add = (a, b) => a + b;
```

```html
/// file: src/routes/+page.svelte
<script>
	import { add } from './utils.js';
</script>
```

This produces an error:
```
Cannot import $lib/server/secrets.js into public-facing code:
src/routes/+page.svelte
	src/routes/utils.js
		$lib/server/secrets.js
```

Works with dynamic imports too, though with multiple dynamic imports, illegal imports might not be detected on first load during development.

> [!NOTE] Import detection is disabled during tests when `process.env.TEST === 'true'`.

## docs/kit/30-advanced/65-snapshots.md

# Snapshots

Preserve ephemeral DOM state (form inputs, scroll positions) between navigations.

```svelte
<script>
	let comment = $state('');

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => comment,
		restore: (value) => comment = value
	};
</script>

<form method="POST">
	<label for="comment">Comment</label>
	<textarea id="comment" bind:value={comment} />
	<button>Post comment</button>
</form>
```

- `capture`: Called before navigation, returns value to store
- `restore`: Called when navigating back, receives stored value
- Data must be JSON-serializable
- Stored in memory and `sessionStorage` for persistence across reloads
- Avoid large objects to prevent memory issues

## docs/kit/30-advanced/67-shallow-routing.md

# Shallow Routing in SvelteKit

## Basic Usage

Create history entries without navigation using `pushState` and `replaceState`.

```svelte
<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import Modal from './Modal.svelte';

	function showModal() {
		pushState('', {
			showModal: true
		});
	}
</script>

{#if page.state.showModal}
	<Modal close={() => history.back()} />
{/if}
```

## API

- `pushState(url, state)` - Creates new history entry
- `replaceState(url, state)` - Updates current history entry
- Access state via `page.state` from `$app/state`
- Make state type-safe with `App.PageState` interface in `src/app.d.ts`

## Loading Data for Shallow Routes

Use `preloadData` to fetch data for components without navigation:

```svelte
<script>
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';
	import Modal from './Modal.svelte';
	import PhotoPage from './[id]/+page.svelte';

	let { data } = $props();
</script>

{#each data.thumbnails as thumbnail}
	<a
		href="/photos/{thumbnail.id}"
		onclick={async (e) => {
			if (innerWidth < 640 || e.shiftKey || e.metaKey || e.ctrlKey) return;

			e.preventDefault();
			const { href } = e.currentTarget;
			const result = await preloadData(href);

			if (result.type === 'loaded' && result.status === 200) {
				pushState(href, { selected: result.data });
			} else {
				goto(href);
			}
		}}
	>
		<img alt={thumbnail.alt} src={thumbnail.src} />
	</a>
{/each}

{#if page.state.selected}
	<Modal onclose={() => history.back()}>
		<PhotoPage data={page.state.selected} />
	</Modal>
{/if}
```

## Caveats

- During SSR, `page.state` is always an empty object
- State is lost on page reload
- Requires JavaScript to work

## docs/kit/40-best-practices/03-auth.md

# Auth

## Sessions vs tokens

- **Authentication**: Verify user identity via credentials
- **Authorization**: Determine allowed actions

Two main approaches:
- **Session IDs**: Stored in database, revokable, requires DB query per request
- **JWT**: No DB check, can't be immediately revoked, better latency, less DB load

## Integration points

Check auth cookies in server hooks and store user info in `locals`:

```js
// hooks.server.js
export async function handle({ event, resolve }) {
  const session = event.cookies.get('session');
  
  if (session) {
    const user = await getUser(session);
    if (user) {
      event.locals.user = user;
    }
  }
  
  return resolve(event);
}
```

## Guides

- [Lucia](https://lucia-auth.com/) provides SvelteKit-specific auth implementation
- Add to project: `npx sv create` (new) or `npx sv add lucia` (existing)
- SvelteKit-specific guides preferred over generic JS auth libraries

## docs/kit/40-best-practices/06-icons.md

# Icons

## CSS

Use Iconify for CSS-based icons:
- Access [many icon sets](https://icon-sets.iconify.design/)
- Include via [CSS](https://iconify.design/docs/usage/css/)
- Use with [Tailwind CSS plugin](https://iconify.design/docs/usage/css/tailwind/) or [UnoCSS plugin](https://iconify.design/docs/usage/css/unocss/)

Advantage: No need to import each icon into `.svelte` files.

## Svelte

Many [icon libraries](https://www.sveltesociety.dev/packages?category=icons) are available.

⚠️ **Best Practice**: Avoid libraries with one `.svelte` file per icon - they slow down [Vite's dependency optimization](https://vite.dev/guide/dep-pre-bundling.html), especially when imported via both umbrella and subpath imports.

## docs/kit/40-best-practices/07-images.md

# Svelte 5 Images Guide

## Image Optimization Approaches

### Vite's Built-in Handling

Vite automatically processes imported assets, adding hashes for caching and inlining small assets.

```svelte
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

### @sveltejs/enhanced-img

A plugin that creates optimized formats (avif/webp), multiple sizes, and prevents layout shift.

#### Setup

```bash
npm install --save-dev @sveltejs/enhanced-img
```

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit()
	]
});
```

#### Basic Usage

```svelte
<enhanced:img src="./path/to/your/image.jpg" alt="An alt text" />
```

#### Dynamic Image Selection

```svelte
<script>
	import MyImage from './path/to/your/image.jpg?enhanced';
</script>

<enhanced:img src={MyImage} alt="some alt text" />
```

With glob imports:

```svelte
<script>
	const imageModules = import.meta.glob(
		'/path/to/assets/*.{avif,gif,heif,jpeg,jpg,png,tiff,webp,svg}',
		{
			eager: true,
			query: {
				enhanced: true
			}
		}
	)
</script>

{#each Object.entries(imageModules) as [_path, module]}
	<enhanced:img src={module.default} alt="some alt text" />
{/each}
```

#### Responsive Images

For responsive images, specify `sizes`:

```svelte
<enhanced:img src="./image.png" sizes="min(1280px, 100vw)"/>
```

Custom widths:

```svelte
<enhanced:img
  src="./image.png?w=1280;640;400"
  sizes="(min-width:1920px) 1280px, (min-width:1080px) 640px, (min-width:768px) 400px"
/>
```

#### Image Transforms

Apply transforms via query parameters:

```svelte
<enhanced:img src="./path/to/your/image.jpg?blur=15" alt="An alt text" />
```

### CDN-based Dynamic Images

For images not available at build time (CMS, user content), use a CDN:
- [`@unpic/svelte`](https://unpic.pics/img/svelte/) - CDN-agnostic library
- CDN-specific libraries (Cloudinary, etc.)
- CMS with built-in image handling (Contentful, Storyblok, Contentstack)

## Best Practices

- Use appropriate solution for each image type
- Consider serving all images via CDN
- Provide 2x resolution images for HiDPI displays
- Use `sizes` for large images to serve smaller versions on mobile
- Set `fetchpriority="high"` for important images
- Constrain images with containers to prevent layout shift
- Always provide good `alt` text
- Avoid using `em`/`rem` in `sizes` when changing default font size

## docs/kit/40-best-practices/20-seo.md

# Svelte SEO Guide

## Built-in SEO Benefits

### Server-Side Rendering
- SvelteKit uses SSR by default, improving search engine indexing
- Keep SSR enabled unless you have a specific reason not to

### Performance
- Good Core Web Vitals improve search rankings
- Test with [PageSpeed Insights](https://pagespeed.web.dev/) or [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### URL Normalization
- SvelteKit redirects URLs with/without trailing slashes based on your `trailingSlash` configuration

## Essential SEO Setup

### Metadata
```svelte
<svelte:head>
  <title>Your Page Title</title>
  <meta name="description" content="Your page description">
</svelte:head>
```

Common pattern: Return SEO data from page `load` functions, use in root layout.

### Sitemaps
Create a dynamic sitemap with a server endpoint:

```js
/// file: src/routes/sitemap.xml/+server.js
export async function GET() {
	return new Response(
		`
		<?xml version="1.0" encoding="UTF-8" ?>
		<urlset
			xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
			xmlns:xhtml="https://www.w3.org/1999/xhtml"
			xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
			xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
			xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
			xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
		>
			
		</urlset>`.trim(),
		{
			headers: {
				'Content-Type': 'application/xml'
			}
		}
	);
}
```

### AMP Support

1. Configure `svelte.config.js`:
```js
/// file: svelte.config.js
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		inlineStyleThreshold: Infinity
	}
};

export default config;
```

2. Disable CSR:
```js
/// file: src/routes/+layout.server.js
export const csr = false;
```

3. Add `amp` to `app.html`:
```html
<html amp>
...
```

4. Transform HTML with hooks:
```js
/// file: src/hooks.server.js
import * as amp from '@sveltejs/amp';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let buffer = '';
	return await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html;
			if (done) return amp.transform(buffer);
		}
	});
}
```

5. Optimize CSS (optional):
```js
/// file: src/hooks.server.js
import * as amp from '@sveltejs/amp';
import dropcss from 'dropcss';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	let buffer = '';

	return await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html;

			if (done) {
				let css = '';
				const markup = amp
					.transform(buffer)
					.replace('⚡', 'amp')
					.replace(/<style amp-custom([^>]*?)>([^]+?)<\/style>/, (match, attributes, contents) => {
						css = contents;
						return `<style amp-custom${attributes}></style>`;
					});

				css = dropcss({ css, html: markup }).css;
				return markup.replace('</style>', `${css}</style>`);
			}
		}
	});
}
```

Instructions for LLMs: <SYSTEM>Always use Svelte 5 runes and Svelte 5 syntax. Runes do not need to be imported, they are globals. $state() runes are always declared using `let`, never with `const`. When passing a function to $derived, you must always use $derived.by(() => ...). Error boundaries can only catch errors during component rendering and at the top level of an $effect inside the error boundary. Error boundaries do not catch errors in onclick or other event handlers.</SYSTEM>