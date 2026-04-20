import {
    meetingComponentsFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
} from "@hollab-io/contracts/actions";
import { createConfig } from "ponder";

import { ActionVotingAbi } from "./abis/ActionVotingAbi";
import { MeetingFactoryAbi } from "./abis/MeetingFactoryAbi";
import { OrganizationInstanceAbi } from "./abis/OrganizationInstanceAbi";
import { RoleDataRegistryAbi } from "./abis/RoleDataRegistryAbi";

const ZERO = "0x0000000000000000000000000000000000000001" as `0x${string}`;
const addr = (key: string) => (process.env[key] || ZERO) as `0x${string}`;

const orgFactoryAddr = addr("ORGANIZATION_FACTORY_ADDRESS");
const meetingFactoryAddr = addr("MEETING_COMPONENTS_FACTORY_ADDRESS");
const startBlock = Number(process.env.START_BLOCK ?? 0);

// For undeployed contracts, use a very high start block so Ponder registers
// the contract (keeping handler validation happy) but never scans any blocks.
const FAR_FUTURE = 999_999_999;
const startBlockFor = (a: `0x${string}`) => (a === ZERO ? FAR_FUTURE : startBlock);

// ── Chain configuration ──────────────────────────────────────────────────────
// PONDER_CHAIN: "localhost" | "sepolia" (default) | "mainnet"
const chainName = (process.env.PONDER_CHAIN ?? "sepolia") as "mainnet" | "sepolia" | "localhost";
const chainId = chainName === "mainnet" ? 1 : chainName === "localhost" ? 31337 : 11155111;
// Comma-separated list of RPC URLs; Ponder round-robins across them.
const rpcUrls: string[] = process.env.PONDER_RPC_URL
    ? process.env.PONDER_RPC_URL.split(",").map((u) => u.trim())
    : chainName === "localhost"
      ? ["http://127.0.0.1:8545"]
      : [];

const organizationCreatedEvent = organizationFactoryAbi.find(
    (e): e is (typeof organizationFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "OrganizationCreated",
)!;

const meetingComponentsDeployedEvent = meetingComponentsFactoryAbi.find(
    (e): e is (typeof meetingComponentsFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "MeetingComponentsDeployed",
)!;

export default createConfig({
    chains: {
        chain: {
            id: chainId,
            rpc: rpcUrls.length === 1 ? rpcUrls[0] : rpcUrls,
        },
    },
    contracts: {
        // ── Fixed factory contract ────────────────────────────────────────────────
        OrganizationFactory: {
            chain: "chain",
            abi: organizationFactoryAbi,
            address: orgFactoryAddr,
            startBlock,
        },

        // ── Per-org OrganizationInstance clones: auto-discovered from OrganizationCreated ─
        OrganizationInstance: {
            chain: "chain",
            abi: OrganizationInstanceAbi,
            address: {
                address: orgFactoryAddr,
                event: organizationCreatedEvent,
                parameter: "_instance",
            },
            startBlock,
        },

        // ── Per-org RoleRegistry clones: auto-discovered from OrganizationCreated ─
        RoleRegistry: {
            chain: "chain",
            abi: roleRegistryAbi,
            address: {
                address: orgFactoryAddr,
                event: organizationCreatedEvent,
                parameter: "_roleRegistry",
            },
            startBlock,
        },

        // ── MeetingComponentsFactory: indexed directly for MeetingComponentsDeployed ─────────
        MeetingComponentsFactory: {
            chain: "chain",
            abi: meetingComponentsFactoryAbi,
            address: meetingFactoryAddr,
            startBlock: startBlockFor(meetingFactoryAddr),
        },

        // ── Per-org MeetingFactory clones: auto-discovered from MeetingComponentsDeployed ─
        MeetingFactory: {
            chain: "chain",
            abi: MeetingFactoryAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_meetingFactory",
            },
            startBlock: startBlockFor(meetingFactoryAddr),
        },

        // ── Per-org ActionVoting clones: auto-discovered from MeetingComponentsDeployed ─
        ActionVoting: {
            chain: "chain",
            abi: ActionVotingAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_actionVoting",
            },
            startBlock: startBlockFor(meetingFactoryAddr),
        },

        // ── Per-org RoleDataRegistry clones: auto-discovered from MeetingComponentsDeployed ─
        RoleDataRegistry: {
            chain: "chain",
            abi: RoleDataRegistryAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_roleDataRegistry",
            },
            startBlock: startBlockFor(meetingFactoryAddr),
        },
    },
});
