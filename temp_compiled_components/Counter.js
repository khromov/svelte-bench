import 'svelte/internal/disclose-version';

$.mark_module_start();
Counter[$.FILENAME] = 'Counter';

import * as $ from 'svelte/internal/client';

function increment(_, count) {
	$.update(count);
}

function decrement(__1, count) {
	$.update(count, -1);
}

var root = $.add_locations($.template(`<div class="counter svelte-19r58r4"><button>-</button> <span class="count"> </span> <button>+</button></div>`), Counter[$.FILENAME], [
	[
		13,
		2,
		[[14, 4], [15, 4], [16, 4]]
	]
]);

export default function Counter($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Counter);

	let count = $.state(0);
	var div = root();
	var button = $.child(div);

	button.__click = [decrement, count];

	var span = $.sibling(button, 2);
	var text = $.child(span, true);

	$.reset(span);

	var button_1 = $.sibling(span, 2);

	button_1.__click = [increment, count];
	$.reset(div);
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.append($$anchor, div);
	return $.pop({ ...$.legacy_api() });
}

$.mark_module_end(Counter);
$.delegate(['click']);