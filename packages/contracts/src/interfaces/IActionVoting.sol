// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IActionVoting
 * @notice Lightweight voting on tactical meeting outputs by GovToken holders and collaborators
 * @dev Allows circle leads to grant voting weight to external collaborators without
 *      requiring a full governance proposal to mint GovTokens.
 */
interface IActionVoting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a vote is created on a tactical output
  /// @param _voteId The vote ID
  /// @param _circleId The circle the output belongs to
  /// @param _outputId The tactical output being voted on
  /// @param _proposer The address that created the vote
  /// @param _deadline The timestamp when voting ends
  event VoteCreated(
    uint256 indexed _voteId,
    uint256 indexed _circleId,
    uint256 indexed _outputId,
    address _proposer,
    uint256 _deadline
  );

  /// @notice Emitted when a vote is cast
  /// @param _voteId The vote ID
  /// @param _voter The address that cast the vote
  /// @param _support The vote direction
  /// @param _weight The total weight of the vote
  event VoteCast(
    uint256 indexed _voteId, address indexed _voter, HolacracyTypes.VoteSupport _support, uint256 _weight
  );

  /// @notice Emitted when collaborator weight is granted
  /// @param _circleId The circle ID
  /// @param _collaborator The collaborator address
  /// @param _weight The weight granted
  event CollaboratorWeightGranted(uint256 indexed _circleId, address indexed _collaborator, uint256 _weight);

  /// @notice Emitted when collaborator weight is revoked
  /// @param _circleId The circle ID
  /// @param _collaborator The collaborator address
  event CollaboratorWeightRevoked(uint256 indexed _circleId, address indexed _collaborator);

  /// @notice Emitted when a circle's quorum is set
  /// @param _circleId The circle ID
  /// @param _quorum The quorum value
  event CircleQuorumSet(uint256 indexed _circleId, uint256 _quorum);

  /// @notice Emitted when a circle's mint cap is set
  /// @param _circleId The circle ID
  /// @param _cap The mint cap value
  event CircleMintCapSet(uint256 indexed _circleId, uint256 _cap);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the contract has already been initialized
  error ActionVoting_AlreadyInitialized();

  /// @notice Thrown when the caller is not a circle lead or facilitator
  error ActionVoting_NotCircleLeadOrFacilitator(uint256 _circleId);

  /// @notice Thrown when the referenced output does not exist
  error ActionVoting_OutputNotFound(uint256 _outputId);

  /// @notice Thrown when the referenced vote does not exist
  error ActionVoting_VoteNotFound(uint256 _voteId);

  /// @notice Thrown when the vote is not active
  error ActionVoting_VoteNotActive(uint256 _voteId);

  /// @notice Thrown when the voter has already voted
  error ActionVoting_AlreadyVoted(uint256 _voteId, address _voter);

  /// @notice Thrown when address(0) is passed where a valid address is required
  error ActionVoting_ZeroAddress();

  /// @notice Thrown when a zero amount is passed
  error ActionVoting_ZeroAmount();

  /// @notice Thrown when the duration is invalid
  error ActionVoting_InvalidDuration();

  /// @notice Thrown when the reason string is empty
  error ActionVoting_EmptyReason();

  /// @notice Thrown when the circle quorum has not been set
  error ActionVoting_QuorumNotSet(uint256 _circleId);

  /// @notice Thrown when the collaborator mint cap would be exceeded
  error ActionVoting_MintCapExceeded(uint256 _circleId, uint256 _requested, uint256 _remaining);

  /// @notice Thrown when the voter has no voting power
  error ActionVoting_NoVotingPower(uint256 _voteId, address _voter);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns vote data by ID
  /// @param _voteId The vote ID
  /// @return _vote The vote data
  function getVote(uint256 _voteId) external view returns (HolacracyTypes.ActionVote memory _vote);

  /// @notice Returns the computed status of a vote
  /// @param _voteId The vote ID
  /// @return _status The vote status
  function getVoteStatus(uint256 _voteId) external view returns (HolacracyTypes.VoteStatus _status);

  /// @notice Returns the voting weight of a voter for a given vote
  /// @param _voteId The vote ID
  /// @param _voter The voter address
  /// @return _weight The total weight (GovToken past votes + collaborator weight)
  function getVoteWeight(uint256 _voteId, address _voter) external view returns (uint256 _weight);

  /// @notice Returns the vote IDs for a circle
  /// @param _circleId The circle ID
  /// @return _voteIds The vote IDs
  function getCircleVotes(uint256 _circleId) external view returns (uint256[] memory _voteIds);

  /// @notice Returns the collaborator weight for a given circle and address
  /// @param _circleId The circle ID
  /// @param _collaborator The collaborator address
  /// @return _weight The collaborator weight
  function getCollaboratorWeight(uint256 _circleId, address _collaborator) external view returns (uint256 _weight);

  /// @notice Returns whether a voter has voted on a given vote
  /// @param _voteId The vote ID
  /// @param _voter The voter address
  /// @return _voted Whether the voter has voted
  function hasVoted(uint256 _voteId, address _voter) external view returns (bool _voted);

  /// @notice Returns the quorum for a circle
  /// @param _circleId The circle ID
  /// @return _quorum The quorum value
  function getCircleQuorum(uint256 _circleId) external view returns (uint256 _quorum);

  /// @notice Returns the collaborator mint cap for a circle
  /// @param _circleId The circle ID
  /// @return _cap The mint cap
  function getCircleMintCap(uint256 _circleId) external view returns (uint256 _cap);

  /// @notice Returns the total collaborator weight minted for a circle
  /// @param _circleId The circle ID
  /// @return _total The total minted weight
  function getCircleMintedTotal(uint256 _circleId) external view returns (uint256 _total);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Initializes a clone of ActionVoting
  /// @param _circleRegistry The CircleRegistry contract address
  /// @param _tacticalMeeting The TacticalMeeting contract address
  /// @param _govToken The GovToken (IVotes) contract address
  function initialize(address _circleRegistry, address _tacticalMeeting, address _govToken) external;

  /// @notice Creates a vote on a tactical output
  /// @dev Only callable by circle lead or facilitator of the output's circle
  /// @param _outputId The tactical output ID to vote on
  /// @param _reason The reason for creating the vote
  /// @param _duration The voting duration in seconds
  /// @return _voteId The created vote ID
  function createVote(uint256 _outputId, string calldata _reason, uint256 _duration) external returns (uint256 _voteId);

  /// @notice Casts a vote on an active vote
  /// @dev Weight = GovToken getPastVotes(voter, snapshotBlock) + collaboratorWeight[circleId][voter]
  /// @param _voteId The vote ID
  /// @param _support The vote direction (Against, For, Abstain)
  function castVote(uint256 _voteId, HolacracyTypes.VoteSupport _support) external;

  /// @notice Grants collaborator weight for a circle
  /// @dev Only callable by circle lead, capped by circleMintCap
  /// @param _circleId The circle ID
  /// @param _collaborator The collaborator address
  /// @param _weight The weight to grant
  function grantCollaboratorWeight(uint256 _circleId, address _collaborator, uint256 _weight) external;

  /// @notice Revokes collaborator weight for a circle
  /// @dev Only callable by circle lead
  /// @param _circleId The circle ID
  /// @param _collaborator The collaborator address
  function revokeCollaboratorWeight(uint256 _circleId, address _collaborator) external;

  /// @notice Sets the quorum for a circle's action votes
  /// @dev Only callable by circle lead
  /// @param _circleId The circle ID
  /// @param _quorum The quorum value
  function setCircleQuorum(uint256 _circleId, uint256 _quorum) external;

  /// @notice Sets the collaborator mint cap for a circle
  /// @dev Only callable by circle lead
  /// @param _circleId The circle ID
  /// @param _cap The mint cap value
  function setCircleMintCap(uint256 _circleId, uint256 _cap) external;
}
