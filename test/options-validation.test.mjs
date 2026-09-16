import assert from "node:assert/strict";
import { test } from "node:test";
import { createErii, captureConsole } from "./helpers.mjs";

test("common options reach all commands, scoped options only reach their command", () => {
    const app = createErii(["first", "second", "--verbose", "--local", "value", "--unregistered"]);
    const calls = [];
    for (const name of ["first", "second"]) app.bind({ name }, (_, options) => calls.push({ name, ...options }));
    app.addOption({ name: "verbose" });
    app.addOption({ name: "local", command: "first" });
    app.start();
    assert.deepEqual(calls, [
        { name: "first", verbose: true, local: "value" },
        { name: "second", verbose: true },
    ]);
});

test("option aliases expose the primary name and absent options are omitted", () => {
    const app = createErii(["run", "-v", "3"]);
    let received;
    app.bind({ name: "run" }, (_, options) => {
        received = { ...options };
    });
    app.addOption({ name: ["verbose", "v"] });
    app.addOption({ name: "missing" });
    app.addOption({ name: [] });
    app.start();
    assert.deepEqual(received, { verbose: 3 });
});

test("option bindings to unknown commands log and are ignored", (t) => {
    const errors = captureConsole(t, "error");
    const app = createErii();
    app.addOption({ name: ["verbose", "v"], command: "missing" });
    assert.deepEqual(app.commonOptions, []);
    assert.deepEqual(app.commands, {});
    assert.deepEqual(errors, ["Command for option [verbose, v] not found, ignored."]);
});

test("invalid option values are omitted while valid options and the command still run", (t) => {
    const errors = captureConsole(t, "error");
    const app = createErii(["run", "--count", "bad", "--valid", "8"]);
    let received;
    app.bind({ name: "run" }, (_, options) => {
        received = { ...options };
    });
    for (const name of ["count", "valid"]) {
        app.addOption({ name, argument: { name: "integer", description: "Number", validate: "isInt" } });
    }
    app.start();
    assert.deepEqual(received, { valid: 8 });
    assert.deepEqual(errors, ["Argument validation failed for option 'count'.", "<integer> should be a/an Int."]);
});

test("custom option validator receives raw input and can log a rejection", (t) => {
    const logs = captureConsole(t, "log");
    const errors = captureConsole(t, "error");
    const app = createErii(["run", "--count", "0"]);
    let received;
    app.bind({ name: "run" }, (_, options) => {
        received = { ...options };
    });
    app.addOption({
        name: "count",
        argument: {
            name: "count",
            description: "Count",
            validate(value, log) {
                assert.equal(value, 0);
                log("Count must be positive");
                return false;
            },
        },
    });
    app.start();
    assert.deepEqual(received, {});
    assert.deepEqual(logs, ["Count must be positive"]);
    assert.deepEqual(errors, ["Argument validation failed for option 'count'."]);
});

for (const validate of ["isInt", () => false]) {
    test(`invalid command input prevents dispatch with ${typeof validate} validation`, (t) => {
        const errors = captureConsole(t, "error");
        const app = createErii(["--run", "bad"]);
        app.bind({ name: "run", argument: { name: "id", description: "ID", validate } }, () => assert.fail("invalid command ran"));
        app.start();
        assert.deepEqual(
            errors,
            typeof validate === "string"
                ? ["Argument validation failed for command run", "<id> should be a/an Int."]
                : ["Argument validation failed for command run"],
        );
    });
}

test("validators accept absent rules and preserve all raw values for custom validation", () => {
    const app = createErii();
    const values = [undefined, "", "text", 0, 42, false, true, ["a", 1], { nested: "value" }];
    for (const value of values) {
        assert.equal(app.validateArgument(value), true);
        assert.equal(app.validateArgument(value, { name: "value", description: "" }), true);
        let seen = false;
        assert.equal(
            app.validateArgument(value, {
                name: "value",
                description: "",
                validate(received) {
                    seen = true;
                    assert.equal(received, value);
                    return true;
                },
            }),
            true,
        );
        assert.equal(seen, true);
    }
});

test("built-in validators convert raw values to strings and reject absent arguments", () => {
    const app = createErii();
    for (const [value, validate, expected] of [
        [42, "isInt", true],
        ["42", "isInt", true],
        ["bad", "isInt", false],
        [false, "isBoolean", true],
        [undefined, "isInt", false],
        ["", "isInt", false],
        ["test@example.com", "isEmail", true],
    ]) {
        assert.equal(app.validateArgument(value, { name: "value", description: "", validate }), expected);
    }
    assert.equal(app.validator.isEmail("test@example.com"), true);
});

test("unknown validator names from JavaScript log a warning and preserve current permissive behavior", (t) => {
    const errors = captureConsole(t, "error");
    assert.equal(createErii().validateArgument("value", { name: "id", description: "", validate: "doesNotExist" }), true);
    assert.deepEqual(errors, ["Unknown validate method for id."]);
});

test("custom validator exceptions propagate", () => {
    const failure = new Error("validation failed");
    assert.throws(
        () =>
            createErii().validateArgument("value", {
                name: "id",
                description: "",
                validate() {
                    throw failure;
                },
            }),
        (error) => error === failure,
    );
});
