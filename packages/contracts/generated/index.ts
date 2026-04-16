//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ActionVoting
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const actionVotingAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_support", internalType: "enum HolacracyTypes.VoteSupport", type: "uint8" },
        ],
        name: "castVote",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_outputId", internalType: "uint256", type: "uint256" },
            { name: "_reason", internalType: "string", type: "string" },
            { name: "_duration", internalType: "uint256", type: "uint256" },
        ],
        name: "createVote",
        outputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleMintCap",
        outputs: [{ name: "_cap", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleMintedTotal",
        outputs: [{ name: "_total", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleQuorum",
        outputs: [{ name: "_quorum", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
        ],
        name: "getCollaboratorWeight",
        outputs: [{ name: "_weight", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "getVoteWeight",
        outputs: [{ name: "_weight", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "govToken",
        outputs: [{ name: "", internalType: "contract IVotes", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
            { name: "_weight", internalType: "uint256", type: "uint256" },
        ],
        name: "grantCollaboratorWeight",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "hasVoted",
        outputs: [{ name: "_voted", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgFactory", internalType: "address", type: "address" },
            { name: "", internalType: "address", type: "address" },
            { name: "_govToken", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "orgFactory",
        outputs: [{ name: "", internalType: "contract IOrganizationFactory", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_collaborator", internalType: "address", type: "address" },
        ],
        name: "revokeCollaboratorWeight",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_cap", internalType: "uint256", type: "uint256" },
        ],
        name: "setCircleMintCap",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_quorum", internalType: "uint256", type: "uint256" },
        ],
        name: "setCircleQuorum",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_cap", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CircleMintCapSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_quorum", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CircleQuorumSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_collaborator", internalType: "address", type: "address", indexed: true },
            { name: "_weight", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "CollaboratorWeightGranted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_collaborator", internalType: "address", type: "address", indexed: true },
        ],
        name: "CollaboratorWeightRevoked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_voter", internalType: "address", type: "address", indexed: true },
            {
                name: "_support",
                internalType: "enum HolacracyTypes.VoteSupport",
                type: "uint8",
                indexed: false,
            },
            { name: "_weight", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VoteCast",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_outputId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposer", internalType: "address", type: "address", indexed: false },
            { name: "_deadline", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_reason", internalType: "string", type: "string", indexed: false },
            { name: "_snapshotBlock", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "VoteCreated",
    },
    { type: "error", inputs: [], name: "ActionVoting_AlreadyInitialized" },
    {
        type: "error",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "ActionVoting_AlreadyVoted",
    },
    { type: "error", inputs: [], name: "ActionVoting_EmptyReason" },
    { type: "error", inputs: [], name: "ActionVoting_InvalidDuration" },
    {
        type: "error",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_requested", internalType: "uint256", type: "uint256" },
            { name: "_remaining", internalType: "uint256", type: "uint256" },
        ],
        name: "ActionVoting_MintCapExceeded",
    },
    {
        type: "error",
        inputs: [
            { name: "_voteId", internalType: "uint256", type: "uint256" },
            { name: "_voter", internalType: "address", type: "address" },
        ],
        name: "ActionVoting_NoVotingPower",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_NotCircleLeadOrFacilitator",
    },
    {
        type: "error",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_QuorumNotSet",
    },
    {
        type: "error",
        inputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_VoteNotActive",
    },
    {
        type: "error",
        inputs: [{ name: "_voteId", internalType: "uint256", type: "uint256" }],
        name: "ActionVoting_VoteNotFound",
    },
    { type: "error", inputs: [], name: "ActionVoting_ZeroAddress" },
    { type: "error", inputs: [], name: "ActionVoting_ZeroAmount" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovToken
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const govTokenAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_symbol", internalType: "string", type: "string" },
            { name: "_minter", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "CLOCK_MODE",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "owner", internalType: "address", type: "address" },
            { name: "spender", internalType: "address", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "spender", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "pos", internalType: "uint32", type: "uint32" },
        ],
        name: "checkpoints",
        outputs: [
            {
                name: "",
                internalType: "struct Checkpoints.Checkpoint208",
                type: "tuple",
                components: [
                    { name: "_key", internalType: "uint48", type: "uint48" },
                    { name: "_value", internalType: "uint208", type: "uint208" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "clock",
        outputs: [{ name: "", internalType: "uint48", type: "uint48" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", internalType: "uint8", type: "uint8" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "delegatee", internalType: "address", type: "address" }],
        name: "delegate",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "delegatee", internalType: "address", type: "address" },
            { name: "nonce", internalType: "uint256", type: "uint256" },
            { name: "expiry", internalType: "uint256", type: "uint256" },
            { name: "v", internalType: "uint8", type: "uint8" },
            { name: "r", internalType: "bytes32", type: "bytes32" },
            { name: "s", internalType: "bytes32", type: "bytes32" },
        ],
        name: "delegateBySig",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "delegates",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "eip712Domain",
        outputs: [
            { name: "fields", internalType: "bytes1", type: "bytes1" },
            { name: "name", internalType: "string", type: "string" },
            { name: "version", internalType: "string", type: "string" },
            { name: "chainId", internalType: "uint256", type: "uint256" },
            { name: "verifyingContract", internalType: "address", type: "address" },
            { name: "salt", internalType: "bytes32", type: "bytes32" },
            { name: "extensions", internalType: "uint256[]", type: "uint256[]" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "timepoint", internalType: "uint256", type: "uint256" }],
        name: "getPastTotalSupply",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "timepoint", internalType: "uint256", type: "uint256" },
        ],
        name: "getPastVotes",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "getVotes",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "to", internalType: "address", type: "address" },
            { name: "amount", internalType: "uint256", type: "uint256" },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "minter",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "name",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "owner", internalType: "address", type: "address" }],
        name: "nonces",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "account", internalType: "address", type: "address" }],
        name: "numCheckpoints",
        outputs: [{ name: "", internalType: "uint32", type: "uint32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "owner", internalType: "address", type: "address" },
            { name: "spender", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
            { name: "deadline", internalType: "uint256", type: "uint256" },
            { name: "v", internalType: "uint8", type: "uint8" },
            { name: "r", internalType: "bytes32", type: "bytes32" },
            { name: "s", internalType: "bytes32", type: "bytes32" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_newMinter", internalType: "address", type: "address" }],
        name: "setMinter",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", internalType: "string", type: "string" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "to", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "from", internalType: "address", type: "address" },
            { name: "to", internalType: "address", type: "address" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "owner", internalType: "address", type: "address", indexed: true },
            { name: "spender", internalType: "address", type: "address", indexed: true },
            { name: "value", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "Approval",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "delegator", internalType: "address", type: "address", indexed: true },
            { name: "fromDelegate", internalType: "address", type: "address", indexed: true },
            { name: "toDelegate", internalType: "address", type: "address", indexed: true },
        ],
        name: "DelegateChanged",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "delegate", internalType: "address", type: "address", indexed: true },
            { name: "previousVotes", internalType: "uint256", type: "uint256", indexed: false },
            { name: "newVotes", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "DelegateVotesChanged",
    },
    { type: "event", anonymous: false, inputs: [], name: "EIP712DomainChanged" },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "from", internalType: "address", type: "address", indexed: true },
            { name: "to", internalType: "address", type: "address", indexed: true },
            { name: "value", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "Transfer",
    },
    { type: "error", inputs: [], name: "CheckpointUnorderedInsertion" },
    { type: "error", inputs: [], name: "ECDSAInvalidSignature" },
    {
        type: "error",
        inputs: [{ name: "length", internalType: "uint256", type: "uint256" }],
        name: "ECDSAInvalidSignatureLength",
    },
    {
        type: "error",
        inputs: [{ name: "s", internalType: "bytes32", type: "bytes32" }],
        name: "ECDSAInvalidSignatureS",
    },
    {
        type: "error",
        inputs: [
            { name: "increasedSupply", internalType: "uint256", type: "uint256" },
            { name: "cap", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20ExceededSafeSupply",
    },
    {
        type: "error",
        inputs: [
            { name: "spender", internalType: "address", type: "address" },
            { name: "allowance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20InsufficientAllowance",
    },
    {
        type: "error",
        inputs: [
            { name: "sender", internalType: "address", type: "address" },
            { name: "balance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "ERC20InsufficientBalance",
    },
    {
        type: "error",
        inputs: [{ name: "approver", internalType: "address", type: "address" }],
        name: "ERC20InvalidApprover",
    },
    {
        type: "error",
        inputs: [{ name: "receiver", internalType: "address", type: "address" }],
        name: "ERC20InvalidReceiver",
    },
    {
        type: "error",
        inputs: [{ name: "sender", internalType: "address", type: "address" }],
        name: "ERC20InvalidSender",
    },
    {
        type: "error",
        inputs: [{ name: "spender", internalType: "address", type: "address" }],
        name: "ERC20InvalidSpender",
    },
    {
        type: "error",
        inputs: [{ name: "deadline", internalType: "uint256", type: "uint256" }],
        name: "ERC2612ExpiredSignature",
    },
    {
        type: "error",
        inputs: [
            { name: "signer", internalType: "address", type: "address" },
            { name: "owner", internalType: "address", type: "address" },
        ],
        name: "ERC2612InvalidSigner",
    },
    {
        type: "error",
        inputs: [
            { name: "timepoint", internalType: "uint256", type: "uint256" },
            { name: "clock", internalType: "uint48", type: "uint48" },
        ],
        name: "ERC5805FutureLookup",
    },
    { type: "error", inputs: [], name: "ERC6372InconsistentClock" },
    {
        type: "error",
        inputs: [
            { name: "account", internalType: "address", type: "address" },
            { name: "currentNonce", internalType: "uint256", type: "uint256" },
        ],
        name: "InvalidAccountNonce",
    },
    { type: "error", inputs: [], name: "InvalidShortString" },
    { type: "error", inputs: [], name: "NotMinter" },
    {
        type: "error",
        inputs: [
            { name: "bits", internalType: "uint8", type: "uint8" },
            { name: "value", internalType: "uint256", type: "uint256" },
        ],
        name: "SafeCastOverflowedUintDowncast",
    },
    {
        type: "error",
        inputs: [{ name: "str", internalType: "string", type: "string" }],
        name: "StringTooLong",
    },
    {
        type: "error",
        inputs: [{ name: "expiry", internalType: "uint256", type: "uint256" }],
        name: "VotesExpiredSignature",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GovTokenDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const govTokenDeployerAbi = [
    {
        type: "function",
        inputs: [
            { name: "_name", internalType: "string", type: "string" },
            { name: "_symbol", internalType: "string", type: "string" },
            { name: "_minter", internalType: "address", type: "address" },
        ],
        name: "deploy",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "nonpayable",
    },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MeetingComponentsFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_meetingFactoryImpl", internalType: "address", type: "address" },
            { name: "_actionVotingImpl", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "actionVotingImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_subname", internalType: "string", type: "string" },
            { name: "_orgFactory", internalType: "address", type: "address" },
        ],
        name: "deploy",
        outputs: [
            {
                name: "deployment",
                internalType: "struct IMeetingComponentsFactory.Deployment",
                type: "tuple",
                components: [
                    { name: "meetingFactory", internalType: "address", type: "address" },
                    { name: "actionVoting", internalType: "address", type: "address" },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "meetingFactoryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_meetingFactory", internalType: "address", type: "address", indexed: true },
            { name: "_actionVoting", internalType: "address", type: "address", indexed: false },
        ],
        name: "MeetingComponentsDeployed",
    },
    { type: "error", inputs: [], name: "FailedDeployment" },
    {
        type: "error",
        inputs: [
            { name: "balance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "InsufficientBalance",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "MeetingComponentsFactory_OrgNotFound",
    },
    { type: "error", inputs: [], name: "MeetingComponentsFactory_ZeroAddress" },
] as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryAddress = {
    1: "0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25",
    31337: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    11155111: "0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825",
} as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x876C1eDF90e1BcdFC3488a53Ce3EFf1759D27D25)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAd8223B6e9da5Cf0b4aE03d325CC385Fd1f6a825)
 */
export const meetingComponentsFactoryConfig = {
    address: meetingComponentsFactoryAddress,
    abi: meetingComponentsFactoryAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MeetingFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const meetingFactoryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "adoptProposal",
        outputs: [{ name: "_resultId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256" },
            { name: "_tensionHash", internalType: "bytes32", type: "bytes32" },
            { name: "_changeType", internalType: "enum HolacracyTypes.ChangeType", type: "uint8" },
            { name: "_changeData", internalType: "bytes", type: "bytes" },
        ],
        name: "createProposal",
        outputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "discardProposal",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_kind", internalType: "enum IMeetingFactory.MeetingKind", type: "uint8" },
        ],
        name: "endMeeting",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "getObjection",
        outputs: [
            {
                name: "_objection",
                internalType: "struct IMeetingFactory.ObjectionRecord",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "proposalId", internalType: "uint256", type: "uint256" },
                    { name: "objector", internalType: "address", type: "address" },
                    { name: "raisedAt", internalType: "uint64", type: "uint64" },
                    { name: "resolvedAt", internalType: "uint64", type: "uint64" },
                    { name: "concernHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ObjectionStatus",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "getProposal",
        outputs: [
            {
                name: "_proposal",
                internalType: "struct IMeetingFactory.ProposalRecord",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "orgId", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "proposer", internalType: "address", type: "address" },
                    { name: "submittedAt", internalType: "uint64", type: "uint64" },
                    { name: "resolvedAt", internalType: "uint64", type: "uint64" },
                    { name: "proposerRoleId", internalType: "uint256", type: "uint256" },
                    { name: "tensionHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "changeType",
                        internalType: "enum HolacracyTypes.ChangeType",
                        type: "uint8",
                    },
                    {
                        name: "status",
                        internalType: "enum HolacracyTypes.ProposalStatus",
                        type: "uint8",
                    },
                    { name: "changeData", internalType: "bytes", type: "bytes" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgFactory", internalType: "address", type: "address" },
            { name: "_roleRegistry", internalType: "address", type: "address" },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
        ],
        name: "linkProposal",
        outputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "objectionCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "orgFactory",
        outputs: [{ name: "", internalType: "contract IOrganizationFactory", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "proposalCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_concernHash", internalType: "bytes32", type: "bytes32" },
        ],
        name: "raiseObjection",
        outputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256" },
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_outputType", internalType: "enum HolacracyTypes.OutputType", type: "uint8" },
            { name: "_description", internalType: "string", type: "string" },
            { name: "_assignedTo", internalType: "address", type: "address" },
            { name: "_roleId", internalType: "uint256", type: "uint256" },
        ],
        name: "recordOutput",
        outputs: [{ name: "_itemId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "resolveObjection",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistry",
        outputs: [{ name: "", internalType: "contract IRoleRegistry", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_kind", internalType: "enum IMeetingFactory.MeetingKind", type: "uint8" },
        ],
        name: "startMeeting",
        outputs: [{ name: "_meetingId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_kind",
                internalType: "enum IMeetingFactory.MeetingKind",
                type: "uint8",
                indexed: true,
            },
            { name: "_endedBy", internalType: "address", type: "address", indexed: false },
            { name: "_timestamp", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingEnded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_outputType",
                internalType: "enum HolacracyTypes.OutputType",
                type: "uint8",
                indexed: false,
            },
            { name: "_assignedTo", internalType: "address", type: "address", indexed: false },
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_description", internalType: "string", type: "string", indexed: false },
        ],
        name: "MeetingOutputRecorded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_itemId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingProposalLinked",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_meetingId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            {
                name: "_kind",
                internalType: "enum IMeetingFactory.MeetingKind",
                type: "uint8",
                indexed: true,
            },
            { name: "_startedBy", internalType: "address", type: "address", indexed: false },
            { name: "_timestamp", internalType: "uint256", type: "uint256", indexed: false },
        ],
        name: "MeetingStarted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_objector", internalType: "address", type: "address", indexed: true },
            { name: "_concernHash", internalType: "bytes32", type: "bytes32", indexed: false },
        ],
        name: "ObjectionRaised",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_resolvedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ObjectionResolved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_resultId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_adoptedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ProposalAdopted",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_proposer", internalType: "address", type: "address", indexed: false },
            { name: "_proposerRoleId", internalType: "uint256", type: "uint256", indexed: false },
            { name: "_tensionHash", internalType: "bytes32", type: "bytes32", indexed: false },
            { name: "_changeType", internalType: "uint8", type: "uint8", indexed: false },
            { name: "_changeData", internalType: "bytes", type: "bytes", indexed: false },
        ],
        name: "ProposalCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_discardedBy", internalType: "address", type: "address", indexed: false },
        ],
        name: "ProposalDiscarded",
    },
    { type: "error", inputs: [], name: "MeetingFactory_AlreadyInitialized" },
    { type: "error", inputs: [], name: "MeetingFactory_EmptyString" },
    {
        type: "error",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_status", internalType: "enum HolacracyTypes.ObjectionStatus", type: "uint8" },
        ],
        name: "MeetingFactory_InvalidObjectionStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_proposalId", internalType: "uint256", type: "uint256" },
            { name: "_status", internalType: "enum HolacracyTypes.ProposalStatus", type: "uint8" },
        ],
        name: "MeetingFactory_InvalidProposalStatus",
    },
    {
        type: "error",
        inputs: [
            { name: "_objectionId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotObjectorOrAdmin",
    },
    {
        type: "error",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotOrgAdmin",
    },
    {
        type: "error",
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256" },
            { name: "_caller", internalType: "address", type: "address" },
        ],
        name: "MeetingFactory_NotOrgMember",
    },
    {
        type: "error",
        inputs: [{ name: "_objectionId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ObjectionNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_proposalId", internalType: "uint256", type: "uint256" }],
        name: "MeetingFactory_ProposalNotFound",
    },
    { type: "error", inputs: [], name: "MeetingFactory_UnsupportedChangeType" },
] as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrganizationFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "_roleRegistryImpl", internalType: "address", type: "address" },
            { name: "_ensRegistrar", internalType: "address", type: "address" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "ENS_REGISTRAR",
        outputs: [{ name: "", internalType: "contract IENSSubdomainRegistrar", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "TOKEN_DEPLOYER",
        outputs: [{ name: "", internalType: "contract GovTokenDeployer", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "addOrgAdmin",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "addOrgMember",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "requester", internalType: "address", type: "address" },
        ],
        name: "approveJoinRequest",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_subname", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            {
                name: "_tokenConfig",
                internalType: "struct IOrganizationFactory.TokenConfig",
                type: "tuple",
                components: [
                    { name: "tokenName", internalType: "string", type: "string" },
                    { name: "tokenSymbol", internalType: "string", type: "string" },
                    { name: "initialHolders", internalType: "address[]", type: "address[]" },
                    { name: "initialAmounts", internalType: "uint256[]", type: "uint256[]" },
                ],
            },
        ],
        name: "createOrganization",
        outputs: [{ name: "_orgId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_orgId", internalType: "uint256", type: "uint256" }],
        name: "getOrganization",
        outputs: [
            {
                name: "_org",
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
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "getOrganizationBySubname",
        outputs: [
            {
                name: "_org",
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
        inputs: [
            { name: "_offset", internalType: "uint256", type: "uint256" },
            { name: "_limit", internalType: "uint256", type: "uint256" },
        ],
        name: "getOrganizations",
        outputs: [
            {
                name: "_orgs",
                internalType: "struct HolacracyTypes.Organization[]",
                type: "tuple[]",
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
        inputs: [
            { name: "requester", internalType: "address", type: "address" },
            { name: "orgId", internalType: "uint256", type: "uint256" },
        ],
        name: "hasPendingRequest",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "isOrgAdmin",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "isOrgMember",
        outputs: [{ name: "", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "organizationCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "requester", internalType: "address", type: "address" },
        ],
        name: "rejectJoinRequest",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "removeOrgAdmin",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "account", internalType: "address", type: "address" },
        ],
        name: "removeOrgMember",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256" },
            { name: "message", internalType: "string", type: "string" },
        ],
        name: "requestToJoin",
        outputs: [{ name: "requestId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleRegistryImplementation",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "JoinApproved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "JoinRejected",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "requestId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "requester", internalType: "address", type: "address", indexed: true },
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "message", internalType: "string", type: "string", indexed: false },
        ],
        name: "JoinRequested",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "account", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrgAdminAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "account", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrgAdminRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleRegistry", internalType: "address", type: "address", indexed: true },
            { name: "_roleRegistry", internalType: "address", type: "address", indexed: true },
            {
                name: "_governanceProcess",
                internalType: "address",
                type: "address",
                indexed: false,
            },
        ],
        name: "OrgComponentsDeployed",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "account", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrgMemberAdded",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "account", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrgMemberRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_orgId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_subname", internalType: "string", type: "string", indexed: false },
            { name: "_creator", internalType: "address", type: "address", indexed: true },
        ],
        name: "OrganizationCreated",
    },
    { type: "error", inputs: [], name: "FailedDeployment" },
    {
        type: "error",
        inputs: [
            { name: "balance", internalType: "uint256", type: "uint256" },
            { name: "needed", internalType: "uint256", type: "uint256" },
        ],
        name: "InsufficientBalance",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_InvalidSubname",
    },
    {
        type: "error",
        inputs: [
            { name: "requester", internalType: "address", type: "address" },
            { name: "orgId", internalType: "uint256", type: "uint256" },
        ],
        name: "OrganizationFactory_JoinRequestAlreadyPending",
    },
    {
        type: "error",
        inputs: [
            { name: "requester", internalType: "address", type: "address" },
            { name: "orgId", internalType: "uint256", type: "uint256" },
        ],
        name: "OrganizationFactory_JoinRequestNotFound",
    },
    {
        type: "error",
        inputs: [
            { name: "caller", internalType: "address", type: "address" },
            { name: "orgId", internalType: "uint256", type: "uint256" },
        ],
        name: "OrganizationFactory_JoinRequestUnauthorized",
    },
    {
        type: "error",
        inputs: [{ name: "orgId", internalType: "uint256", type: "uint256" }],
        name: "OrganizationFactory_OrgNotFound",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_SubnameAlreadyTaken",
    },
    {
        type: "error",
        inputs: [{ name: "_subname", internalType: "string", type: "string" }],
        name: "OrganizationFactory_SubnameTooShort",
    },
] as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryAddress = {
    1: "0xC0252342923238CF5509cfBd2fa46A45ADeDc921",
    31337: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    11155111: "0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051",
} as const;

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xC0252342923238CF5509cfBd2fa46A45ADeDc921)
 * -
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEdB4Da78b5C759a651a72F8E4cEF07E606FfF051)
 */
export const organizationFactoryConfig = {
    address: organizationFactoryAddress,
    abi: organizationFactoryAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RoleRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const roleRegistryAbi = [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "assignRoleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "createRole",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_circleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "createRoleWithRefs",
        outputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "expandToCircle",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [{ name: "_circleId", internalType: "uint256", type: "uint256" }],
        name: "getCircleRoleIds",
        outputs: [{ name: "_roleIds", internalType: "uint256[]", type: "uint256[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRole",
        outputs: [
            {
                name: "_role",
                internalType: "struct HolacracyTypes.Role",
                type: "tuple",
                components: [
                    { name: "id", internalType: "uint256", type: "uint256" },
                    { name: "circleId", internalType: "uint256", type: "uint256" },
                    { name: "name", internalType: "string", type: "string" },
                    { name: "purpose", internalType: "string", type: "string" },
                    { name: "domains", internalType: "string[]", type: "string[]" },
                    { name: "accountabilities", internalType: "string[]", type: "string[]" },
                    { name: "exists", internalType: "bool", type: "bool" },
                    { name: "isCircle", internalType: "bool", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleAccountabilities",
        outputs: [{ name: "_accountabilities", internalType: "string[]", type: "string[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32" },
        ],
        name: "getRoleContentRef",
        outputs: [
            {
                name: "_ref",
                internalType: "struct HolacracyTypes.ContentRef",
                type: "tuple",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleDomains",
        outputs: [{ name: "_domains", internalType: "string[]", type: "string[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "getRoleLeads",
        outputs: [{ name: "_leads", internalType: "address[]", type: "address[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "governanceProcess",
        outputs: [{ name: "", internalType: "address", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_account", internalType: "address", type: "address" },
        ],
        name: "isRoleLead",
        outputs: [{ name: "_isLead", internalType: "bool", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "removeRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [],
        name: "roleCount",
        outputs: [{ name: "_count", internalType: "uint256", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        inputs: [{ name: "_governanceProcess", internalType: "address", type: "address" }],
        name: "setGovernanceProcess",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "unassignRoleLead",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
        ],
        name: "updateRole",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_name", internalType: "string", type: "string" },
            { name: "_purpose", internalType: "string", type: "string" },
            { name: "_domains", internalType: "string[]", type: "string[]" },
            { name: "_accountabilities", internalType: "string[]", type: "string[]" },
            { name: "_fieldNames", internalType: "bytes32[]", type: "bytes32[]" },
            {
                name: "_refs",
                internalType: "struct HolacracyTypes.ContentRef[]",
                type: "tuple[]",
                components: [
                    { name: "contentHash", internalType: "bytes32", type: "bytes32" },
                    {
                        name: "visibility",
                        internalType: "enum HolacracyTypes.DataVisibility",
                        type: "uint8",
                    },
                ],
            },
        ],
        name: "updateRoleWithRefs",
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_entityType", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_entityId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_fieldName", internalType: "bytes32", type: "bytes32", indexed: true },
            { name: "_contentHash", internalType: "bytes32", type: "bytes32", indexed: false },
            {
                name: "_visibility",
                internalType: "enum HolacracyTypes.DataVisibility",
                type: "uint8",
                indexed: false,
            },
        ],
        name: "ContentRefSet",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_name", internalType: "string", type: "string", indexed: false },
        ],
        name: "RoleCreated",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "RoleExpandedToCircle",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "RoleLeadAssigned",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_lead", internalType: "address", type: "address", indexed: true },
        ],
        name: "RoleLeadUnassigned",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256", indexed: true },
            { name: "_circleId", internalType: "uint256", type: "uint256", indexed: true },
        ],
        name: "RoleRemoved",
    },
    {
        type: "event",
        anonymous: false,
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256", indexed: true }],
        name: "RoleUpdated",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_AlreadyCircle",
    },
    { type: "error", inputs: [], name: "RoleRegistry_AlreadyInitialized" },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "RoleRegistry_AlreadyRoleLead",
    },
    { type: "error", inputs: [], name: "RoleRegistry_ArrayLengthMismatch" },
    { type: "error", inputs: [], name: "RoleRegistry_EmptyName" },
    { type: "error", inputs: [], name: "RoleRegistry_InvalidRole" },
    {
        type: "error",
        inputs: [
            { name: "_roleId", internalType: "uint256", type: "uint256" },
            { name: "_lead", internalType: "address", type: "address" },
        ],
        name: "RoleRegistry_NotRoleLead",
    },
    {
        type: "error",
        inputs: [{ name: "_roleId", internalType: "uint256", type: "uint256" }],
        name: "RoleRegistry_RoleNotFound",
    },
    { type: "error", inputs: [], name: "RoleRegistry_Unauthorized" },
] as const;
