import type { Account, Chain, PublicClient, Transport, WalletClient } from "viem";

// ── Config ──────────────────────────────────────────────────────────────────

export type HollabAgentConfig = {
    /** Viem wallet client with an account (for writing transactions). */
    walletClient: WalletClient<Transport, Chain, Account>;
    /** Viem public client (for reading chain state and waiting for receipts). */
    publicClient: PublicClient<Transport, Chain>;
    /** URL of the Ponder indexer GraphQL endpoint. */
    indexerUrl: string;
    /** OrganizationFactory contract address. */
    orgFactoryAddress: `0x${string}`;
    /** MeetingComponentsFactory contract address (for deploying per-org meeting contracts). */
    meetingComponentsFactoryAddress?: `0x${string}`;
};

// ── Change types (mirrors HolacracyTypes.ChangeType) ────────────────────────

export const ChangeType = {
    CreateRole: 0,
    AmendRole: 1,
    RemoveRole: 2,
    CreatePolicy: 3,
    AmendPolicy: 4,
    RemovePolicy: 5,
    MoveRole: 6,
    Election: 7,
} as const;

export type ChangeTypeValue = (typeof ChangeType)[keyof typeof ChangeType];

// ── Input types ─────────────────────────────────────────────────────────────

export type CreateRoleInput = {
    circleId: bigint;
    name: string;
    purpose: string;
    domains?: string[];
    accountabilities?: string[];
};

export type AmendRoleInput = {
    roleId: bigint;
    name: string;
    purpose: string;
    domains?: string[];
    accountabilities?: string[];
};

export type ElectionInput = {
    roleId: bigint;
    lead: `0x${string}`;
};

export type RecordOutputInput = {
    meetingId: bigint;
    outputType: 0 | 1 | 2 | 3; // NextAction, Project, Request, Information
    description: string;
    assignedTo?: `0x${string}`;
    roleId?: bigint;
};

export type CreateVoteInput = {
    circleId: bigint;
    outputId: bigint;
    reason: string;
    /** Duration in seconds. */
    duration: number;
};

export type CastVoteInput = {
    voteId: bigint;
    /** 0 = Against, 1 = For, 2 = Abstain */
    support: 0 | 1 | 2;
};

// ── Result types ────────────────────────────────────────────────────────────

export type TxResult = {
    txHash: `0x${string}`;
};

export type CreateOrgResult = TxResult & {
    orgId: bigint;
};

export type StartMeetingResult = TxResult & {
    meetingId: bigint;
};

export type CreateVoteResult = TxResult & {
    voteId: bigint;
};
