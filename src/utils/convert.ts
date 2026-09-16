export function toCamelCase(str: string): string {
    return str.replace(/[-_]([a-z])/gi, (_, letter: string) => letter.toUpperCase());
}

export function toKebabCase(str: string): string {
    return (str[0]?.toLowerCase() ?? "") + str.slice(1).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function convertObjectKey<T>(before: Record<string, T>): Record<string, T> {
    return Object.fromEntries(Object.entries(before).map(([key, value]) => [toCamelCase(key), value]));
}

export function createCamelProxifiedObject<T extends object>(before: T): T {
    return new Proxy(before, {
        get(target, key, receiver): unknown {
            const value: unknown = Reflect.get(target, key, receiver);
            return typeof key === "string" ? (value ?? Reflect.get(target, toKebabCase(key), receiver)) : value;
        },
        set(target, key, value: unknown, receiver): boolean {
            if (
                typeof key === "string" &&
                !key.includes("-") &&
                Reflect.get(target, key, receiver) == null &&
                Reflect.get(target, toKebabCase(key), receiver) != null
            ) {
                return Reflect.set(target, toKebabCase(key), value, receiver);
            }
            return Reflect.set(target, key, value, receiver);
        },
    });
}
