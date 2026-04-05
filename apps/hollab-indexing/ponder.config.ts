import {
    circleRegistryAbi,
    circleTreasuryAbi,
    governanceProcessAbi,
    holGovernorAbi,
    holGovernorFactoryAbi,
    meetingComponentsFactoryAbi,
    organizationFactoryAbi,
    roleRegistryAbi,
} from "@hollab-io/contracts/actions";
import { createConfig } from "ponder";

import { ActionVotingAbi } from "./abis/ActionVotingAbi";
import { GovernanceMeetingAbi } from "./abis/GovernanceMeetingAbi";
import { JoinRequestAbi } from "./abis/JoinRequestAbi";
import { TacticalMeetingAbi } from "./abis/TacticalMeetingAbi";
import { TensionBoardAbi } from "./abis/TensionBoardAbi";

const addr = (key: string) =>
    (process.env[key] ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;

const orgFactoryAddr = addr("ORGANIZATION_FACTORY_ADDRESS");
const govFactoryAddr = addr("HOL_GOVERNOR_FACTORY_ADDRESS");
const meetingFactoryAddr = addr("MEETING_COMPONENTS_FACTORY_ADDRESS");
const joinRequestAddr = addr("JOIN_REQUEST_ADDRESS");
const tensionBoardAddr = addr("TENSION_BOARD_ADDRESS");
const startBlock = Number(process.env.START_BLOCK ?? 0);

const orgComponentsDeployedEvent = organizationFactoryAbi.find(
    (e): e is (typeof organizationFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "OrgComponentsDeployed",
)!;

const governorDeployedEvent = holGovernorFactoryAbi.find(
    (e): e is (typeof holGovernorFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "GovernorDeployed",
)!;

const meetingComponentsDeployedEvent = meetingComponentsFactoryAbi.find(
    (e): e is (typeof meetingComponentsFactoryAbi)[number] & { type: "event" } =>
        e.type === "event" && (e as { name?: string }).name === "MeetingComponentsDeployed",
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

        // ── MeetingComponentsFactory: indexed directly for MeetingComponentsDeployed ─────────
        MeetingComponentsFactory: {
            chain: "sepolia",
            abi: meetingComponentsFactoryAbi,
            address: meetingFactoryAddr,
            startBlock,
        },

        // ── Per-org meeting & voting clones: auto-discovered from MeetingComponentsDeployed ─
        TacticalMeeting: {
            chain: "sepolia",
            abi: TacticalMeetingAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_tacticalMeeting",
            },
            startBlock,
        },
        GovernanceMeeting: {
            chain: "sepolia",
            abi: GovernanceMeetingAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_governanceMeeting",
            },
            startBlock,
        },
        ActionVoting: {
            chain: "sepolia",
            abi: ActionVotingAbi,
            address: {
                address: meetingFactoryAddr,
                event: meetingComponentsDeployedEvent,
                parameter: "_actionVoting",
            },
            startBlock,
        },

        // ── JoinRequest: single deployment, indexes all join requests ────────────
        JoinRequest: {
            chain: "sepolia",
            abi: JoinRequestAbi,
            address: joinRequestAddr,
            startBlock,
        },

        // ── TensionBoard: single deployment, anyone can submit tensions ──────────
        TensionBoard: {
            chain: "sepolia",
            abi: TensionBoardAbi,
            address: tensionBoardAddr,
            startBlock,
        },
    },
});
