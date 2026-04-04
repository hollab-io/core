// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IMeetingComponentsFactory
 * @notice Deploys per-org TacticalMeeting, GovernanceMeeting, and ActionVoting clones
 *         in a single transaction and emits a discovery event for off-chain indexers.
 */
interface IMeetingComponentsFactory {
  /*///////////////////////////////////////////////////////////////
                            STRUCTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Addresses of the three deployed clones
  struct Deployment {
    address tacticalMeeting;
    address governanceMeeting;
    address actionVoting;
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted once per org when meeting components are deployed.
  ///         Indexed parameters are used by off-chain indexers (e.g. Ponder) to
  ///         auto-discover per-org clone addresses without manual configuration.
  /// @param _orgId          The organization ID (assigned by OrganizationFactory)
  /// @param _tacticalMeeting    Address of the TacticalMeeting clone
  /// @param _governanceMeeting  Address of the GovernanceMeeting clone
  /// @param _actionVoting       Address of the ActionVoting clone
  event MeetingComponentsDeployed(
    uint256 indexed _orgId,
    address indexed _tacticalMeeting,
    address indexed _governanceMeeting,
    address _actionVoting
  );

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error MeetingComponentsFactory_ZeroAddress();

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Deploy and initialize TacticalMeeting, GovernanceMeeting, and ActionVoting
  ///         clones for `_orgId`, wired to the org's existing circle/role/governance contracts.
  /// @param _orgId             Organization ID (from OrganizationFactory)
  /// @param _circleRegistry    Per-org CircleRegistry clone address
  /// @param _roleRegistry      Per-org RoleRegistry clone address
  /// @param _governanceProcess Per-org GovernanceProcess clone address
  /// @param _govToken          Org governance token (IVotes) — used as ActionVoting vote weight
  /// @return deployment Addresses of the three newly deployed clones
  function deploy(
    uint256 _orgId,
    address _circleRegistry,
    address _roleRegistry,
    address _governanceProcess,
    address _govToken
  ) external returns (Deployment memory deployment);

  /*///////////////////////////////////////////////////////////////
                            VIEW
  //////////////////////////////////////////////////////////////*/

  function tacticalMeetingImplementation() external view returns (address);
  function governanceMeetingImplementation() external view returns (address);
  function actionVotingImplementation() external view returns (address);
}
