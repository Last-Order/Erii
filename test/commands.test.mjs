import assert from "node:assert/strict";
import { test } from "node:test";
import { createErii, captureConsole } from "./helpers.mjs";

test("constructor snapshots argv and preserves parsed scalar and repeated values", () => {
    const argv = process.argv;
    const args = ["run", "7", "--text", "hello", "--count", "0", "--flag", "--tag", "a", "--tag", "b"];
    const app = createErii(args);
    assert.equal(process.argv, argv);
    assert.deepEqual(app.rawArguments, args);
    assert.deepEqual(app.parsedArguments, { _: ["run", 7], text: "hello", count: 0, flag: true, tag: ["a", "b"] });
    args.push("later");
    assert.equal(app.rawArguments.includes("later"), false);
});

test("parser disables boolean negation and removes generated camel-case aliases", () => {
    const app = createErii(["--no-color", "--dry-run"]);
    assert.deepEqual(app.parsedArguments, { _: [], "no-color": true, "dry-run": true });
});

test("combined short flags do not invoke implicit command names", () => {
    const app = createErii(["-abc"]);
    const calls = [];
    for (const name of ["a", "b", "c"]) app.bind({ name }, () => calls.push(name));
    app.start();
    assert.deepEqual(calls, []);
});

for (const args of [
    ["--run", "value"],
    ["-r", "value"],
    ["--execute", "value"],
]) {
    test(`dispatches command spelling ${args[0]} with its argument`, () => {
        const app = createErii(args);
        const values = [];
        app.bind({ name: ["run", "r", "execute"] }, (ctx, options) => values.push([ctx.getArgument(), { ...options }]));
        app.start();
        assert.deepEqual(values, [["value", {}]]);
    });
}

test("positional aliases and numeric command names dispatch, unknown input is ignored", () => {
    const app = createErii(["execute", "42", "unknown", "--other"]);
    const calls = [];
    app.bind({ name: ["run", "execute"] }, () => calls.push("run"));
    app.bind({ name: "42" }, () => calls.push("42"));
    app.start();
    assert.deepEqual(calls, ["run", "42"]);
});

test("always precedes option commands and positional commands", () => {
    const app = createErii(["position", "--flag"]);
    const calls = [];
    app.always(() => calls.push("always"));
    app.default(() => calls.push("default"));
    app.bind({ name: "flag" }, () => calls.push("flag"));
    app.bind({ name: "position" }, () => calls.push("position"));
    app.start();
    assert.deepEqual(calls, ["always", "flag", "position"]);
});

for (const args of [["unknown"], ["--unknown"]]) {
    test(`default does not run for unrecognized input ${args[0]}`, () => {
        const app = createErii(args);
        const calls = [];
        app.always(() => calls.push("always"));
        app.default(() => calls.push("default"));
        app.start();
        assert.deepEqual(calls, ["always"]);
    });
}

test("instances have independent commands, options and lifecycle handlers", () => {
    const first = createErii();
    const second = createErii();
    first.bind({ name: "run" }, () => {});
    first.addOption({ name: "verbose" });
    first.always(() => {});
    first.default(() => {});
    assert.deepEqual(second.commands, {});
    assert.deepEqual(second.commonOptions, []);
    assert.equal(second.alwaysHandler, undefined);
    assert.equal(second.defaultHandler, undefined);
    assert.doesNotThrow(() => second.start());
});

test("rebinding commands and lifecycle callbacks replaces the previous handler", () => {
    const app = createErii(["--run"]);
    const calls = [];
    for (const label of ["old", "new"]) {
        app.bind({ name: "run" }, () => calls.push(label));
        app.always(() => calls.push(`always-${label}`));
        app.default(() => calls.push(`default-${label}`));
    }
    app.start();
    app.parsedArguments = { _: [] };
    app.start();
    assert.deepEqual(calls, ["always-new", "new", "always-new", "default-new"]);
});

test("invalid JavaScript command bindings log errors without registering commands", (t) => {
    const errors = captureConsole(t, "error");
    const app = createErii();
    for (const config of [{}, { name: "" }, { name: [] }]) app.bind(config, () => assert.fail("invalid command ran"));
    assert.deepEqual(app.commands, {});
    assert.deepEqual(errors, Array(3).fill("Invalid command binding, ignored."));
});

test("argument lookup prefers primary name, follows redirects optionally, and reports missing values", (t) => {
    const errors = captureConsole(t, "error");
    const app = createErii(["--run", "primary", "-r", "alias"]);
    app.bind({ name: ["run", "r"] }, () => {});
    assert.equal(app.getArgument("run"), "primary");
    assert.equal(app.getArgument("r"), "primary");
    assert.equal(app.getArgument("r", false), "alias");
    app.parsedArguments = { _: [] };
    assert.equal(app.getArgument("run"), undefined);
    assert.equal(app.getArgument("unknown"), undefined);
    app.bind({ name: "_" }, () => {});
    assert.equal(app.getArgument("_"), undefined);
    assert.deepEqual(errors, ["Command run not found.", "Command unknown not found.", "Command _ not found."]);
});

test("context delegates help/version and supports lookup of another command", (t) => {
    const app = createErii(["--run", "one", "--other", "two"]);
    const help = t.mock.method(app, "showHelp", () => {});
    const version = t.mock.method(app, "showVersion", () => {});
    app.bind({ name: "other" }, () => {});
    let calls = 0;
    app.bind({ name: "run" }, (ctx) => {
        calls++;
        assert.equal(ctx.getArgument(), "one");
        assert.equal(ctx.getArgument("other"), "two");
        ctx.showHelp();
        ctx.showVersion();
    });
    app.okite();
    assert.equal(calls, 1);
    assert.equal(help.mock.callCount(), 1);
    assert.equal(version.mock.callCount(), 1);
});

test("synchronous handler exceptions propagate to the caller", () => {
    const app = createErii(["--run"]);
    const failure = new Error("handler failed");
    app.bind({ name: "run" }, () => {
        throw failure;
    });
    assert.throws(
        () => app.start(),
        (error) => error === failure,
    );
});

test("async handlers can perform work after dispatch", async () => {
    const app = createErii(["--run"]);
    let finish;
    const completed = new Promise((resolve) => {
        finish = resolve;
    });
    app.bind({ name: "run" }, async () => {
        await Promise.resolve();
        finish("done");
    });
    app.start();
    assert.equal(await completed, "done");
});
