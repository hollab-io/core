// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Governor} from 'lib/openzeppelin-contracts/contracts/governance/Governor.sol';
import {GovernorCountingSimple} from 'lib/openzeppelin-contracts/contracts/governance/extensions/GovernorCountingSimple.sol';
import {GovernorSettings} from 'lib/openzeppelin-contracts/contracts/governance/extensions/GovernorSettings.sol';
import {GovernorTimelockControl} from 'lib/openzeppelin-contracts/contracts/governance/extensions/GovernorTimelockControl.sol';
import {GovernorVotes} from 'lib/openzeppelin-contracts/contracts/governance/extensions/GovernorVotes.sol';
import {GovernorVotesQuorumFraction} from 'lib/openzeppelin-contracts/contracts/governance/extensions/GovernorVotesQuorumFraction.sol';
import {TimelockController} from 'lib/openzeppelin-contracts/contracts/governance/TimelockController.sol';
import {IVotes} from 'lib/openzeppelin-contracts/contracts/governance/utils/IVotes.sol';

/// @title HolGovernor
/// @notice OpenZeppelin Governor with timelock, simple counting, and quorum-fraction voting.
///         All governance parameters are set at construction time by the deployer (or factory).
contract HolGovernor is
  Governor,
  GovernorSettings,
  GovernorCountingSimple,
  GovernorVotes,
  GovernorVotesQuorumFraction,
  GovernorTimelockControl
{
  constructor(
    string memory _name,
    IVotes _token,
    TimelockController _timelock,
    uint48 _votingDelay,
    uint32 _votingPeriod,
    uint256 _proposalThreshold,
    uint256 _quorumNumerator
  )
    Governor(_name)
    GovernorSettings(_votingDelay, _votingPeriod, _proposalThreshold)
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(_quorumNumerator)
    GovernorTimelockControl(_timelock)
  {}

  // Resolution order for the duplicate overrides below follows C3 linearisation

  function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.votingDelay();
  }

  function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.votingPeriod();
  }

  function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
    return super.proposalThreshold();
  }

  function quorum(uint256 blockNumber)
    public
    view
    override(Governor, GovernorVotesQuorumFraction)
    returns (uint256)
  {
    return super.quorum(blockNumber);
  }

  function state(uint256 proposalId)
    public
    view
    override(Governor, GovernorTimelockControl)
    returns (ProposalState)
  {
    return super.state(proposalId);
  }

  function proposalNeedsQueuing(uint256 proposalId)
    public
    view
    override(Governor, GovernorTimelockControl)
    returns (bool)
  {
    return super.proposalNeedsQueuing(proposalId);
  }

  function _queueOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
    return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _executeOperations(
    uint256 proposalId,
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(Governor, GovernorTimelockControl) {
    super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _cancel(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
  ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
    return super._cancel(targets, values, calldatas, descriptionHash);
  }

  function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
    return super._executor();
  }
}
