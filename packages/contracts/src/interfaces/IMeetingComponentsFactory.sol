// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IMeetingComponentsFactory
 * @notice Deploys per-org MeetingFactory and ActionVoting clones
 *         in a single transaction and emits a discovery event for off-chain indexers.
 */
interface IMeetingComponentsFactory {
  /*///////////////////////////////////////////////////////////////
                            STRUCTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Addresses of the deployed clones
  struct Deployment {
    address meetingFactory;
    address actionVoting;
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted once per org when meeting components are deployed.
  event MeetingComponentsDeployed(uint256 indexed _orgId, address indexed _meetingFactory, address _actionVoting);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error MeetingComponentsFactory_ZeroAddress();

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Deploy and initialize MeetingFactory and ActionVoting clones for an org.
  ///         Also wires MeetingFactory as the governance process on the RoleRegistry,
  ///         so governance-adopted proposals can execute structural changes.
  /// @param _orgId             Organization ID (from OrganizationFactory)
  /// @param _orgFactory        OrganizationFactory address (for org membership/admin checks)
  /// @param _roleRegistry      RoleRegistry clone address (for governance execution)
  /// @param _govToken          Org governance token (IVotes) — used as ActionVoting vote weight
  /// @return deployment Addresses of the deployed clones
  function deploy(
    uint256 _orgId,
    address _orgFactory,
    address _roleRegistry,
    address _govToken
  ) external returns (Deployment memory deployment);

  /*///////////////////////////////////////////////////////////////
                            VIEW
  //////////////////////////////////////////////////////////////*/

  function meetingFactoryImplementation() external view returns (address);
  function actionVotingImplementation() external view returns (address);
}
