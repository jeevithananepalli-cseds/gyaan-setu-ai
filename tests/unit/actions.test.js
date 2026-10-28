import { afterEach, describe, expect, it, vi } from "vitest";
import { initActionDelegation, parseCalls, registerActions, runActions } from "../../src/core/actions.js";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("parseCalls", () => {
  it("parses a call with no arguments", () => {
    expect(parseCalls("showHome()")).toEqual([{ name: "showHome", args: [] }]);
  });

  it("parses numbers, booleans and null", () => {
    expect(parseCalls("openLesson(2, 13, true, null, -1.5)")).toEqual([
      { name: "openLesson", args: [2, 13, true, null, -1.5] }
    ]);
  });

  it("keeps commas, semicolons and brackets inside quoted strings", () => {
    expect(parseCalls("askSuggestion('Why, exactly; is (water) important?')")).toEqual([
      { name: "askSuggestion", args: ["Why, exactly; is (water) important?"] }
    ]);
  });

  it("unescapes quotes inside strings", () => {
    expect(parseCalls("askSuggestion('What\\'s a plant?')")[0].args).toEqual(["What's a plant?"]);
  });

  it("passes the element for `this` and the event for `event`", () => {
    const element = document.createElement("button");
    const event = new Event("click");

    expect(parseCalls("answerQuiz(this, 0, 1, event)", element, event)[0].args)
      .toEqual([element, 0, 1, event]);
  });

  it("splits several calls and tolerates line breaks", () => {
    expect(parseCalls("showHome();\n  openLesson(\n    1,\n    2\n  )\n")).toEqual([
      { name: "showHome", args: [] },
      { name: "openLesson", args: [1, 2] }
    ]);
  });

  it("rejects anything that is not a plain call", () => {
    expect(() => parseCalls("alert(document.cookie)")).toThrow();
    expect(() => parseCalls("window.location = 'x'")).toThrow();
  });
});

describe("runActions", () => {
  it("calls the registered action with its arguments", () => {
    const openLesson = vi.fn();
    registerActions({ openLesson });

    runActions("openLesson(1, 2)");

    expect(openLesson).toHaveBeenCalledWith(1, 2);
  });

  it("logs and carries on when the action is unknown", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const known = vi.fn();
    registerActions({ known });

    runActions("missingAction(); known()");

    expect(error).toHaveBeenCalled();
    expect(known).toHaveBeenCalled();
  });
});

describe("initActionDelegation", () => {
  // jsdom keeps one document for the file, so install the listeners once.
  initActionDelegation(document);

  it("runs data-action when a child of the element is clicked", () => {
    const pick = vi.fn();
    registerActions({ pick });
    document.body.innerHTML = `<button data-action="pick('a', 3)"><span id="inner">Go</span></button>`;

    document.getElementById("inner").click();

    expect(pick).toHaveBeenCalledWith("a", 3);
  });

  it("runs nested actions innermost first", () => {
    const order = [];
    registerActions({ inner: () => order.push("inner"), outer: () => order.push("outer") });
    document.body.innerHTML =
      `<div data-action="outer()"><button id="b" data-action="inner()">Go</button></div>`;

    document.getElementById("b").click();

    expect(order).toEqual(["inner", "outer"]);
  });

  it("runs data-submit with the submit event", () => {
    const save = vi.fn(event => event.preventDefault());
    registerActions({ save });
    document.body.innerHTML = `<form id="f" data-submit="save(event)"></form>`;

    document.getElementById("f").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].type).toBe("submit");
  });

  it("swaps in the fallback image once when an image fails", () => {
    document.body.innerHTML = `<img id="i" src="./missing.png" data-fallback-src="./placeholder.svg">`;
    const image = document.getElementById("i");

    image.dispatchEvent(new Event("error"));

    expect(image.getAttribute("src")).toBe("./placeholder.svg");
    expect(image.dataset.fallbackSrc).toBeUndefined();
  });
});
