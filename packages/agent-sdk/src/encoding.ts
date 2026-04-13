import { encodeAbiParameters } from "viem";

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
    domains?: string[];
    accountabilities?: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.circleId,
        params.name,
        params.purpose,
        params.domains ?? [],
        params.accountabilities ?? [],
    ]);
}

/** Encode an AmendRole change: abi.encode(roleId, name, purpose, domains[], accountabilities[]) */
export function encodeAmendRole(params: {
    roleId: bigint;
    name: string;
    purpose: string;
    domains?: string[];
    accountabilities?: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.roleId,
        params.name,
        params.purpose,
        params.domains ?? [],
        params.accountabilities ?? [],
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
