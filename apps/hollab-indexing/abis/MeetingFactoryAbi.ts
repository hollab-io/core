export const MeetingFactoryAbi = [
    {
        type: "event",
        name: "MeetingStarted",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            {
                name: "_kind",
                type: "uint8",
                indexed: true,
                internalType: "enum IMeetingFactory.MeetingKind",
            },
            { name: "_startedBy", type: "address", indexed: false, internalType: "address" },
            { name: "_timestamp", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MeetingEnded",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            {
                name: "_kind",
                type: "uint8",
                indexed: true,
                internalType: "enum IMeetingFactory.MeetingKind",
            },
            { name: "_endedBy", type: "address", indexed: false, internalType: "address" },
            { name: "_timestamp", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MeetingOutputRecorded",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_itemId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            {
                name: "_outputType",
                type: "uint8",
                indexed: false,
                internalType: "enum HolacracyTypes.OutputType",
            },
            { name: "_assignedTo", type: "address", indexed: false, internalType: "address" },
            { name: "_roleId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "_description", type: "string", indexed: false, internalType: "string" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MeetingProposalLinked",
        inputs: [
            { name: "_meetingId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_itemId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_proposalId", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
] as const;
