/**
 * Governance encoding helpers + the ChangeType enum mirror.
 *
 * Structural role mutations (create/amend/remove) go through the on-chain
 * proposal lifecycle: `createProposal(..., changeType, changeData)` followed
 * by `adoptProposal(proposalId)`. This file holds the ABI encoders for the
 * `changeData` payload; the calls themselves happen inline in
 * `GovernanceMeetingRoom.tsx` where the authed meeting state lives.
 */
import { encodeAbiParameters } from "viem";

/** Maps to HolacracyTypes.ChangeType enum in the contract */
export const ChangeType = {
    CreateRole: 0,
    AmendRole: 1,
    RemoveRole: 2,
    CreatePolicy: 3,
    AmendPolicy: 4,
    RemovePolicy: 5,
    MoveRole: 6,
    Election: 7,
    CreateRoleWithRefs: 8,
    AmendRoleWithRefs: 9,
    CreatePolicyWithRefs: 10,
    AmendPolicyWithRefs: 11,
} as const;

export type ChangeTypeValue = (typeof ChangeType)[keyof typeof ChangeType];

// ── Encoding helpers ─────────────────────────────────────────────────────────

const roleParamTypes = [
    { type: "uint256" as const },
    { type: "string" as const },
    { type: "string" as const },
    { type: "string[]" as const },
    { type: "string[]" as const },
] as const;

/** Encode a CreateRole change: abi.encode(circleId, name, purpose, domains[], accountabilities[]) */
export function encodeCreateRole(params: {
    circleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.circleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
    ]);
}

/** Encode an AmendRole change: abi.encode(roleId, name, purpose, domains[], accountabilities[]) */
export function encodeAmendRole(params: {
    roleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.roleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
    ]);
}

/** Encode a RemoveRole change: abi.encode(roleId) */
export function encodeRemoveRole(roleId: bigint): `0x${string}` {
    return encodeAbiParameters([{ type: "uint256" }], [roleId]);
}

/** Encode an Election change (assign role lead): abi.encode(roleId, lead) */
export function encodeElection(roleId: bigint, lead: `0x${string}`): `0x${string}` {
    return encodeAbiParameters([{ type: "uint256" }, { type: "address" }], [roleId, lead]);
}

// ── WithRefs encoding helpers ───────────────────────────────────────────────

type ContentRefInput = {
    contentHash: `0x${string}`;
    visibility: number; // 0 = Public, 1 = OrgEncrypted, 2 = RoleEncrypted
};

const roleWithRefsParamTypes = [
    { type: "uint256" as const },
    { type: "string" as const },
    { type: "string" as const },
    { type: "string[]" as const },
    { type: "string[]" as const },
    { type: "bytes32[]" as const },
    {
        type: "tuple[]" as const,
        components: [
            { type: "bytes32" as const, name: "contentHash" },
            { type: "uint8" as const, name: "visibility" },
        ],
    },
] as const;

/** Encode a CreateRoleWithRefs change */
export function encodeCreateRoleWithRefs(params: {
    circleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    fieldNames: `0x${string}`[];
    refs: ContentRefInput[];
}): `0x${string}` {
    return encodeAbiParameters(roleWithRefsParamTypes, [
        params.circleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
        params.fieldNames,
        params.refs.map((r) => ({ contentHash: r.contentHash, visibility: r.visibility })),
    ]);
}

/** Encode an AmendRoleWithRefs change */
export function encodeAmendRoleWithRefs(params: {
    roleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    fieldNames: `0x${string}`[];
    refs: ContentRefInput[];
}): `0x${string}` {
    return encodeAbiParameters(roleWithRefsParamTypes, [
        params.roleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
        params.fieldNames,
        params.refs.map((r) => ({ contentHash: r.contentHash, visibility: r.visibility })),
    ]);
}
