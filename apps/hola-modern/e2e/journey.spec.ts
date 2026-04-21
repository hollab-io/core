/**
 * E2E tests — core user journey against a live Anvil node.
 *
 * Uses @wonderland/walletless to provide an EIP-1193 wallet and viem for
 * contract calls. Tests the same contract interaction patterns as the React
 * hooks (useJoinRequest, useSendTransaction, etc.) without the UI layer.
 *
 * Anvil is started and contracts are deployed by global-setup.ts.
 *
 * Contract model (post factory/instance split):
 *  - OrganizationFactory: thin directory. createOrganization returns (orgId, instance).
 *    getOrganization(id) → instance address. No membership/admin API lives here.
 *  - OrganizationInstance: per-org clone. Holds admins/members/join-requests/agent
 *    identity + wiring references (roleRegistry, meetingFactory, token, anchorCircleId).
 *  - MeetingComponentsFactory.deploy(subname, orgFactory) emits
 *    MeetingComponentsDeployed(orgId, meetingFactory, actionVoting, roleDataRegistry)
 *    and returns the per-org MeetingFactory + ActionVoting clones.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, PublicClient, WalletClient } from "viem";
import { expect, test } from "@playwright/test";
import { ANVIL_ACCOUNTS, createE2EProvider } from "@wonderland/walletless";
import {
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    encodeAbiParameters,
    getAddress,
    http,
    parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deployed addresses from global-setup ────────────────────────────────────

const addressesPath = resolve(__dirname, ".addresses.json");
let ADDRESSES: { orgFactory: Address; meetingFactory: Address };

const RPC = "http://127.0.0.1:8545";

// Anvil pre-funded accounts
const FOUNDER = privateKeyToAccount(ANVIL_ACCOUNTS[0].privateKey as `0x${string}`);
const ALICE = privateKeyToAccount(ANVIL_ACCOUNTS[1].privateKey as `0x${string}`);
const BOB = privateKeyToAccount(ANVIL_ACCOUNTS[2].privateKey as `0x${string}`);
const CAROL = privateKeyToAccount(ANVIL_ACCOUNTS[3].privateKey as `0x${string}`);

// Every per-org RoleRegistry clone starts its counter at 1, so the anchor circle
// and anchor role are always id=1 within their own org. The anchor role's lead
// is seeded to the org creator at createOrganization time — required to satisfy
// §5.3 Representation Rule when proposing from the anchor circle.
const ANCHOR_CIRCLE_ID = 1n;
const ANCHOR_ROLE_ID = 1n;

// ── ABIs (minimal, matching what the frontend hooks use) ────────────────────

const orgFactoryAbi = parseAbi([
    "function createOrganization(string _subname, string _purpose, (string tokenName, string tokenSymbol, address[] initialHolders, uint256[] initialAmounts) _tokenConfig) external returns (uint256, address)",
    "function getOrganization(uint256 _orgId) external view returns (address)",
    "function getOrganizationBySubname(string _subname) external view returns (address)",
    "function organizationCount() external view returns (uint256)",
    "event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator, address indexed _instance, address _roleRegistry)",
]);

const orgInstanceAbi = parseAbi([
    "function id() external view returns (uint256)",
    "function subname() external view returns (string)",
    "function creator() external view returns (address)",
    "function roleRegistry() external view returns (address)",
    "function meetingFactory() external view returns (address)",
    "function token() external view returns (address)",
    "function anchorCircleId() external view returns (uint256)",
    "function isAdmin(address) external view returns (bool)",
    "function isMember(address) external view returns (bool)",
    "function addAdmin(address) external",
    "function addMember(address) external",
    "function removeMember(address) external",
    "function requestToJoin(string message) external returns (uint256)",
    "function approveJoinRequest(address requester) external",
    "function rejectJoinRequest(address requester) external",
    "function hasPendingRequest(address requester) external view returns (bool)",
    "event MemberAdded(address indexed account)",
    "event JoinRequested(uint256 indexed requestId, address indexed requester, string message)",
    "event JoinApproved(uint256 indexed requestId, address indexed requester)",
]);

const meetingComponentsFactoryAbi = parseAbi([
    "function deploy(string _subname, address _orgFactory) external returns ((address meetingFactory, address actionVoting, address roleDataRegistry))",
    "event MeetingComponentsDeployed(uint256 indexed _orgId, address indexed _meetingFactory, address _actionVoting, address _roleDataRegistry)",
]);

const meetingFactoryAbi = parseAbi([
    "function startMeeting(uint256 _orgId, uint8 _kind) external returns (uint256)",
    "function endMeeting(uint256 _meetingId, uint256 _orgId, uint8 _kind) external",
    "function recordOutput(uint256 _meetingId, uint256 _orgId, uint8 _outputType, string _description, address _assignedTo, uint256 _roleId) external returns (uint256)",
    "event MeetingStarted(uint256 indexed _meetingId, uint256 indexed _orgId, uint8 indexed _kind, address _startedBy, uint256 _timestamp)",
]);

const actionVotingAbi = parseAbi([
    "function setCircleQuorum(uint256 _circleId, uint256 _quorum) external",
    "function setCircleMintCap(uint256 _circleId, uint256 _cap) external",
    "function grantCollaboratorWeight(uint256 _circleId, address _collaborator, uint256 _weight) external",
    "function createVote(uint256 _circleId, uint256 _outputId, string _reason, uint256 _duration) external returns (uint256)",
    "function castVote(uint256 _voteId, uint8 _support) external",
    "function hasVoted(uint256 _voteId, address _voter) external view returns (bool)",
    "function getVoteWeight(uint256 _voteId, address _voter) external view returns (uint256)",
    "function getCircleQuorum(uint256 _circleId) external view returns (uint256)",
    "function getCollaboratorWeight(uint256 _circleId, address _collaborator) external view returns (uint256)",
    "event VoteCreated(uint256 indexed _voteId, uint256 indexed _circleId, uint256 indexed _outputId, address _proposer, uint256 _deadline, string _reason, uint256 _snapshotBlock)",
    "event VoteCast(uint256 indexed _voteId, address indexed _voter, uint8 _support, uint256 _weight)",
]);

const governanceProcessAbi = parseAbi([
    "function createProposal(uint256 _orgId, uint256 _circleId, uint256 _proposerRoleId, bytes32 _tensionHash, uint8 _changeType, bytes _changeData) external returns (uint256 _proposalId)",
    "function adoptProposal(uint256 _proposalId) external returns (uint256 _resultId)",
    "function proposalCount() external view returns (uint256)",
    "function proposalMaxAge() external view returns (uint64)",
    "function setProposalMaxAge(uint64 _newAge) external",
    "event ProposalCreated(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 indexed _circleId, address _proposer, uint256 _proposerRoleId, bytes32 _tensionHash, uint8 _changeType, bytes _changeData)",
    "event ProposalAdopted(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 _resultId, address _adoptedBy)",
    "event ProposalMaxAgeUpdated(uint64 _oldAge, uint64 _newAge, address indexed _by)",
]);

const roleRegistryAbi = parseAbi([
    "function getRole(uint256 _roleId) external view returns ((uint256 id, uint256 circleId, string name, string purpose, string[] domains, string[] accountabilities, bool exists, bool isCircle))",
]);

const erc20Abi = parseAbi([
    "function balanceOf(address) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function delegate(address delegatee) external",
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

function publicClient(): PublicClient {
    return createPublicClient({ chain: foundry, transport: http(RPC) });
}

function walletClient(account: ReturnType<typeof privateKeyToAccount>): WalletClient {
    return createWalletClient({ account, chain: foundry, transport: http(RPC) });
}

const GOV_CONFIG = {
    tokenName: "E2E Token",
    tokenSymbol: "E2E",
    initialHolders: [FOUNDER.address],
    initialAmounts: [1_000_000n * 10n ** 18n],
} as const;

type CreatedOrg = { orgId: bigint; instance: Address };

async function createOrg(
    pub: PublicClient,
    wc: WalletClient,
    subname: string,
    purpose: string,
    tokenConfig: typeof GOV_CONFIG = GOV_CONFIG,
): Promise<CreatedOrg> {
    const hash = await wc.writeContract({
        address: ADDRESSES.orgFactory,
        abi: orgFactoryAbi,
        functionName: "createOrganization",
        args: [subname, purpose, tokenConfig],
        account: wc.account!,
        chain: foundry,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
        try {
            const decoded = decodeEventLog({
                abi: orgFactoryAbi,
                data: log.data,
                topics: log.topics,
            });
            if (decoded.eventName === "OrganizationCreated") {
                return {
                    orgId: decoded.args._orgId,
                    instance: decoded.args._instance,
                };
            }
        } catch {
            // not our event
        }
    }
    throw new Error("OrganizationCreated event not found in createOrganization receipt");
}

type DeployedMeeting = { meetingFactory: Address; actionVoting: Address };

async function deployMeetingComponents(
    pub: PublicClient,
    wc: WalletClient,
    subname: string,
): Promise<DeployedMeeting> {
    const hash = await wc.writeContract({
        address: ADDRESSES.meetingFactory,
        abi: meetingComponentsFactoryAbi,
        functionName: "deploy",
        args: [subname, ADDRESSES.orgFactory],
        account: wc.account!,
        chain: foundry,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    for (const log of receipt.logs) {
        try {
            const decoded = decodeEventLog({
                abi: meetingComponentsFactoryAbi,
                data: log.data,
                topics: log.topics,
            });
            if (decoded.eventName === "MeetingComponentsDeployed") {
                return {
                    meetingFactory: decoded.args._meetingFactory,
                    actionVoting: decoded.args._actionVoting,
                };
            }
        } catch {
            // not our event
        }
    }
    throw new Error("MeetingComponentsDeployed event not found in deploy receipt");
}

// ── Test setup ──────────────────────────────────────────────────────────────

test.beforeAll(() => {
    const raw = readFileSync(addressesPath, "utf-8");
    ADDRESSES = JSON.parse(raw);
});

// ── Walletless provider smoke test ──────────────────────────────────────────

test.describe("Walletless provider", () => {
    test("creates an EIP-1193 provider connected to Anvil", async () => {
        const provider = createE2EProvider({
            chains: [foundry],
            rpcUrls: { [foundry.id]: RPC },
            account: ANVIL_ACCOUNTS[0].privateKey,
        });

        const chainId = await provider.request({ method: "eth_chainId", params: [] });
        expect(parseInt(chainId as string, 16)).toBe(foundry.id);

        const accounts = await provider.request({ method: "eth_accounts", params: [] });
        expect((accounts as string[])[0].toLowerCase()).toBe(FOUNDER.address.toLowerCase());
    });

    test("switches accounts", async () => {
        const provider = createE2EProvider({
            chains: [foundry],
            rpcUrls: { [foundry.id]: RPC },
            account: ANVIL_ACCOUNTS[0].privateKey,
        });

        provider.setSigningAccount(ANVIL_ACCOUNTS[1].privateKey);
        const accounts = await provider.request({ method: "eth_accounts", params: [] });
        expect((accounts as string[])[0].toLowerCase()).toBe(ALICE.address.toLowerCase());
    });
});

// ── Journey 1: Org creation ─────────────────────────────────────────────────

test.describe("Org creation", () => {
    test("creates an organization and verifies on-chain state", async () => {
        const pub = publicClient();
        const wc = walletClient(FOUNDER);

        const { orgId, instance } = await createOrg(pub, wc, "e2e-org", "E2E test org");

        const count = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        // At least 2 (1 from DeployLocal sample + our new one).
        expect(count).toBeGreaterThanOrEqual(2n);
        expect(orgId).toBe(count);

        // Directory lookup returns the same instance address.
        const lookup = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "getOrganization",
            args: [orgId],
        });
        expect(getAddress(lookup)).toBe(getAddress(instance));

        // Instance identity.
        const [subname, creator, token] = await Promise.all([
            pub.readContract({ address: instance, abi: orgInstanceAbi, functionName: "subname" }),
            pub.readContract({ address: instance, abi: orgInstanceAbi, functionName: "creator" }),
            pub.readContract({ address: instance, abi: orgInstanceAbi, functionName: "token" }),
        ]);
        expect(subname).toBe("e2e-org");
        expect(getAddress(creator)).toBe(getAddress(FOUNDER.address));
        expect(token).not.toBe("0x0000000000000000000000000000000000000000");

        // Founder is auto-seeded as admin + member.
        const [isAdmin, isMember] = await Promise.all([
            pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "isAdmin",
                args: [FOUNDER.address],
            }),
            pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "isMember",
                args: [FOUNDER.address],
            }),
        ]);
        expect(isAdmin).toBe(true);
        expect(isMember).toBe(true);
    });
});

// ── Journey 2: Join request flow ────────────────────────────────────────────

test.describe("Join request flow", () => {
    let instance: Address;
    let tokenAddress: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const wc = walletClient(FOUNDER);
        ({ instance } = await createOrg(pub, wc, "join-test", "Join request test"));
        tokenAddress = await pub.readContract({
            address: instance,
            abi: orgInstanceAbi,
            functionName: "token",
        });
    });

    test("Alice requests to join, founder approves", async () => {
        const pub = publicClient();
        const aliceWc = walletClient(ALICE);
        const founderWc = walletClient(FOUNDER);

        const reqReceipt = await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "requestToJoin",
                args: ["Alice wants to contribute"],
                account: ALICE,
                chain: foundry,
            }),
        });
        expect(reqReceipt.status).toBe("success");

        expect(
            await pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "hasPendingRequest",
                args: [ALICE.address],
            }),
        ).toBe(true);

        const approveReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "approveJoinRequest",
                args: [ALICE.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        expect(approveReceipt.status).toBe("success");

        expect(
            await pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "isMember",
                args: [ALICE.address],
            }),
        ).toBe(true);

        expect(
            await pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "hasPendingRequest",
                args: [ALICE.address],
            }),
        ).toBe(false);
    });

    test("Bob requests to join, founder rejects, Bob re-applies", async () => {
        const pub = publicClient();
        const bobWc = walletClient(BOB);
        const founderWc = walletClient(FOUNDER);

        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "requestToJoin",
                args: ["Bob here"],
                account: BOB,
                chain: foundry,
            }),
        });

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "rejectJoinRequest",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        expect(
            await pub.readContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "isMember",
                args: [BOB.address],
            }),
        ).toBe(false);

        const reapplyReceipt = await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "requestToJoin",
                args: ["Second attempt"],
                account: BOB,
                chain: foundry,
            }),
        });
        expect(reapplyReceipt.status).toBe("success");
    });

    test("approve + token transfer batch (mimics useJoinRequest.approveWithTokens)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "approveJoinRequest",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        const tokenAmount = 100n * 10n ** 18n;
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: "transfer",
                args: [BOB.address, tokenAmount],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        const bobBalance = await pub.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [BOB.address],
        });
        expect(bobBalance).toBe(tokenAmount);
    });
});

// ── Journey 3: Meeting lifecycle ────────────────────────────────────────────

test.describe("Meeting lifecycle", () => {
    let orgId: bigint;
    let instance: Address;
    let meetingFactoryAddr: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        ({ orgId, instance } = await createOrg(pub, founderWc, "meeting-e2e", "Meeting e2e test"));
        ({ meetingFactory: meetingFactoryAddr } = await deployMeetingComponents(
            pub,
            founderWc,
            "meeting-e2e",
        ));

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "addMember",
                args: [ALICE.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });
    });

    test("start tactical meeting, record outputs, end meeting", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);

        const startReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: meetingFactoryAddr,
                abi: meetingFactoryAbi,
                functionName: "startMeeting",
                args: [orgId, 0], // Tactical = 0
                account: FOUNDER,
                chain: foundry,
            }),
        });
        expect(startReceipt.status).toBe("success");

        const meetingId = 1n; // first meeting of a fresh per-org MeetingFactory clone

        const outputReceipt = await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: meetingFactoryAddr,
                abi: meetingFactoryAbi,
                functionName: "recordOutput",
                args: [meetingId, orgId, 0, "Build landing page", ALICE.address, 0n],
                account: ALICE,
                chain: foundry,
            }),
        });
        expect(outputReceipt.status).toBe("success");

        const endReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: meetingFactoryAddr,
                abi: meetingFactoryAbi,
                functionName: "endMeeting",
                args: [meetingId, orgId, 0],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        expect(endReceipt.status).toBe("success");
    });

    test("non-member cannot start a meeting", async () => {
        const carolWc = walletClient(CAROL);

        await expect(
            carolWc.writeContract({
                address: meetingFactoryAddr,
                abi: meetingFactoryAbi,
                functionName: "startMeeting",
                args: [orgId, 0],
                account: CAROL,
                chain: foundry,
            }),
        ).rejects.toThrow();
    });
});

// ── Journey 4: Voting with collaborator weight ──────────────────────────────

test.describe("Voting", () => {
    let orgId: bigint;
    let instance: Address;
    let actionVotingAddr: Address;
    let tokenAddress: Address;

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        ({ orgId, instance } = await createOrg(pub, founderWc, "vote-e2e", "Voting e2e test"));
        ({ actionVoting: actionVotingAddr } = await deployMeetingComponents(
            pub,
            founderWc,
            "vote-e2e",
        ));
        tokenAddress = await pub.readContract({
            address: instance,
            abi: orgInstanceAbi,
            functionName: "token",
        });

        // Add Alice as member+admin, Bob as member.
        for (const fn of ["addMember", "addAdmin"] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: instance,
                    abi: orgInstanceAbi,
                    functionName: fn,
                    args: [ALICE.address],
                    account: FOUNDER,
                    chain: foundry,
                }),
            });
        }
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "addMember",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        // Transfer tokens + delegate (ERC20Votes requires self-delegation to accrue weight).
        for (const [account, amount] of [
            [ALICE.address, 200_000n * 10n ** 18n],
            [BOB.address, 100_000n * 10n ** 18n],
        ] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [account, amount],
                    account: FOUNDER,
                    chain: foundry,
                }),
            });
        }
        for (const acct of [FOUNDER, ALICE, BOB]) {
            await pub.waitForTransactionReceipt({
                hash: await walletClient(acct).writeContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: "delegate",
                    args: [acct.address],
                    account: acct,
                    chain: foundry,
                }),
            });
        }

        // Mine a block so the next createVote's snapshotBlock (= block.number - 1) has weight.
        await pub.request({ method: "evm_mine" as never, params: [] as never });

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "setCircleQuorum",
                args: [ANCHOR_CIRCLE_ID, 100_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
    });

    test("create vote, cast votes, verify on-chain state", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "createVote",
                args: [ANCHOR_CIRCLE_ID, 1n, "Should we prioritize the MVP?", 86400n * 3n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        expect(createReceipt.status).toBe("success");

        const voteId = 1n;

        const aliceWeight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getVoteWeight",
            args: [voteId, ALICE.address],
        });
        expect(aliceWeight).toBe(200_000n * 10n ** 18n);

        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1], // For
                account: ALICE,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 0], // Against
                account: BOB,
                chain: foundry,
            }),
        });

        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, ALICE.address],
            }),
        ).toBe(true);
        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, BOB.address],
            }),
        ).toBe(true);
        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, FOUNDER.address],
            }),
        ).toBe(false);

        // Double vote fails.
        await expect(
            aliceWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1],
                account: ALICE,
                chain: foundry,
            }),
        ).rejects.toThrow();

        // Silence unused-var lint for orgId — it's carried by the describe scope for parity
        // with the previous spec and for any future org-scoped assertions.
        expect(orgId).toBeGreaterThan(0n);
        expect(instance).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    test("collaborator with granted weight can vote", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const carolWc = walletClient(CAROL);

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "setCircleMintCap",
                args: [ANCHOR_CIRCLE_ID, 500_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "grantCollaboratorWeight",
                args: [ANCHOR_CIRCLE_ID, CAROL.address, 50_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        const weight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getCollaboratorWeight",
            args: [ANCHOR_CIRCLE_ID, CAROL.address],
        });
        expect(weight).toBe(50_000n * 10n ** 18n);

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "createVote",
                args: [ANCHOR_CIRCLE_ID, 2n, "Community input on roadmap", 86400n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        const voteId = 2n;

        const carolVoteWeight = await pub.readContract({
            address: actionVotingAddr,
            abi: actionVotingAbi,
            functionName: "getVoteWeight",
            args: [voteId, CAROL.address],
        });
        expect(carolVoteWeight).toBe(50_000n * 10n ** 18n);

        await pub.waitForTransactionReceipt({
            hash: await carolWc.writeContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [voteId, 1],
                account: CAROL,
                chain: foundry,
            }),
        });

        expect(
            await pub.readContract({
                address: actionVotingAddr,
                abi: actionVotingAbi,
                functionName: "hasVoted",
                args: [voteId, CAROL.address],
            }),
        ).toBe(true);
    });
});

// ── Journey 5: Data display (sequential fetch + event logs) ─────────────────

test.describe("Data display", () => {
    test("sequentially fetches all organizations (mimics frontend pattern)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Create 3 orgs.
        for (const name of ["display-alpha", "display-beta", "display-gamma"]) {
            await createOrg(pub, founderWc, name, `Purpose for ${name}`);
        }

        // Sequential fetch: count → per-id getOrganization → instance.subname/creator.
        // The factory no longer exposes a batched getOrganizations(offset,limit); the
        // canonical pattern is N cheap directory lookups + per-instance reads.
        const total = await pub.readContract({
            address: ADDRESSES.orgFactory,
            abi: orgFactoryAbi,
            functionName: "organizationCount",
        });
        expect(total).toBeGreaterThanOrEqual(4n); // 1 sample + 3 new

        const allOrgs: { id: bigint; instance: Address; subname: string; creator: Address }[] = [];
        for (let id = 1n; id <= total; id++) {
            const instance = await pub.readContract({
                address: ADDRESSES.orgFactory,
                abi: orgFactoryAbi,
                functionName: "getOrganization",
                args: [id],
            });
            if (instance === "0x0000000000000000000000000000000000000000") continue;
            const [subname, creator] = await Promise.all([
                pub.readContract({
                    address: instance,
                    abi: orgInstanceAbi,
                    functionName: "subname",
                }),
                pub.readContract({
                    address: instance,
                    abi: orgInstanceAbi,
                    functionName: "creator",
                }),
            ]);
            allOrgs.push({ id, instance, subname, creator });
        }

        expect(allOrgs.length).toBe(Number(total));

        const names = allOrgs.map((o) => o.subname);
        expect(names).toContain("display-alpha");
        expect(names).toContain("display-beta");
        expect(names).toContain("display-gamma");

        const ours = allOrgs.filter((o) => o.subname.startsWith("display-"));
        for (const org of ours) {
            expect(getAddress(org.creator)).toBe(getAddress(FOUNDER.address));
        }
    });

    test("reads event logs for join requests and membership changes", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        const { orgId, instance } = await createOrg(
            pub,
            founderWc,
            "events-test",
            "Event log test",
        );
        expect(orgId).toBeGreaterThan(0n);

        // Alice and Bob request to join — events emitted by the instance.
        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "requestToJoin",
                args: ["Alice joining"],
                account: ALICE,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "requestToJoin",
                args: ["Bob joining"],
                account: BOB,
                chain: foundry,
            }),
        });

        const joinLogs = await pub.getLogs({
            address: instance,
            event: {
                type: "event",
                name: "JoinRequested",
                inputs: [
                    { name: "requestId", type: "uint256", indexed: true },
                    { name: "requester", type: "address", indexed: true },
                    { name: "message", type: "string", indexed: false },
                ],
            },
            fromBlock: 0n,
        });
        expect(joinLogs.length).toBe(2);
        expect(joinLogs[0].args.requester?.toLowerCase()).toBe(ALICE.address.toLowerCase());
        expect(joinLogs[1].args.requester?.toLowerCase()).toBe(BOB.address.toLowerCase());
        expect(joinLogs[0].args.message).toBe("Alice joining");
        expect(joinLogs[1].args.message).toBe("Bob joining");

        // Approve Alice, reject Bob.
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "approveJoinRequest",
                args: [ALICE.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "rejectJoinRequest",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        const memberLogs = await pub.getLogs({
            address: instance,
            event: {
                type: "event",
                name: "MemberAdded",
                inputs: [{ name: "account", type: "address", indexed: true }],
            },
            fromBlock: 0n,
        });
        // Founder (auto-seeded) + Alice (approved).
        const memberAddresses = memberLogs.map((l) => l.args.account?.toLowerCase());
        expect(memberAddresses).toContain(FOUNDER.address.toLowerCase());
        expect(memberAddresses).toContain(ALICE.address.toLowerCase());
        expect(memberAddresses).not.toContain(BOB.address.toLowerCase());
    });

    test("reads VoteCast event logs for off-chain tally (mimics indexer)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);
        const bobWc = walletClient(BOB);

        const { instance } = await createOrg(pub, founderWc, "tally-test", "Vote tally test");
        const { actionVoting: avAddr } = await deployMeetingComponents(
            pub,
            founderWc,
            "tally-test",
        );
        const tokenAddr = await pub.readContract({
            address: instance,
            abi: orgInstanceAbi,
            functionName: "token",
        });

        // Add members.
        for (const fn of ["addMember", "addAdmin"] as const) {
            await pub.waitForTransactionReceipt({
                hash: await founderWc.writeContract({
                    address: instance,
                    abi: orgInstanceAbi,
                    functionName: fn,
                    args: [ALICE.address],
                    account: FOUNDER,
                    chain: foundry,
                }),
            });
        }
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: instance,
                abi: orgInstanceAbi,
                functionName: "addMember",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        // Transfer tokens + self-delegate.
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "transfer",
                args: [ALICE.address, 300_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: "transfer",
                args: [BOB.address, 150_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        for (const acct of [FOUNDER, ALICE, BOB]) {
            await pub.waitForTransactionReceipt({
                hash: await walletClient(acct).writeContract({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: "delegate",
                    args: [acct.address],
                    account: acct,
                    chain: foundry,
                }),
            });
        }
        await pub.request({ method: "evm_mine" as never, params: [] as never });

        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "setCircleQuorum",
                args: [ANCHOR_CIRCLE_ID, 100_000n * 10n ** 18n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "createVote",
                args: [ANCHOR_CIRCLE_ID, 1n, "Tally test vote", 86400n],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        await pub.waitForTransactionReceipt({
            hash: await aliceWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 1],
                account: ALICE,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await bobWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 0],
                account: BOB,
                chain: foundry,
            }),
        });
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: avAddr,
                abi: actionVotingAbi,
                functionName: "castVote",
                args: [1n, 1],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        const voteCastLogs = await pub.getLogs({
            address: avAddr,
            event: {
                type: "event",
                name: "VoteCast",
                inputs: [
                    { name: "_voteId", type: "uint256", indexed: true },
                    { name: "_voter", type: "address", indexed: true },
                    { name: "_support", type: "uint8", indexed: false },
                    { name: "_weight", type: "uint256", indexed: false },
                ],
            },
            args: { _voteId: 1n },
            fromBlock: 0n,
        });

        expect(voteCastLogs.length).toBe(3);

        let forVotes = 0n;
        let againstVotes = 0n;
        for (const log of voteCastLogs) {
            if (log.args._support === 1) forVotes += log.args._weight!;
            else if (log.args._support === 0) againstVotes += log.args._weight!;
        }

        // Alice (300k) + Founder voted For, Bob (150k) voted Against.
        expect(forVotes).toBeGreaterThan(againstVotes);
        expect(againstVotes).toBe(150_000n * 10n ** 18n);

        const voteCreatedLogs = await pub.getLogs({
            address: avAddr,
            event: {
                type: "event",
                name: "VoteCreated",
                inputs: [
                    { name: "_voteId", type: "uint256", indexed: true },
                    { name: "_circleId", type: "uint256", indexed: true },
                    { name: "_outputId", type: "uint256", indexed: true },
                    { name: "_proposer", type: "address", indexed: false },
                    { name: "_deadline", type: "uint256", indexed: false },
                    { name: "_reason", type: "string", indexed: false },
                    { name: "_snapshotBlock", type: "uint256", indexed: false },
                ],
            },
            args: { _voteId: 1n },
            fromBlock: 0n,
        });

        expect(voteCreatedLogs.length).toBe(1);
        expect(voteCreatedLogs[0].args._reason).toBe("Tally test vote");
        expect(voteCreatedLogs[0].args._snapshotBlock).toBeGreaterThan(0n);
        expect(voteCreatedLogs[0].args._proposer?.toLowerCase()).toBe(
            FOUNDER.address.toLowerCase(),
        );
    });
});

// ── Journey 6: Multi-org isolation ──────────────────────────────────────────

test.describe("Multi-org isolation", () => {
    test("admin of one org cannot act on another", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);
        const aliceWc = walletClient(ALICE);

        const { instance: org1 } = await createOrg(pub, founderWc, "iso-org1", "Isolation test 1");
        const { instance: org2 } = await createOrg(pub, aliceWc, "iso-org2", "Isolation test 2");

        // Founder is admin of org1 but not org2.
        expect(
            await pub.readContract({
                address: org1,
                abi: orgInstanceAbi,
                functionName: "isAdmin",
                args: [FOUNDER.address],
            }),
        ).toBe(true);
        expect(
            await pub.readContract({
                address: org2,
                abi: orgInstanceAbi,
                functionName: "isAdmin",
                args: [FOUNDER.address],
            }),
        ).toBe(false);

        // Founder cannot add members to org2.
        await expect(
            founderWc.writeContract({
                address: org2,
                abi: orgInstanceAbi,
                functionName: "addMember",
                args: [BOB.address],
                account: FOUNDER,
                chain: foundry,
            }),
        ).rejects.toThrow();
    });
});

// ── Journey 7: Governance proposal lifecycle + ExpandRoleToCircle ───────────

test.describe("Governance proposal lifecycle", () => {
    let orgId: bigint;
    let roleRegistryAddr: Address;
    let perOrgMeetingFactoryAddr: Address;

    const ORG_SUBNAME = "gov-lifecycle-e2e";

    test.beforeAll(async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        const created = await createOrg(
            pub,
            founderWc,
            ORG_SUBNAME,
            "Governance lifecycle test org",
        );
        orgId = created.orgId;

        const [roleRegistry, anchorCircleId] = await Promise.all([
            pub.readContract({
                address: created.instance,
                abi: orgInstanceAbi,
                functionName: "roleRegistry",
            }),
            pub.readContract({
                address: created.instance,
                abi: orgInstanceAbi,
                functionName: "anchorCircleId",
            }),
        ]);
        roleRegistryAddr = roleRegistry;
        // Sanity — every per-org clone seeds its anchor circle at id=1.
        expect(anchorCircleId).toBe(ANCHOR_CIRCLE_ID);

        ({ meetingFactory: perOrgMeetingFactoryAddr } = await deployMeetingComponents(
            pub,
            founderWc,
            ORG_SUBNAME,
        ));
    });

    async function adoptCreateRoleProposal(
        pub: PublicClient,
        wc: WalletClient,
        name: string,
        purpose: string,
        domains: string[],
        accountabilities: string[],
        tensionHashByte: string,
    ): Promise<bigint> {
        const changeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [ANCHOR_CIRCLE_ID, name, purpose, domains, accountabilities],
        );

        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await wc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    ANCHOR_CIRCLE_ID,
                    ANCHOR_ROLE_ID, // Founder is seeded as lead of the anchor role.
                    `0x${tensionHashByte.repeat(32)}` as `0x${string}`,
                    0, // ChangeType.CreateRole
                    changeData,
                ],
                account: wc.account!,
                chain: foundry,
            }),
        });

        let proposalId: bigint | undefined;
        for (const log of createReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") proposalId = decoded.args._proposalId;
            } catch {
                // skip
            }
        }
        expect(proposalId).toBeDefined();

        const adoptReceipt = await pub.waitForTransactionReceipt({
            hash: await wc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [proposalId!],
                account: wc.account!,
                chain: foundry,
            }),
        });

        let newRoleId: bigint | undefined;
        for (const log of adoptReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalAdopted") newRoleId = decoded.args._resultId;
            } catch {
                // skip
            }
        }
        expect(newRoleId).toBeDefined();
        return newRoleId!;
    }

    async function adoptExpandRoleToCircleProposal(
        pub: PublicClient,
        wc: WalletClient,
        roleId: bigint,
        tensionHashByte: string,
    ): Promise<void> {
        const changeData = encodeAbiParameters([{ type: "uint256" }], [roleId]);
        const receipt = await pub.waitForTransactionReceipt({
            hash: await wc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    ANCHOR_CIRCLE_ID,
                    ANCHOR_ROLE_ID,
                    `0x${tensionHashByte.repeat(32)}` as `0x${string}`,
                    12, // ChangeType.ExpandRoleToCircle
                    changeData,
                ],
                account: wc.account!,
                chain: foundry,
            }),
        });

        let proposalId: bigint | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") proposalId = decoded.args._proposalId;
            } catch {
                // skip
            }
        }
        expect(proposalId).toBeDefined();

        await pub.waitForTransactionReceipt({
            hash: await wc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [proposalId!],
                account: wc.account!,
                chain: foundry,
            }),
        });
    }

    test("creates a CreateRole proposal, adopts it, verifies role on-chain", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        const newRoleId = await adoptCreateRoleProposal(
            pub,
            founderWc,
            "E2E Engineer",
            "Build e2e coverage",
            ["e2e suite"],
            ["write tests"],
            "aa",
        );
        expect(newRoleId).toBeGreaterThan(0n);

        const role = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [newRoleId],
        });

        expect(role.exists).toBe(true);
        expect(role.name).toBe("E2E Engineer");
        expect(role.purpose).toBe("Build e2e coverage");
        expect([...role.domains]).toEqual(["e2e suite"]);
        expect([...role.accountabilities]).toEqual(["write tests"]);
        expect(role.isCircle).toBe(false);
    });

    test("creates an ExpandRoleToCircle proposal, adopts it, verifies isCircle=true", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        const targetRoleId = await adoptCreateRoleProposal(
            pub,
            founderWc,
            "Circle Candidate",
            "Will become a circle",
            [],
            [],
            "bb",
        );

        const roleBefore = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [targetRoleId],
        });
        expect(roleBefore.isCircle).toBe(false);

        await adoptExpandRoleToCircleProposal(pub, founderWc, targetRoleId, "cc");

        const roleAfter = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [targetRoleId],
        });
        expect(roleAfter.exists).toBe(true);
        expect(roleAfter.name).toBe("Circle Candidate");
        expect(roleAfter.isCircle).toBe(true);
    });

    test("ExpandRoleToCircle proposal fails if role is already a circle", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        const roleId = await adoptCreateRoleProposal(
            pub,
            founderWc,
            "Already A Circle",
            "Pre-expand role",
            [],
            [],
            "dd",
        );

        await adoptExpandRoleToCircleProposal(pub, founderWc, roleId, "ee");

        const role = await pub.readContract({
            address: roleRegistryAddr,
            abi: roleRegistryAbi,
            functionName: "getRole",
            args: [roleId],
        });
        expect(role.isCircle).toBe(true);

        // Second expand — create succeeds, adopt should revert.
        const secondExpandData = encodeAbiParameters([{ type: "uint256" }], [roleId]);
        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    ANCHOR_CIRCLE_ID,
                    ANCHOR_ROLE_ID,
                    `0x${"ff".repeat(32)}` as `0x${string}`,
                    12,
                    secondExpandData,
                ],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        let secondProposalId: bigint | undefined;
        for (const log of createReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated")
                    secondProposalId = decoded.args._proposalId;
            } catch {
                // skip
            }
        }
        expect(secondProposalId).toBeDefined();

        await expect(
            founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [secondProposalId!],
                account: FOUNDER,
                chain: foundry,
            }),
        ).rejects.toThrow();
    });

    // §5.3 divergence — creating a proposal with _proposerRoleId == 0 is now
    // allowed (attribution is optional). The imposter-claim guard is tested in
    // MeetingFactoryProposals.t.sol; here we just exercise the happy path.
    test("creates a proposal with _proposerRoleId = 0 (no role claim)", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        const changeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [ANCHOR_CIRCLE_ID, "Anonymous Role", "Proposed without role claim", [], []],
        );

        const receipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    ANCHOR_CIRCLE_ID,
                    0n, // ← proposerRoleId omitted; caller proposes as a member
                    `0x${"11".repeat(32)}` as `0x${string}`,
                    0, // ChangeType.CreateRole
                    changeData,
                ],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        let createdRoleId: bigint | undefined;
        let proposerRoleIdEmitted: bigint | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") {
                    createdRoleId = decoded.args._proposalId;
                    proposerRoleIdEmitted = decoded.args._proposerRoleId;
                }
            } catch {
                // skip
            }
        }
        expect(createdRoleId).toBeDefined();
        expect(proposerRoleIdEmitted).toBe(0n);
    });

    // Per-org proposalMaxAge: admin tightens the window, expired proposals revert
    // on adopt. This is the agent-native-divergence #2 end-to-end smoke test.
    test("admin-tightened proposalMaxAge expires proposals as expected", async () => {
        const pub = publicClient();
        const founderWc = walletClient(FOUNDER);

        // Default is 7 days; tighten to 2 hours.
        const TIGHT_WINDOW_SECONDS = 2n * 60n * 60n;
        const setReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "setProposalMaxAge",
                args: [TIGHT_WINDOW_SECONDS],
                account: FOUNDER,
                chain: foundry,
            }),
        });
        expect(setReceipt.status).toBe("success");

        const observedWindow = await pub.readContract({
            address: perOrgMeetingFactoryAddr,
            abi: governanceProcessAbi,
            functionName: "proposalMaxAge",
        });
        expect(observedWindow).toBe(TIGHT_WINDOW_SECONDS);

        // Create a proposal under the new window.
        const changeData = encodeAbiParameters(
            [
                { type: "uint256" },
                { type: "string" },
                { type: "string" },
                { type: "string[]" },
                { type: "string[]" },
            ],
            [ANCHOR_CIRCLE_ID, "Doomed Role", "Will expire", [], []],
        );
        const createReceipt = await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "createProposal",
                args: [
                    orgId,
                    ANCHOR_CIRCLE_ID,
                    ANCHOR_ROLE_ID,
                    `0x${"22".repeat(32)}` as `0x${string}`,
                    0,
                    changeData,
                ],
                account: FOUNDER,
                chain: foundry,
            }),
        });

        let proposalId: bigint | undefined;
        for (const log of createReceipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: governanceProcessAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "ProposalCreated") proposalId = decoded.args._proposalId;
            } catch {
                // skip
            }
        }
        expect(proposalId).toBeDefined();

        // Warp past the window + mine a block so subsequent tx uses new timestamp.
        await pub.request({
            method: "evm_increaseTime" as never,
            params: [Number(TIGHT_WINDOW_SECONDS + 1n)] as never,
        });
        await pub.request({ method: "evm_mine" as never, params: [] as never });

        await expect(
            founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "adoptProposal",
                args: [proposalId!],
                account: FOUNDER,
                chain: foundry,
            }),
        ).rejects.toThrow();

        // Restore the default so other tests in the describe aren't affected.
        // (Playwright serializes, but subsequent tests create fresh proposals —
        // still, leaving state dirty is a recipe for flakes later.)
        await pub.waitForTransactionReceipt({
            hash: await founderWc.writeContract({
                address: perOrgMeetingFactoryAddr,
                abi: governanceProcessAbi,
                functionName: "setProposalMaxAge",
                args: [7n * 24n * 60n * 60n],
                account: FOUNDER,
                chain: foundry,
            }),
        });
    });
});
