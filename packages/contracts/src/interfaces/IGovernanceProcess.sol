// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IGovernanceProcess
 * @notice Implements the asynchronous governance proposal flow
 * @dev Based on Holacracy Constitution v5.0, Section 5.3.
 *      Proposals follow the state machine: Draft → Active → Integrating → Adopted/Discarded
 *      Only Circle Members can submit proposals and raise objections within their circle.
 */
interface IGovernanceProcess {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a proposal is submitted
  /// @param _proposalId The proposal ID
  /// @param _circleId The circle the proposal targets
  /// @param _proposer The address that submitted the proposal
  event ProposalSubmitted(uint256 indexed _proposalId, uint256 indexed _circleId, address indexed _proposer);

  /// @notice Emitted when a proposal is activated (moved from Draft to Active)
  /// @param _proposalId The proposal ID
  event ProposalActivated(uint256 indexed _proposalId);

  /// @notice Emitted when an objection is raised against a proposal
  /// @param _objectionId The objection ID
  /// @param _proposalId The proposal being objected to
  /// @param _objector The address raising the objection
  event ObjectionRaised(uint256 indexed _objectionId, uint256 indexed _proposalId, address indexed _objector);

  /// @notice Emitted when an objection is resolved
  /// @param _objectionId The objection ID
  /// @param _proposalId The proposal
  event ObjectionResolved(uint256 indexed _objectionId, uint256 indexed _proposalId);

  /// @notice Emitted when an objection is declared invalid
  /// @param _objectionId The objection ID
  /// @param _proposalId The proposal
  event ObjectionInvalidated(uint256 indexed _objectionId, uint256 indexed _proposalId);

  /// @notice Emitted when a proposal is adopted
  /// @param _proposalId The proposal ID
  event ProposalAdopted(uint256 indexed _proposalId);

  /// @notice Emitted when a proposal is withdrawn by the proposer
  /// @param _proposalId The proposal ID
  event ProposalWithdrawn(uint256 indexed _proposalId);

  /// @notice Emitted when a proposal is discarded
  /// @param _proposalId The proposal ID
  event ProposalDiscarded(uint256 indexed _proposalId);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the caller is not a circle member
  error GovernanceProcess_NotCircleMember(uint256 _circleId, address _caller);

  /// @notice Thrown when a proposal does not exist
  error GovernanceProcess_ProposalNotFound(uint256 _proposalId);

  /// @notice Thrown when a proposal is not in the expected status
  error GovernanceProcess_InvalidProposalStatus(uint256 _proposalId, HolacracyTypes.ProposalStatus _expected);

  /// @notice Thrown when the caller is not the proposer
  error GovernanceProcess_NotProposer(uint256 _proposalId);

  /// @notice Thrown when an objection does not exist
  error GovernanceProcess_ObjectionNotFound(uint256 _objectionId);

  /// @notice Thrown when the tension description is empty
  error GovernanceProcess_EmptyTension();

  /// @notice Thrown when the caller is not the facilitator
  error GovernanceProcess_NotFacilitator(uint256 _circleId);

  /// @notice Thrown when there are unresolved objections
  error GovernanceProcess_UnresolvedObjections(uint256 _proposalId);

  /// @notice Thrown when an objection is not in the expected status
  error GovernanceProcess_InvalidObjectionStatus(uint256 _objectionId, HolacracyTypes.ObjectionStatus _expected);

  /// @notice Thrown when the contract has already been initialized
  error GovernanceProcess_AlreadyInitialized();

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the total number of proposals
  /// @return _count The proposal count
  function proposalCount() external view returns (uint256 _count);

  /// @notice Returns proposal data by ID
  /// @param _proposalId The proposal ID
  /// @return _proposal The proposal data
  function getProposal(uint256 _proposalId) external view returns (HolacracyTypes.Proposal memory _proposal);

  /// @notice Returns objection data by ID
  /// @param _objectionId The objection ID
  /// @return _objection The objection data
  function getObjection(uint256 _objectionId) external view returns (HolacracyTypes.Objection memory _objection);

  /// @notice Returns the objection IDs for a proposal
  /// @param _proposalId The proposal ID
  /// @return _objectionIds The objection IDs
  function getProposalObjections(uint256 _proposalId) external view returns (uint256[] memory _objectionIds);

  /// @notice Returns the proposal IDs for a circle
  /// @param _circleId The circle ID
  /// @return _proposalIds The proposal IDs
  function getCircleProposals(uint256 _circleId) external view returns (uint256[] memory _proposalIds);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Submits a new governance proposal in Draft status
  /// @param _circleId The target circle
  /// @param _proposerRoleId The role the proposer is acting from
  /// @param _tension Description of the tension being addressed
  /// @param _example An example of the actual situation
  /// @param _explanation How the proposal would reduce the tension
  /// @param _change The governance change being proposed
  /// @return _proposalId The created proposal ID
  function submitProposal(
    uint256 _circleId,
    uint256 _proposerRoleId,
    string calldata _tension,
    string calldata _example,
    string calldata _explanation,
    HolacracyTypes.GovernanceChange calldata _change
  ) external returns (uint256 _proposalId);

  /// @notice Activates a draft proposal, opening it for objections
  /// @dev Only callable by the proposer
  /// @param _proposalId The proposal to activate
  function activateProposal(uint256 _proposalId) external;

  /// @notice Raises an objection against an active proposal
  /// @param _proposalId The proposal being objected to
  /// @param _objectorRoleId The role the objector is acting from
  /// @param _concern Description of the concern
  /// @param _isConstitutionalViolation Whether this is a constitutional violation objection
  /// @return _objectionId The created objection ID
  function raiseObjection(
    uint256 _proposalId,
    uint256 _objectorRoleId,
    string calldata _concern,
    bool _isConstitutionalViolation
  ) external returns (uint256 _objectionId);

  /// @notice Resolves an objection with an integration
  /// @dev Only callable by the facilitator of the circle
  /// @param _objectionId The objection to resolve
  /// @param _resolution Description of how the objection was resolved
  function resolveObjection(uint256 _objectionId, string calldata _resolution) external;

  /// @notice Declares an objection invalid after facilitator testing
  /// @dev Only callable by the facilitator of the circle
  /// @param _objectionId The objection to invalidate
  function invalidateObjection(uint256 _objectionId) external;

  /// @notice Adopts a proposal when all objections are resolved
  /// @dev Only callable by the facilitator. Executes the governance change.
  /// @param _proposalId The proposal to adopt
  function adoptProposal(uint256 _proposalId) external;

  /// @notice Withdraws a proposal
  /// @dev Only callable by the proposer
  /// @param _proposalId The proposal to withdraw
  function withdrawProposal(uint256 _proposalId) external;

  /// @notice Discards a proposal
  /// @dev Only callable by the facilitator
  /// @param _proposalId The proposal to discard
  function discardProposal(uint256 _proposalId) external;
}
