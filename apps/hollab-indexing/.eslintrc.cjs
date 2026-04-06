module.exports = {
    extends: "ponder",
    parserOptions: {
        tsconfigRootDir: __dirname,
    },
    rules: {
        // Ponder event handlers and config helpers have inferred return types
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
    },
};
