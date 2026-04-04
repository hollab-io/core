import { createConfig } from "ponder";

import { CircleRegistryAbi } from "./abis/CircleRegistryAbi";
import { CircleTreasuryAbi } from "./abis/CircleTreasuryAbi";
import { GovernanceProcessAbi } from "./abis/GovernanceProcessAbi";
import { HolGovernorAbi } from "./abis/HolGovernorAbi";
import { HolGovernorFactoryAbi } from "./abis/HolGovernorFactoryAbi";
import { OrganizationFactoryAbi } from "./abis/OrganizationFactoryAbi";
import { RoleRegistryAbi } from "./abis/RoleRegistryAbi";

const addr = (key: string) =>
    (process.env[key] ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;

const orgFactoryAddr = addr("ORGANIZATION_FACTORY_ADDRESS");
const govFactoryAddr = addr("HOL_GOVERNOR_FACTORY_ADDRESS");
const startBlock = Number(process.env.START_BLOCK ?? 0);

// Resolve the OrgComponentsDeployed event object once for reuse across factory configs
const orgComponentsDeployedEvent = OrganizationFactoryAbi.find(
    (e): e is (typeof OrganizationFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "OrgComponentsDeployed",
)!;

const governorDeployedEvent = HolGovernorFactoryAbi.find(
    (e): e is (typeof HolGovernorFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "GovernorDeployed",
)!;

export default createConfig({
    chains: {
        sepolia: {
            id: 11155111,
            rpc: process.env.PONDER_RPC_URL_11155111,
        },
    },
    contracts: {
        // ── Fixed factory contracts ───────────────────────────────────────────────
        OrganizationFactory: {
            chain: "sepolia",
            abi: OrganizationFactoryAbi,
            address: orgFactoryAddr,
            startBlock,
        },

        // ── Per-org clones: auto-discovered from OrgComponentsDeployed ────────────
        CircleRegistry: {
            chain: "sepolia",
            abi: CircleRegistryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_circleRegistry",
            },
            startBlock,
        },
        RoleRegistry: {
            chain: "sepolia",
            abi: RoleRegistryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_roleRegistry",
            },
            startBlock,
        },
        GovernanceProcess: {
            chain: "sepolia",
            abi: GovernanceProcessAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_governanceProcess",
            },
            startBlock,
        },

        // ── Per-org governor: auto-discovered from GovernorDeployed ──────────────
        HolGovernor: {
            chain: "sepolia",
            abi: HolGovernorAbi,
            address: {
                address: govFactoryAddr,
                event: governorDeployedEvent,
                parameter: "governor",
            },
            startBlock,
        },

        // ── Per-org treasury: auto-discovered from OrgComponentsDeployed ─────────
        CircleTreasury: {
            chain: "sepolia",
            abi: CircleTreasuryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_treasury",
            },
            startBlock,
        },
    },
});
