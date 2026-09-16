import Erii, { type ArgumentValue, type TypedCommandHandler } from 'erii';

type CLI = {
    commonOptions: { verbose?: boolean };
    commands: {
        build: { aliases: 'b'; argument: string; options: { outDir?: string; minify?: boolean } };
        serve: { argument: number; options: { port?: number; mode?: 'dev' | 'prod' } };
        help: {};
    };
};
const cli = new Erii<CLI>();
cli.bind({ name: ['build', 'b'], argument: { name: 'path', description: '' } }, (ctx, options) => {
    const path: string | undefined = ctx.getArgument();
    const port: number | undefined = ctx.getArgument('serve');
    const alias: string | undefined = ctx.getArgument('b');
    const output: string | undefined = options.outDir;
    const verbose: boolean | undefined = options.verbose;
    // @ts-expect-error Options belong to their command.
    options.port;
    // @ts-expect-error Unknown command.
    ctx.getArgument('missing');
    // @ts-expect-error Missing values are possible.
    const required: string = ctx.getArgument();
    // @ts-expect-error Options cannot be assigned a value by the handler.
    options.minify = false;
});
cli.bind({ name: 'serve', argument: { name: 'id', description: '' } }, () => {});
cli.bind({ name: 'help' }, (ctx) => {
    const raw: ArgumentValue | undefined = ctx.getArgument();
});
cli.addOption({ name: 'verbose' });
cli.addOption({ command: 'build', name: ['outDir', 'o'] });
cli.addOption({ command: 'b', name: 'minify' });
cli.addOption({ command: 'serve', name: 'port' });
cli.addOption({ command: 'serve', name: 'mode' });
const argument: number | undefined = cli.getArgument('serve');
cli.showHelp('b');
// @ts-expect-error Explicit schema is required.
new Erii();
// @ts-expect-error Unknown command.
cli.bind({ name: 'unknown' }, () => {});
// @ts-expect-error Required argument registration cannot be omitted.
cli.bind({ name: 'build' }, () => {});
// @ts-expect-error Undeclared command alias.
cli.bind({ name: ['build', 'other'], argument: { name: 'path', description: '' } }, () => {});
// @ts-expect-error Port is scoped to serve.
cli.addOption({ command: 'build', name: 'port' });
// @ts-expect-error Scoped options require a command.
cli.addOption({ name: 'port' });
// @ts-expect-error Unknown common option.
cli.addOption({ name: 'quiet' });
// @ts-expect-error Unknown lookup.
cli.getArgument('other');
// @ts-expect-error Unknown help command.
cli.showHelp('other');
const serveHandler: TypedCommandHandler<CLI, 'serve'> = () => {};
// @ts-expect-error Handler must match the selected command, without widening inference.
cli.bind({ name: 'build', argument: { name: 'path', description: '' } }, serveHandler);

// Common names are reserved even if repeated in a command's schema.
type Shared = { commonOptions: { verbose: boolean }; commands: { run: { options: { verbose: string } } } };
const shared = new Erii<Shared>();
shared.bind({ name: 'run' }, (_, options) => {
    const value: boolean | undefined = options.verbose;
});
// @ts-expect-error Common options must be registered globally.
shared.addOption({ command: 'run', name: 'verbose' });
// @ts-expect-error Nonempty primary-name tuple is required.
cli.addOption({ name: [] });
type Compound = { commands: { run: { options: { tags: string[] } } } };
new Erii<Compound>().addOption({ command: 'run', name: 'tags' });

// @ts-expect-error Runtime type fields are not part of option registration.
cli.addOption({ name: 'verbose', type: 'boolean' });
// @ts-expect-error Runtime parsers are not part of option registration.
cli.addOption({ command: 'serve', name: 'port', parse: () => 3000 });
// @ts-expect-error Runtime type fields are not part of argument registration.
cli.bind({ name: 'build', argument: { name: 'path', description: '', type: 'string' } }, () => {});
cli.addOption({ command: 'serve', name: 'port', argument: { name: 'port', description: '', validate: 'isInt' } });
