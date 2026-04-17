/**
 * Browser shim for `node:fs/promises`.
 *
 * @0gfoundation/0g-ts-sdk's browser bundle still references fs/promises from
 * its Node-only ZgFile class. Our hola-modern code never reaches ZgFile — we
 * use MemData (bytes in memory) and ZgBlob (File objects). This module exists
 * only to give Rollup a specifier to resolve. Anything that actually imports
 * these at runtime throws a clear error so we notice immediately.
 */
function unsupported(name: string): () => never {
    return () => {
        throw new Error(
            `[node:fs/promises shim] '${name}' was called in the browser. ` +
                `Browser code paths must not touch the filesystem.`,
        );
    };
}

export const open = unsupported("open");
export const readFile = unsupported("readFile");
export const writeFile = unsupported("writeFile");
export const stat = unsupported("stat");
export const unlink = unsupported("unlink");
export const mkdir = unsupported("mkdir");

export default {
    open,
    readFile,
    writeFile,
    stat,
    unlink,
    mkdir,
};
