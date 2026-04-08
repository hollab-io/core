/** Event ABI fragments extracted from on-chain contracts */

export const roleRegistryEvents = [
    {
        type: "event",
        name: "RoleCreated",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_circleId", type: "uint256", indexed: true },
            { name: "_name", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "RoleUpdated",
        inputs: [{ name: "_roleId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "RoleRemoved",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_circleId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "RoleLeadAssigned",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "RoleLeadUnassigned",
        inputs: [
            { name: "_roleId", type: "uint256", indexed: true },
            { name: "_lead", type: "address", indexed: true },
        ],
    },
] as const;

export const contentRefEvents = [
    {
        type: "event",
        name: "ContentRefSet",
        inputs: [
            { name: "_entityType", type: "bytes32", indexed: true },
            { name: "_entityId", type: "uint256", indexed: true },
            { name: "_fieldName", type: "bytes32", indexed: true },
            { name: "_contentHash", type: "bytes32", indexed: false },
            { name: "_visibility", type: "uint8", indexed: false },
        ],
    },
] as const;
