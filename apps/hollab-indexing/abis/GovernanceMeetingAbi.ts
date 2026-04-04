export const GovernanceMeetingAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        name: "circleRegistry",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract CircleRegistry" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "completeMeeting",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "conveneMeeting",
        inputs: [{ name: "_circleId", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getCircleMeetings",
        inputs: [{ name: "_circleId", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "_meetingIds", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getMeeting",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
        outputs: [
            {
                name: "_meeting",
                type: "tuple",
                internalType: "struct HolacracyTypes.GovernanceMeeting",
                components: [
                    { name: "id", type: "uint256", internalType: "uint256" },
                    { name: "circleId", type: "uint256", internalType: "uint256" },
                    { name: "convenedBy", type: "address", internalType: "address" },
                    { name: "createdAt", type: "uint256", internalType: "uint256" },
                    { name: "completedAt", type: "uint256", internalType: "uint256" },
                    { name: "exists", type: "bool", internalType: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getMeetingProposals",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "_proposalIds", type: "uint256[]", internalType: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "governanceProcess",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract GovernanceProcess" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_circleRegistry",
                type: "address",
                internalType: "contract CircleRegistry",
            },
            {
                name: "_governanceProcess",
                type: "address",
                internalType: "contract GovernanceProcess",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "linkProposal",
        inputs: [
            { name: "_meetingId", type: "uint256", internalType: "uint256" },
            { name: "_proposalId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "MeetingCompleted",
        inputs: [{ name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" }],
        anonymous: false,
    },
    {
        type: "event",
        name: "MeetingConvened",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_circleId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_convenedBy", type: "address", indexed: true, internalType: "address" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ProposalLinked",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
        ],
        anonymous: false,
    },
    { type: "error", name: "GovernanceMeeting_AlreadyInitialized", inputs: [] },
    {
        type: "error",
        name: "GovernanceMeeting_MeetingAlreadyCompleted",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
    },
    {
        type: "error",
        name: "GovernanceMeeting_MeetingNotFound",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
    },
    {
        type: "error",
        name: "GovernanceMeeting_NotCircleMember",
        inputs: [
            { name: "_circleId", type: "uint256", internalType: "uint256" },
            { name: "_caller", type: "address", internalType: "address" },
        ],
    },
    {
        type: "error",
        name: "GovernanceMeeting_NotFacilitator",
        inputs: [{ name: "_meetingId", type: "uint256", internalType: "uint256" }],
    },
    {
        type: "error",
        name: "GovernanceMeeting_ProposalAlreadyLinked",
        inputs: [
            { name: "_meetingId", type: "uint256", internalType: "uint256" },
            { name: "_proposalId", type: "uint256", internalType: "uint256" },
        ],
    },
] as const;
