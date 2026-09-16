import CLI from 'clui';
import clc from 'cli-color';
import type { CommandMap, Option } from './types.js';

/** Render the help body; the caller prints the version first. */
export function renderHelp(commands: CommandMap, commonOptions: Option[]): void {
    console.log('\nHelp:');
    const Line = CLI.Line;

    new Line()
        .padding(5)
        .column('Commands', 30, [clc.cyan])
        .column('Description', 30, [clc.cyan])
        .column('Alias', 20, [clc.cyan])
        .output();
    new Line().output();

    for (const [key, command] of Object.entries(commands)) {
        if (!command || command.redirect) continue;

        const commandText = '--' + key + (command.argument ? ` <${command.argument.name}>` : '');
        const aliasText = (command.alias ?? [])
            .map(alias => alias.length === 1 ? `-${alias}` : `--${alias}`)
            .join(' / ');

        new Line()
            .padding(5)
            .column(commandText, 30)
            .column(command.description ?? '', 30)
            .column(aliasText, 20)
            .output();

        if (command.argument) {
            new Line()
                .padding(9)
                .column(`<${command.argument.name}>`, 26)
                .column(command.argument.description, 30)
                .output();
        }

        for (const option of command.options ?? []) {
            renderOption(option, 9, 26);
        }
    }

    new Line().output();
    if (commonOptions.length > 0) {
        console.log('Options:\n');
        new Line()
            .padding(5)
            .column('Options', 30, [clc.cyan])
            .column('Description', 30, [clc.cyan])
            .output();

        for (const option of commonOptions) {
            renderOption(option, 5, 30);
        }
    }
}

/** Scoped and common options share formatting, with different indentation. */
function renderOption(option: Option, padding: number, width: number): void {
    const names = Array.isArray(option.name) ? option.name : [option.name];
    const text = `--${names.join(', ')}` + (option.argument ? ` <${option.argument.name}>` : '');

    new CLI.Line()
        .padding(padding)
        .column(text, width)
        .column(option.description || '', 30)
        .output();

    if (option.argument) {
        new CLI.Line()
            .padding(padding + 4)
            .column(`<${option.argument.name}>`, width - 4)
            .column(option.argument.description || '', 30)
            .output();
    }
}
