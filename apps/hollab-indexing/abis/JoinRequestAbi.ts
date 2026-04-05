export const JoinRequestAbi = [
    {
        type: "event",
        name: "JoinRequested",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
            { name: "message", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "JoinApproved",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "JoinRejected",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
        ],
    },
] as const;
