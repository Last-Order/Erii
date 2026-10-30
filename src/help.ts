import CLI from "clui";
import clc from "cli-color";
import type { CommandMap, Option } from "./types";

/** Render the help body; the caller prints the version first. */
export function renderHelp(commands: CommandMap, commonOptions: Option[]): void {
    console.log("\nHelp:");
    const Line = CLI.Line;

    new Line().padding(5).column("Commands", 30, [clc.cyan]).column("Description", 30, [clc.cyan]).column("Alias", 20, [clc.cyan]).output();
    new Line().output();

    for (const [key, command] of Object.entries(commands)) {
        if (!command || command.redirect) continue;

        const commandText = "--" + key + (command.argument ? ` <${command.argument.name}>` : "");
        const aliasText = (command.alias ?? []).map((alias) => (alias.length === 1 ? `-${alias}` : `--${alias}`)).join(" / ");

        renderRow(5, [
            [commandText, 30],
            [command.description ?? "", 30],
            [aliasText, 20],
        ]);

        if (command.argument) {
            renderRow(9, [
                [`<${command.argument.name}>`, 26],
                [command.argument.description, 30],
            ]);
        }

        for (const option of command.options ?? []) {
            renderOption(option, 9, 26);
        }
    }

    new Line().output();
    if (commonOptions.length > 0) {
        console.log("Options:\n");
        new Line().padding(5).column("Options", 30, [clc.cyan]).column("Description", 30, [clc.cyan]).output();

        for (const option of commonOptions) {
            renderOption(option, 5, 30);
        }
    }
}

/** Scoped and common options share formatting, with different indentation. */
function renderOption(option: Option, padding: number, width: number): void {
    const names = Array.isArray(option.name) ? option.name : [option.name];
    const text = `--${names.join(", ")}` + (option.argument ? ` <${option.argument.name}>` : "");

    renderRow(padding, [
        [text, width],
        [option.description || "", 30],
    ]);

    if (option.argument) {
        renderRow(padding + 4, [
            [`<${option.argument.name}>`, width - 4],
            [option.argument.description || "", 30],
        ]);
    }
}

/** Wrap every cell before passing it to clui, whose columns silently truncate overflowing text. */
function renderRow(padding: number, columns: readonly (readonly [text: string, width: number])[]): void {
    const wrapped = columns.map(([text, width]) => wrapText(text, width));
    const height = Math.max(...wrapped.map((lines) => lines.length));
    for (let row = 0; row < height; row++) {
        const line = new CLI.Line().padding(padding);
        for (const [index, [, width]] of columns.entries()) {
            line.column(wrapped[index][row] ?? "", width);
        }
        line.output();
    }
}

function wrapText(text: string, width: number): string[] {
    return text.split(/\r\n?|\n/).flatMap((line) => {
        const lines: string[] = [];
        while (line.length > width) {
            let end = line.lastIndexOf(" ", width);
            if (end <= 0) {
                end = width;
                // clui counts UTF-16 code units, but a line break must not split a surrogate pair.
                const previous = line.charCodeAt(end - 1);
                const next = line.charCodeAt(end);
                if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end--;
            }
            lines.push(line.slice(0, end));
            line = line.slice(end).trimStart();
        }
        lines.push(line);
        return lines;
    });
}
