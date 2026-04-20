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
    address roleDataRegistry;
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted once per org when meeting components are deployed.
  event MeetingComponentsDeployed(
    uint256 indexed _orgId, address indexed _meetingFactory, address _actionVoting, address _roleDataRegistry
  );

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error MeetingComponentsFactory_ZeroAddress();
  error MeetingComponentsFactory_OrgNotFound(string _subname);
  error MeetingComponentsFactory_Unauthorized();

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Deploy and initialize MeetingFactory and ActionVoting clones for an org.
  ///         Looks the org up by its ENS subname so this call can be safely batched
  ///         with createOrganization via EIP-5792 wallet_sendCalls — the subname is
  ///         chosen by the user and known at call-encoding time, so there is no
  ///         need to predict an auto-incrementing org ID (which would race against
  ///         any other org created in between the prediction and the batch landing).
  ///         Also wires MeetingFactory as the governance process on the RoleRegistry,
  ///         so governance-adopted proposals can execute structural changes.
  /// @param _subname    Organization ENS subname (same value passed to createOrganization)
  /// @param _orgFactory OrganizationFactory address — source of roleRegistry/govToken and
  ///                    used by the clones for org membership/admin checks
  /// @return deployment Addresses of the deployed clones
  function deploy(
    string calldata _subname,
    address _orgFactory
  ) external returns (Deployment memory deployment);

  /*///////////////////////////////////////////////////////////////
                            VIEW
  //////////////////////////////////////////////////////////////*/

  function meetingFactoryImplementation() external view returns (address);
  function actionVotingImplementation() external view returns (address);
  function roleDataRegistryImplementation() external view returns (address);
}
