/** @type {import('eslint').Linter.Config} */
module.exports = {
    parserOptions: {
        // Use the package-level tsconfig so the "@/*" path alias resolves
        // correctly in test files.
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
};
