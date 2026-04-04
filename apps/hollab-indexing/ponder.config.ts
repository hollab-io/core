import {
    circleRegistryAbi,
    circleTreasuryAbi,
    governanceProcessAbi,
    holGovernorAbi,
    holGovernorFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
} from "@hollab-io/contracts/actions";
import { createConfig } from "ponder";

const addr = (key: string) =>
    (process.env[key] ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;

const orgFactoryAddr = addr("ORGANIZATION_FACTORY_ADDRESS");
const govFactoryAddr = addr("HOL_GOVERNOR_FACTORY_ADDRESS");
const startBlock = Number(process.env.START_BLOCK ?? 0);

const orgComponentsDeployedEvent = organizationFactoryAbi.find(
    (e): e is (typeof organizationFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "OrgComponentsDeployed",
)!;

const governorDeployedEvent = holGovernorFactoryAbi.find(
    (e): e is (typeof holGovernorFactoryAbi)[number] & { type: "event" } =>
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
            abi: organizationFactoryAbi,
            address: orgFactoryAddr,
            startBlock,
        },

        // ── Per-org clones: auto-discovered from OrgComponentsDeployed ────────────
        CircleRegistry: {
            chain: "sepolia",
            abi: circleRegistryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_circleRegistry",
            },
            startBlock,
        },
        RoleRegistry: {
            chain: "sepolia",
            abi: roleRegistryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_roleRegistry",
            },
            startBlock,
        },
        GovernanceProcess: {
            chain: "sepolia",
            abi: governanceProcessAbi,
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
            abi: holGovernorAbi,
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
            abi: circleTreasuryAbi,
            address: {
                address: orgFactoryAddr,
                event: orgComponentsDeployedEvent,
                parameter: "_treasury",
            },
            startBlock,
        },
    },
});
