import type { Address, Chain } from "viem";
import {
    meetingComponentsFactoryAddress,
    organizationFactoryAddress,
} from "@hollab-io/contracts/actions";
import { foundry, mainnet, sepolia } from "viem/chains";

const ZERO: Address = "0x0000000000000000000000000000000000000000";

/** Look up a chain-keyed address map, falling back to zero. */
function addr(map: Record<number, string>, chainId: number): Address {
    return (map[chainId] as Address) ?? ZERO;
}

export type ChainConfig = {
    chain: Chain;
    label: string;
    enabled: boolean;
    orgFactoryAddress: Address;
    meetingFactoryAddress: Address;
    indexerUrl: string;
};

// ── Localhost / Anvil (local dev) ────────────────────────────────────────────
const hasLocal = foundry.id in organizationFactoryAddress;
const localhostConfig: ChainConfig = {
    chain: foundry,
    label: "Local (Anvil)",
    enabled: hasLocal,
    orgFactoryAddress: addr(organizationFactoryAddress, foundry.id),
    meetingFactoryAddress: addr(meetingComponentsFactoryAddress, foundry.id),
    indexerUrl: import.meta.env.VITE_INDEXER_URL_LOCAL ?? "http://localhost:42069",
};

// ── Sepolia (testnet) ────────────────────────────────────────────────────────
const sepoliaConfig: ChainConfig = {
    chain: sepolia,
    label: "Sepolia Testnet",
    enabled: true,
    orgFactoryAddress: addr(organizationFactoryAddress, sepolia.id),
    meetingFactoryAddress: addr(meetingComponentsFactoryAddress, sepolia.id),
    indexerUrl: import.meta.env.VITE_INDEXER_URL_SEPOLIA ?? import.meta.env.VITE_INDEXER_URL ?? "",
};

// ── Mainnet ──────────────────────────────────────────────────────────────────
const mainnetConfig: ChainConfig = {
    chain: mainnet,
    label: "Ethereum Mainnet",
    enabled: false, // Coming soon
    orgFactoryAddress: addr(organizationFactoryAddress, mainnet.id),
    meetingFactoryAddress: addr(meetingComponentsFactoryAddress, mainnet.id),
    indexerUrl: import.meta.env.VITE_INDEXER_URL_MAINNET ?? import.meta.env.VITE_INDEXER_URL ?? "",
};

// ── Registry ─────────────────────────────────────────────────────────────────
const configs: Record<number, ChainConfig> = {
    [foundry.id]: localhostConfig,
    [sepolia.id]: sepoliaConfig,
    [mainnet.id]: mainnetConfig,
};

// Default to localhost when local addresses are available, otherwise Sepolia
export const DEFAULT_CHAIN_ID = hasLocal ? foundry.id : sepolia.id;

export const supportedChains = Object.values(configs);
export const enabledChains = supportedChains.filter((c) => c.enabled);

export function getChainConfig(chainId: number): ChainConfig {
    const config = configs[chainId];
    if (!config) throw new Error(`Unsupported chain: ${chainId}`);
    return config;
}
