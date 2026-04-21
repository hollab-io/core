// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

library ChangeValidator {
  error MeetingFactory_ChangeCircleMismatch(uint256 proposalCircle, uint256 targetCircle);

  function validate(
    uint256 _proposalCircleId,
    HolacracyTypes.ChangeType _changeType,
    bytes memory _data,
    IRoleRegistry _roleRegistry
  ) internal view {
    uint256 ct = uint256(_changeType);
    if (ct == uint256(HolacracyTypes.ChangeType.CreateRole)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.AmendRole)) {
      _checkRoleCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.RemoveRole)) {
      _checkRoleCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.Election)) {
      (uint256 roleId,,) = abi.decode(_data, (uint256, address, address));
      _checkRoleCircle(_proposalCircleId, roleId, _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.CreateRoleWithRefs)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.AmendRoleWithRefs)) {
      _checkRoleCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.ExpandRoleToCircle)) {
      _checkRoleCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.FacilitatorElection)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.SecretaryElection)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.CreateCircle)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.CreatePolicy)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.AmendPolicy)) {
      _checkPolicyCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.RemovePolicy)) {
      _checkPolicyCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.CreatePolicyWithRefs)) {
      _checkTargetCircle(_proposalCircleId, abi.decode(_data, (uint256)));
    } else if (ct == uint256(HolacracyTypes.ChangeType.AmendPolicyWithRefs)) {
      _checkPolicyCircle(_proposalCircleId, abi.decode(_data, (uint256)), _roleRegistry);
    } else if (ct == uint256(HolacracyTypes.ChangeType.MoveRole)) {
      (uint256 roleId,) = abi.decode(_data, (uint256, uint256));
      _checkRoleCircle(_proposalCircleId, roleId, _roleRegistry);
    }
  }

  function _checkTargetCircle(
    uint256 _proposalCircleId,
    uint256 _targetCircleId
  ) private pure {
    if (_targetCircleId != _proposalCircleId) {
      revert MeetingFactory_ChangeCircleMismatch(_proposalCircleId, _targetCircleId);
    }
  }

  function _checkRoleCircle(
    uint256 _proposalCircleId,
    uint256 _roleId,
    IRoleRegistry _roleRegistry
  ) private view {
    uint256 roleCircleId = _roleRegistry.getRoleCircleId(_roleId);
    if (roleCircleId != _proposalCircleId) {
      revert MeetingFactory_ChangeCircleMismatch(_proposalCircleId, roleCircleId);
    }
  }

  function _checkPolicyCircle(
    uint256 _proposalCircleId,
    uint256 _policyId,
    IRoleRegistry _roleRegistry
  ) private view {
    uint256 policyCircleId = _roleRegistry.getPolicyCircleId(_policyId);
    if (policyCircleId != _proposalCircleId) {
      revert MeetingFactory_ChangeCircleMismatch(_proposalCircleId, policyCircleId);
    }
  }
}
