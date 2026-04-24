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
    // ── Proposal lifecycle (commitments-only audit trail) ───────────────────
    // See packages/contracts/src/contracts/MeetingFactory.sol and
    // specs/05-governance-process.md "On-chain Commitments Surface".
    {
        type: "event",
        name: "ProposalCreated",
        inputs: [
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_circleId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_proposer", type: "address", indexed: false, internalType: "address" },
            { name: "_proposerRoleId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "_tensionHash", type: "bytes32", indexed: false, internalType: "bytes32" },
            { name: "_changeType", type: "uint8", indexed: false, internalType: "uint8" },
            { name: "_changeData", type: "bytes", indexed: false, internalType: "bytes" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ProposalTensionPublished",
        inputs: [
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_text", type: "string", indexed: false, internalType: "string" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ProposalAdopted",
        inputs: [
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_resultId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "_adoptedBy", type: "address", indexed: false, internalType: "address" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ProposalDiscarded",
        inputs: [
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_orgId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_discardedBy", type: "address", indexed: false, internalType: "address" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ObjectionRaised",
        inputs: [
            { name: "_objectionId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_objector", type: "address", indexed: true, internalType: "address" },
            { name: "_objectorRoleId", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "_concernHash", type: "bytes32", indexed: false, internalType: "bytes32" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ObjectionResolved",
        inputs: [
            { name: "_objectionId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_proposalId", type: "uint256", indexed: true, internalType: "uint256" },
            { name: "_resolvedBy", type: "address", indexed: false, internalType: "address" },
        ],
        anonymous: false,
    },
] as const;
