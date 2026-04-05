export const TensionBoardAbi = [
    {
        type: "event",
        name: "TensionSubmitted",
        inputs: [
            { name: "tensionId", type: "uint256", indexed: true },
            { name: "author", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
            { name: "circleId", type: "uint256", indexed: false },
            { name: "target", type: "uint8", indexed: false },
            { name: "title", type: "string", indexed: false },
            { name: "description", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "TensionChampioned",
        inputs: [
            { name: "tensionId", type: "uint256", indexed: true },
            { name: "champion", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "TensionDismissed",
        inputs: [
            { name: "tensionId", type: "uint256", indexed: true },
            { name: "dismissedBy", type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "TensionProcessed",
        inputs: [{ name: "tensionId", type: "uint256", indexed: true }],
    },
] as const;
