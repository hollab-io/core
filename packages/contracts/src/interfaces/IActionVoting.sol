// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IActionVoting
 * @notice Event-driven voting on meeting outputs by GovToken holders and collaborators.
 * @dev Vote tallies are computed off-chain by the indexer from VoteCast events.
 *      On-chain storage is limited to what is needed for verification (double-vote
 *      prevention, weight computation, deadline enforcement).
 */
interface IActionVoting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a vote is created on a meeting output
  event VoteCreated(
    uint256 indexed _voteId,
    uint256 indexed _circleId,
    uint256 indexed _outputId,
    address _proposer,
    uint256 _deadline,
    string _reason,
    uint256 _snapshotBlock
  );

  /// @notice Emitted when a vote is cast
  event VoteCast(uint256 indexed _voteId, address indexed _voter, HolacracyTypes.VoteSupport _support, uint256 _weight);

  /// @notice Emitted when collaborator weight is granted
  event CollaboratorWeightGranted(uint256 indexed _circleId, address indexed _collaborator, uint256 _weight);

  /// @notice Emitted when collaborator weight is revoked
  event CollaboratorWeightRevoked(uint256 indexed _circleId, address indexed _collaborator);

  /// @notice Emitted when a circle's quorum is set
  event CircleQuorumSet(uint256 indexed _circleId, uint256 _quorum);

  /// @notice Emitted when a circle's mint cap is set
  event CircleMintCapSet(uint256 indexed _circleId, uint256 _cap);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error ActionVoting_AlreadyInitialized();
  error ActionVoting_NotCircleLeadOrFacilitator(uint256 _circleId);
  error ActionVoting_VoteNotFound(uint256 _voteId);
  error ActionVoting_VoteNotActive(uint256 _voteId);
  error ActionVoting_AlreadyVoted(uint256 _voteId, address _voter);
  error ActionVoting_ZeroAddress();
  error ActionVoting_ZeroAmount();
  error ActionVoting_InvalidDuration();
  error ActionVoting_EmptyReason();
  error ActionVoting_QuorumNotSet(uint256 _circleId);
  error ActionVoting_MintCapExceeded(uint256 _circleId, uint256 _requested, uint256 _remaining);
  error ActionVoting_NoVotingPower(uint256 _voteId, address _voter);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the voting weight of a voter for a given vote
  function getVoteWeight(
    uint256 _voteId,
    address _voter
  ) external view returns (uint256 _weight);

  /// @notice Returns the collaborator weight for a given circle and address
  function getCollaboratorWeight(
    uint256 _circleId,
    address _collaborator
  ) external view returns (uint256 _weight);

  /// @notice Returns whether a voter has voted on a given vote
  function hasVoted(
    uint256 _voteId,
    address _voter
  ) external view returns (bool _voted);

  /// @notice Returns the quorum for a circle
  function getCircleQuorum(
    uint256 _circleId
  ) external view returns (uint256 _quorum);

  /// @notice Returns the collaborator mint cap for a circle
  function getCircleMintCap(
    uint256 _circleId
  ) external view returns (uint256 _cap);

  /// @notice Returns the total collaborator weight minted for a circle
  function getCircleMintedTotal(
    uint256 _circleId
  ) external view returns (uint256 _total);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Initializes a clone of ActionVoting
  function initialize(
    address _orgFactory,
    address _meetingFactory,
    address _govToken
  ) external;

  /// @notice Creates a vote on a meeting output
  function createVote(
    uint256 _circleId,
    uint256 _outputId,
    string calldata _reason,
    uint256 _duration
  ) external returns (uint256 _voteId);

  /// @notice Casts a vote on an active vote
  function castVote(
    uint256 _voteId,
    HolacracyTypes.VoteSupport _support
  ) external;

  /// @notice Grants collaborator weight for a circle
  function grantCollaboratorWeight(
    uint256 _circleId,
    address _collaborator,
    uint256 _weight
  ) external;

  /// @notice Revokes collaborator weight for a circle
  function revokeCollaboratorWeight(
    uint256 _circleId,
    address _collaborator
  ) external;

  /// @notice Sets the quorum for a circle's action votes
  function setCircleQuorum(
    uint256 _circleId,
    uint256 _quorum
  ) external;

  /// @notice Sets the collaborator mint cap for a circle
  function setCircleMintCap(
    uint256 _circleId,
    uint256 _cap
  ) external;
}
