import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import stringWidth from "string-width";
import { createErii, captureConsole, captureStdout } from "./helpers.mjs";

function terminalWidth(t, columns = 80) {
    const previous = Object.getOwnPropertyDescriptor(process.stdout, "columns");
    const setWidth = (value) => Object.defineProperty(process.stdout, "columns", { configurable: true, value });
    setWidth(columns);
    t.after(() => {
        if (previous) Object.defineProperty(process.stdout, "columns", previous);
        else delete process.stdout.columns;
    });
    return setWidth;
}

function compact(text) {
    return text.normalize("NFC").replace(/\s+/g, "");
}

test("version output uses defaults and resets omitted metadata fields", (t) => {
    const logs = captureConsole(t, "log");
    const app = createErii();
    app.showVersion();
    app.setMetaInfo({ name: "example", version: "2.3.4" });
    app.showVersion();
    app.setMetaInfo({ name: "name-only" });
    app.showVersion();
    app.setMetaInfo({ version: "3" });
    app.showVersion();
    app.setMetaInfo();
    app.showVersion();
    assert.deepEqual(logs, ["Erii / 1.0.0", "example / 2.3.4", "name-only / ", " / 3", " / "]);
});

test("empty help prints its headings without a common options section", (t) => {
    terminalWidth(t);
    const output = captureStdout(t);
    createErii().showHelp();
    assert.match(output(), /Erii \/ 1\.0\.0/);
    assert.match(output(), /Help:/);
    assert.match(output(), /Commands\s+Description\s+Alias/);
    assert.doesNotMatch(output(), /Options:/);
});

test("help includes command arguments, short/long aliases, scoped and common option descriptions", (t) => {
    terminalWidth(t);
    const output = captureStdout(t);
    const app = createErii();
    app.setMetaInfo({ name: "example", version: "2" });
    app.bind(
        {
            name: ["run", "r", "execute"],
            description: "Run job",
            argument: {
                name: "job",
                description: "Job identifier",
            },
        },
        () => {},
    );
    app.bind({ name: "stop", description: "Stop job" }, () => {});
    app.addOption({
        name: ["count", "c"],
        command: "run",
        description: "Repeat job",
        argument: {
            name: "times",
            description: "Repeat count",
        },
    });
    app.addOption({ name: "quiet", command: "run", description: "Quiet output" });
    app.addOption({
        name: ["tag", "t"],
        description: "Label job",
        argument: {
            name: "label",
            description: "Job label",
        },
    });
    app.addOption({ name: "verbose", description: "Verbose output" });
    app.showHelp();
    const text = output();
    // Keep the default-width layout stable while testing other terminal widths below.
    const expectedOutput = JSON.parse(readFileSync(new URL("./fixtures/help.json", import.meta.url), "utf8"));
    assert.equal(text, expectedOutput);
});

test("help preserves long names, aliases, missing descriptions and explicit line breaks", (t) => {
    terminalWidth(t);
    const output = captureStdout(t);
    const app = createErii();
    const commandName = "download-a-stream-with-an-extraordinarily-long-command-name";
    const argumentName = "an-extraordinarily-long-argument-name";
    const optionName = "an-extraordinarily-long-option-name";
    const alias = "an-extraordinarily-long-command-alias";
    app.bind({ name: commandName, argument: { name: argumentName, description: "" } }, () => {});
    app.bind({ name: ["run", "r", alias] }, () => {});
    app.addOption({ name: optionName });
    app.addOption({ name: "lines", description: "First line\r\n\r\nLast line" });
    app.showHelp();

    for (const expected of [`--${commandName}<${argumentName}>`, `--${optionName}`, `-r/--${alias}`]) {
        assert.ok(compact(output()).includes(compact(expected)), `Incomplete help text: ${expected}`);
    }
    assert.match(output(), /First line\n\n +Last line/);
});

for (const columns of [40, 72, 160]) {
    test(`help fits a ${columns}-column terminal without losing text`, (t) => {
        terminalWidth(t, columns);
        const output = captureStdout(t);
        const app = createErii();
        const description = "The output directory used for every downloaded media segment.";
        const unicode = "\u001b[36m完整保留中文说明、组合字符 e\u0301 和 emoji 👩‍💻，并按终端显示宽度换行。\u001b[39m";
        const url = "https://example.com/a/very/long/playlist/path/video.m3u8";
        app.bind({ name: ["download", "d", "archive"], description: "Download video", argument: { name: "url", description: url } }, () => {});
        app.bind({ name: "inspect", description }, () => {});
        app.addOption({ name: "keep-encrypted-chunks", command: "download", description });
        app.addOption({ name: "output", command: "download", argument: { name: "path", description: unicode } });
        app.addOption({ name: "verbose", description, argument: { name: "level", description: url } });
        app.showHelp();

        for (const line of output().split("\n")) assert.ok(stringWidth(line) <= columns, `Overflow (${columns} columns): ${line}`);
        for (const expected of [
            "--download <url>",
            "-d / --archive",
            "--keep-encrypted-chunks",
            description,
            url,
            "完整保留中文说明、组合字符 e\u0301 和 emoji 👩‍💻，并按终端显示宽度换行。",
        ])
            assert.ok(compact(output()).includes(compact(expected)), `Incomplete help text: ${expected}`);
        if (columns < 72) assert.match(output(), /--download <url>\n\s*Alias: -d \/\s+--archive\n\s*Download video/);
        else assert.match(output(), /Commands\s+Description\s+Alias/);
    });
}

test("help expands descriptions using the current width on each call", (t) => {
    const setWidth = terminalWidth(t, 80);
    const output = captureStdout(t);
    const app = createErii();
    const description = "The output directory used for every downloaded media segment.";
    app.addOption({ name: "output", description });
    app.showHelp();
    const narrow = output();
    setWidth(120);
    app.showHelp();
    const wide = output().slice(narrow.length);
    assert.ok(!narrow.includes(description));
    assert.ok(wide.includes(description));
    assert.ok(wide.split("\n").length < narrow.split("\n").length);
});

test("help defaults to 80 columns when stdout has no usable width", (t) => {
    const setWidth = terminalWidth(t);
    const output = captureStdout(t);
    const app = createErii();
    app.addOption({ name: "global", description: "word ".repeat(40) });
    app.showHelp();
    const expected = output();
    for (const columns of [undefined, 0]) {
        setWidth(columns);
        const start = output().length;
        app.showHelp();
        assert.equal(output().slice(start), expected);
    }
});
