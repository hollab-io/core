interface ImportMetaEnv {
    readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
    readonly VITE_INDEXER_URL?: string;
    readonly VITE_INDEXER_URL_LOCAL?: string;
    readonly VITE_INDEXER_URL_SEPOLIA?: string;
    readonly VITE_INDEXER_URL_MAINNET?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
