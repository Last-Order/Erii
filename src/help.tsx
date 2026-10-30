import { Box, Text, renderToString } from "ink";
import type { CommandMap, Option } from "./types";

interface HelpRow {
    readonly label: string;
    readonly description: string;
    readonly indent: number;
    readonly aliases?: string;
}

/** Render once at the current terminal width, without starting an interactive Ink session. */
export function renderHelp(commands: CommandMap, commonOptions: Option[]): void {
    const columns = process.stdout.columns || 80;
    const rows: HelpRow[] = [];
    for (const [key, command] of Object.entries(commands)) {
        if (!command || command.redirect) continue;
        const aliases = (command.alias ?? []).map((alias) => (alias.length === 1 ? `-${alias}` : `--${alias}`)).join(" / ");
        rows.push(...entryRows({ ...command, name: key }, 0, aliases));
        for (const option of command.options ?? []) rows.push(...entryRows(option, 4));
    }

    console.log(
        renderToString(
            <Box width={columns} flexDirection="column" marginTop={1}>
                <Text>Help:</Text>
                <HelpSection title="Commands" rows={rows} columns={columns} />
                {commonOptions.length > 0 && (
                    <Box flexDirection="column" marginTop={1}>
                        <Text>Options:</Text>
                        <HelpSection title="Options" rows={commonOptions.flatMap((option) => entryRows(option))} columns={columns} />
                    </Box>
                )}
            </Box>,
            { columns },
        ),
    );
}

function entryRows(entry: Pick<Option, "name" | "description" | "argument">, indent = 0, aliases?: string): HelpRow[] {
    const names = Array.isArray(entry.name) ? entry.name : [entry.name];
    const rows: HelpRow[] = [
        {
            label: `--${names.join(", ")}` + (entry.argument ? ` <${entry.argument.name}>` : ""),
            description: entry.description ?? "",
            indent,
            aliases,
        },
    ];
    if (entry.argument) rows.push({ label: `<${entry.argument.name}>`, description: entry.argument.description, indent: indent + 4 });
    return rows;
}

function HelpSection({ title, rows, columns }: { readonly title: string; readonly rows: readonly HelpRow[]; readonly columns: number }) {
    const padding = Math.min(2, columns - 1);
    const width = columns - padding;
    // Below this width, a name and a useful description no longer fit comfortably side by side.
    const stacked = width < 70;
    const labelWidth = Math.min(36, Math.max(28, Math.floor(width * 0.28)));
    return (
        <Box paddingLeft={padding} flexDirection="column" marginTop={1}>
            <Box flexDirection="column" marginBottom={1}>
                {stacked ? (
                    <Text bold color="cyan">
                        {title}
                    </Text>
                ) : (
                    <TableRow
                        row={{ label: title, description: "Description", indent: 0, aliases: title === "Commands" ? "Alias" : undefined }}
                        labelWidth={labelWidth}
                        heading
                    />
                )}
            </Box>
            {rows.map((row, index) =>
                stacked ? <StackedRow key={index} row={row} width={width} /> : <TableRow key={index} row={row} labelWidth={labelWidth} />,
            )}
        </Box>
    );
}

function TableRow({ row, labelWidth, heading = false }: { readonly row: HelpRow; readonly labelWidth: number; readonly heading?: boolean }) {
    const textProps = { bold: heading, color: heading ? "cyan" : undefined };
    return (
        <Box alignItems="flex-start">
            <Box width={labelWidth} paddingLeft={row.indent} flexShrink={0}>
                <Text {...textProps}>{row.label}</Text>
            </Box>
            <Box flexGrow={1} flexBasis={0} marginLeft={2}>
                <Text {...textProps}>{row.description}</Text>
            </Box>
            {row.aliases !== undefined && (
                <Box width={16} marginLeft={2} flexShrink={0}>
                    <Text {...textProps}>{row.aliases}</Text>
                </Box>
            )}
        </Box>
    );
}

function StackedRow({ row, width }: { readonly row: HelpRow; readonly width: number }) {
    const indent = Math.min(row.indent, Math.max(0, width - 20));
    return (
        <Box flexDirection="column" paddingLeft={indent} marginBottom={1}>
            <Text>{row.label}</Text>
            {row.aliases && <Text dimColor>Alias: {row.aliases}</Text>}
            {row.description && <Text>{row.description}</Text>}
        </Box>
    );
}
