interface ImportMetaEnv {
    readonly VITE_DYNAMIC_ENVIRONMENT_ID?: string;
    readonly VITE_INDEXER_URL?: string;
    readonly VITE_INDEXER_URL_LOCAL?: string;
    readonly VITE_INDEXER_URL_SEPOLIA?: string;
    readonly VITE_INDEXER_URL_MAINNET?: string;
    readonly VITE_JOIN_REQUEST_ADDRESS?: string;
    readonly VITE_TENSION_BOARD_ADDRESS?: string;
    readonly VITE_LOCAL_JOIN_REQUEST_ADDRESS?: string;
    readonly VITE_LOCAL_TENSION_BOARD_ADDRESS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
