// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title HolacracyTypes
 * @notice Shared data types for the Holacracy governance system
 * @dev Derived from Holacracy Constitution v5.0
 */
library HolacracyTypes {
  /*///////////////////////////////////////////////////////////////
                            ENUMS
  //////////////////////////////////////////////////////////////*/

  /// @notice Status of a governance proposal
  enum ProposalStatus {
    Draft,
    Active,
    Integrating,
    Adopted,
    Withdrawn,
    Discarded,
    Escalated
  }

  /// @notice Status of an objection to a proposal
  enum ObjectionStatus {
    Raised,
    Testing,
    Valid,
    Invalid,
    Resolved,
    Abandoned
  }

  /// @notice Type of governance change a proposal enacts
  enum ChangeType {
    CreateRole,
    AmendRole,
    RemoveRole,
    CreatePolicy,
    AmendPolicy,
    RemovePolicy,
    MoveRole,
    Election,
    CreateRoleWithRefs,
    AmendRoleWithRefs,
    CreatePolicyWithRefs,
    AmendPolicyWithRefs
  }

  /// @notice Elected role type within a circle
  enum ElectedRole {
    Facilitator,
    Secretary,
    CircleRep
  }

  /// @notice Visibility tier for off-chain data
  enum DataVisibility {
    Public,
    OrgEncrypted,
    RoleEncrypted
  }

  /// @notice Status of a governance meeting
  enum MeetingStatus {
    Scheduled,
    CheckIn,
    AgendaBuilding,
    Processing,
    Closing,
    Completed,
    Cancelled
  }

  /// @notice Type of agenda item in a governance meeting
  enum AgendaItemType {
    Proposal,
    Election
  }

  /// @notice Processing step within Integrative Decision-Making
  enum IDMStep {
    PresentProposal,
    ClarifyingQuestions,
    ReactionRound,
    ClarifyOption,
    ObjectionRound,
    Integration
  }

  /// @notice Processing step within Integrative Election
  enum ElectionStep {
    DescribeRole,
    Nominate,
    NominationSharing,
    NominationChange,
    MakeProposal,
    ObjectionRound
  }

  /// @notice Status of an agenda item
  enum AgendaItemStatus {
    Pending,
    Active,
    Completed,
    Dropped
  }

  /*///////////////////////////////////////////////////////////////
                            STRUCTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to off-chain encrypted content
  struct ContentRef {
    bytes32 contentHash;
    DataVisibility visibility;
  }

  /// @notice A Role is the fundamental unit of organizational structure
  struct Role {
    uint256 id;
    uint256 circleId;
    string name;
    string purpose;
    string[] domains;
    string[] accountabilities;
    bool exists;
  }

  /// @notice A Policy constrains or grants authority within a circle
  struct Policy {
    uint256 id;
    uint256 circleId;
    string name;
    string body;
    bool exists;
  }

  /// @notice A Circle is a container for organizing roles and policies
  struct Circle {
    uint256 id;
    uint256 parentCircleId;
    uint256 roleId;
    string name;
    string purpose;
    bool isAnchor;
    bool exists;
  }

  /// @notice A governance change proposed within a proposal
  struct GovernanceChange {
    ChangeType changeType;
    uint256 targetId;
    bytes encodedData;
  }

  /// @notice A governance proposal to modify circle structure
  struct Proposal {
    uint256 id;
    uint256 circleId;
    address proposer;
    uint256 proposerRoleId;
    string tension;
    string example;
    string explanation;
    GovernanceChange change;
    ProposalStatus status;
    uint256 createdAt;
    uint256 resolvedAt;
  }

  /// @notice An organization deployed via OrganizationFactory
  struct Organization {
    uint256 id;
    string name;
    string subname;
    address creator;
    address roleRegistry;
    address circleRegistry;
    address governanceProcess;
    address governanceMeeting;
    address accessManager;
    uint256 anchorCircleId;
    uint256 createdAt;
    // On-chain governance
    address governor;
    address token;
    address timelock;
    // Anchor circle treasury
    address treasury;
  }

  /// @notice A governance meeting (§5.4)
  struct GovernanceMeeting {
    uint256 id;
    uint256 circleId;
    address scheduledBy;
    bool isSpecial;
    address requester;
    MeetingStatus status;
    uint256 scheduledAt;
    uint256 startedAt;
    uint256 completedAt;
    uint256 duration;
  }

  /// @notice An agenda item in a governance meeting
  struct GovernanceAgendaItem {
    uint256 id;
    uint256 meetingId;
    address owner;
    string label;
    AgendaItemType itemType;
    AgendaItemStatus status;
    uint256 proposalId;
    ElectedRole electedRole;
    uint256 electionTerm;
  }

  /// @notice Election state during a meeting (§5.3.5)
  struct MeetingElection {
    uint256 agendaItemId;
    uint256 circleId;
    ElectedRole targetRole;
    uint256 term;
    ElectionStep currentStep;
    address proposedCandidate;
    bool completed;
  }

  /// @notice A nomination in an integrative election
  struct Nomination {
    address nominator;
    address candidate;
    bool changed;
    address changedTo;
  }

  /// @notice An objection raised against a proposal
  struct Objection {
    uint256 id;
    uint256 proposalId;
    uint256 objectorRoleId;
    uint256 createdAt;
    bool isConstitutionalViolation;
    ObjectionStatus status;
    address objector;
    string concern;
    string resolution;
  }
}
