/** @type {import('eslint').Linter.Config} */
module.exports = {
    rules: {
        // Viem generics produce complex inferred types that are impractical to annotate
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        // Required for viem's Client type coercion in contract actions
        "@typescript-eslint/no-explicit-any": "off",
    },
};
