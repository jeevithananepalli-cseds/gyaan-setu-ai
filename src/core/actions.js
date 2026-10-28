// Runs the handlers named in markup.
//
// Views render HTML strings, and module functions are not globals, so markup
// cannot use onclick="fn()". Instead it carries the same call text in a data
// attribute and one delegated listener runs it:
//
//   <button data-action="openLesson(2, 3)">       click
//   <form data-submit="handleLogin(event)">       submit
//   <img data-fallback-src="./placeholder.svg">   swapped in if the image fails
//
// A call may pass numbers, quoted strings, true/false/null, `this` (the
// element) and `event`. Several calls can be separated with ";".
// This module has no imports so any module can register with it safely.

const actions = Object.create(null);

export function registerActions(map) {
  Object.assign(actions, map);
}

// Splits on `separator`, ignoring separators inside quotes.
function splitOutsideQuotes(text, separator) {
  const parts = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      current += char;
      if (char === "\\" && i + 1 < text.length) current += text[++i];
      else if (char === quote) quote = null;
    }
    else if (char === "'" || char === '"') {
      quote = char;
      current += char;
    }
    else if (char === separator) {
      parts.push(current);
      current = "";
    }
    else {
      current += char;
    }
  }

  parts.push(current);
  return parts;
}

function parseArgument(text, element, event) {
  const value = text.trim();

  if (value === "this") return element;
  if (value === "event") return event;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "undefined") return undefined;

  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  const quote = value[0];
  if ((quote === "'" || quote === '"') && value.endsWith(quote) && value.length >= 2) {
    return value.slice(1, -1).replace(/\\(.)/g, "$1");
  }

  throw new Error(`Unsupported argument "${value}"`);
}

export function parseCalls(expression, element, event) {
  return splitOutsideQuotes(expression, ";")
    .map(call => call.trim())
    .filter(Boolean)
    .map(call => {
      const match = call.match(/^([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);
      if (!match) throw new Error(`Unsupported action "${call}"`);

      const argumentText = match[2].trim();
      const args = argumentText
        ? splitOutsideQuotes(argumentText, ",").map(arg => parseArgument(arg, element, event))
        : [];

      return { name: match[1], args };
    });
}

export function runActions(expression, element, event) {
  let calls;

  try {
    calls = parseCalls(expression, element, event);
  }
  catch (error) {
    console.error(error.message, element);
    return;
  }

  for (const { name, args } of calls) {
    const action = actions[name];

    if (!action) {
      console.error(`Unknown action "${name}"`, element);
      continue;
    }

    action(...args);
  }
}

// Runs the attribute on the target and on each ancestor, innermost first,
// the way bubbling inline handlers did.
function dispatch(event, attribute) {
  let element = event.target instanceof Element ? event.target.closest(`[${attribute}]`) : null;

  while (element) {
    runActions(element.getAttribute(attribute), element, event);
    element = element.parentElement?.closest(`[${attribute}]`) || null;
  }
}

export function initActionDelegation(root = document) {
  root.addEventListener("click", event => dispatch(event, "data-action"));
  root.addEventListener("submit", event => dispatch(event, "data-submit"));

  // Image errors do not bubble, so listen in the capture phase.
  root.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    const fallback = image.dataset.fallbackSrc;
    if (!fallback) return;

    delete image.dataset.fallbackSrc;
    image.src = fallback;
  }, true);
}
