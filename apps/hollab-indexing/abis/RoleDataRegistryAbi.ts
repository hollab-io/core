export const RoleDataRegistryAbi = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "addChecklistItem",
        inputs: [
            {
                name: "_roleId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_label",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [
            {
                name: "_itemId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "addMetric",
        inputs: [
            {
                name: "_roleId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_label",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [
            {
                name: "_metricId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "checklistItemCount",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getChecklistItem",
        inputs: [
            {
                name: "_itemId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_item",
                type: "tuple",
                internalType: "struct HolacracyTypes.ChecklistItem",
                components: [
                    {
                        name: "id",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "roleId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "label",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "exists",
                        type: "bool",
                        internalType: "bool",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getChecklistItemsByRole",
        inputs: [
            {
                name: "_roleId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_itemIds",
                type: "uint256[]",
                internalType: "uint256[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getMetric",
        inputs: [
            {
                name: "_metricId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_metric",
                type: "tuple",
                internalType: "struct HolacracyTypes.Metric",
                components: [
                    {
                        name: "id",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "roleId",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "label",
                        type: "string",
                        internalType: "string",
                    },
                    {
                        name: "exists",
                        type: "bool",
                        internalType: "bool",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getMetricsByRole",
        inputs: [
            {
                name: "_roleId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "_metricIds",
                type: "uint256[]",
                internalType: "uint256[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_orgId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_orgInstance",
                type: "address",
                internalType: "address",
            },
            {
                name: "_roleRegistry",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "metricCount",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "org",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IOrganizationInstance",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "orgId",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "removeChecklistItem",
        inputs: [
            {
                name: "_itemId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "removeMetric",
        inputs: [
            {
                name: "_metricId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "roleRegistry",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IRoleRegistry",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "ChecklistItemAdded",
        inputs: [
            {
                name: "_itemId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_roleId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_label",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ChecklistItemRemoved",
        inputs: [
            {
                name: "_itemId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_roleId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MetricAdded",
        inputs: [
            {
                name: "_metricId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_roleId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_label",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "MetricRemoved",
        inputs: [
            {
                name: "_metricId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
            {
                name: "_roleId",
                type: "uint256",
                indexed: true,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "RoleDataRegistry_AlreadyInitialized",
        inputs: [],
    },
    {
        type: "error",
        name: "RoleDataRegistry_ChecklistItemNotFound",
        inputs: [
            {
                name: "_itemId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "RoleDataRegistry_EmptyLabel",
        inputs: [],
    },
    {
        type: "error",
        name: "RoleDataRegistry_MetricNotFound",
        inputs: [
            {
                name: "_metricId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "RoleDataRegistry_RoleNotFound",
        inputs: [
            {
                name: "_roleId",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "RoleDataRegistry_Unauthorized",
        inputs: [],
    },
] as const;
