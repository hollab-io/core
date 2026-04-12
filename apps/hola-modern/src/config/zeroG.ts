/** 0G Storage network configuration */

export const ZG_STORAGE_CONFIG = {
    testnet: {
        rpcUrl: "https://evmrpc-testnet.0g.ai",
        indexerRpc: "https://indexer-storage-testnet-turbo.0g.ai",
        chainId: 16602,
    },
    mainnet: {
        rpcUrl: "https://evmrpc.0g.ai",
        indexerRpc: "https://indexer-storage-turbo.0g.ai",
        chainId: 16661,
    },
} as const;

/** Active network — override via VITE_ZG_NETWORK env var */
const network = (import.meta.env.VITE_ZG_NETWORK ?? "testnet") as keyof typeof ZG_STORAGE_CONFIG;

export const zgConfig = ZG_STORAGE_CONFIG[network];
