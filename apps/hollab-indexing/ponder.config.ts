import { createConfig } from "ponder";

import { CircleRegistryAbi } from "./abis/CircleRegistryAbi";
import { CircleTreasuryAbi } from "./abis/CircleTreasuryAbi";
import { GovernanceProcessAbi } from "./abis/GovernanceProcessAbi";
import { HolGovernorAbi } from "./abis/HolGovernorAbi";
import { HolGovernorFactoryAbi } from "./abis/HolGovernorFactoryAbi";
import { OrganizationFactoryAbi } from "./abis/OrganizationFactoryAbi";
import { RoleRegistryAbi } from "./abis/RoleRegistryAbi";

// Placeholder addresses — replace with real values in .env.local after deployment.
// Each env var falls back to a zero-like address so the app starts without crashing.
const addr = (key: string) =>
    (process.env[key] ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;

export default createConfig({
    chains: {
        sepolia: {
            id: 11155111,
            rpc: process.env.PONDER_RPC_URL_11155111,
        },
    },
    contracts: {
        // ── Fixed factory contracts (one per deployment) ─────────────────────────
        OrganizationFactory: {
            chain: "sepolia",
            abi: OrganizationFactoryAbi,
            address: addr("ORGANIZATION_FACTORY_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },
        HolGovernorFactory: {
            chain: "sepolia",
            abi: HolGovernorFactoryAbi,
            address: addr("HOL_GOVERNOR_FACTORY_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },

        // ── Per-org contracts (clones) ────────────────────────────────────────────
        // When multiple orgs exist, set each address as a comma-separated list or
        // use Ponder's factory pattern once OrganizationFactory emits clone addresses.
        CircleRegistry: {
            chain: "sepolia",
            abi: CircleRegistryAbi,
            address: addr("CIRCLE_REGISTRY_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },
        RoleRegistry: {
            chain: "sepolia",
            abi: RoleRegistryAbi,
            address: addr("ROLE_REGISTRY_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },
        GovernanceProcess: {
            chain: "sepolia",
            abi: GovernanceProcessAbi,
            address: addr("GOVERNANCE_PROCESS_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },
        CircleTreasury: {
            chain: "sepolia",
            abi: CircleTreasuryAbi,
            address: addr("CIRCLE_TREASURY_ADDRESS"),
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },

        // ── Per-org governor (factory pattern: discovered from GovernorDeployed) ──
        HolGovernor: {
            chain: "sepolia",
            abi: HolGovernorAbi,
            address: {
                address: addr("HOL_GOVERNOR_FACTORY_ADDRESS"),
                event: HolGovernorFactoryAbi.find(
                    (e): e is (typeof HolGovernorFactoryAbi)[number] & { type: "event" } =>
                        e.type === "event" && (e as { name?: string }).name === "GovernorDeployed",
                )!,
                parameter: "governor",
            },
            startBlock: Number(process.env.START_BLOCK ?? 0),
        },
    },
});
