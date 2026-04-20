export const OrganizationInstanceAbi = [
    {
        type: "function",
        inputs: [],
        name: "summary",
        outputs: [
            {
                name: "",
                internalType: "struct HolacracyTypes.Organization",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "subname", internalType: "string", type: "string" },
                    { name: "creator", internalType: "address", type: "address" },
                    { name: "roleRegistry", internalType: "address", type: "address" },
                    { name: "circleRegistry", internalType: "address", type: "address" },
                    { name: "governanceProcess", internalType: "address", type: "address" },
                    { name: "meetingFactory", internalType: "address", type: "address" },
                    { name: "accessManager", internalType: "address", type: "address" },
                    { name: "anchorCircleId", internalType: "uint256", type: "uint256" },
                    { name: "createdAt", internalType: "uint256", type: "uint256" },
                    { name: "token", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingFactory",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "AdminAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "AdminRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "account", internalType: "address", type: "address", indexed: true },
            { name: "agentRegistry", internalType: "address", type: "address", indexed: true },
            { name: "agentId", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "AgentIdentityLinked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
        ],
        name: "JoinApproved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
        ],
        name: "JoinRejected",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
            { name: "message", internalType: "string", type: "string", indexed: false },
        ],
        name: "JoinRequested",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "meetingFactory", internalType: "address", type: "address", indexed: true },
        ],
        name: "MeetingFactorySet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "MemberAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "account", internalType: "address", type: "address", indexed: true }],
        name: "MemberRemoved",
    },
] as const;
