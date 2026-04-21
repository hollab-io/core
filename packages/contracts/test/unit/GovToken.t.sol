// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitGovToken is Test {
  GovToken internal _govToken;

  address internal _initialMinter = makeAddr('initialMinter');
  address internal _newMinter = makeAddr('newMinter');
  address internal _recipient = makeAddr('recipient');
  address internal _stranger = makeAddr('stranger');

  function setUp() external {
    _govToken = new GovToken('HolGov', 'HOL', _initialMinter);
  }

  /*///////////////////////////////////////////////////////////////
                          CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  function test_ConstructorSetsMinter() external view {
    // it stores the initial minter
    assertEq(_govToken.minter(), _initialMinter);
  }

  function test_ConstructorSetsNameAndSymbol() external view {
    // it stores name and symbol
    assertEq(_govToken.name(), 'HolGov');
    assertEq(_govToken.symbol(), 'HOL');
  }

  function test_ConstructorStartsWithZeroSupply() external view {
    // it starts with zero total supply
    assertEq(_govToken.totalSupply(), 0);
  }

  /*///////////////////////////////////////////////////////////////
                              MINT
  //////////////////////////////////////////////////////////////*/

  function test_MintWhenCalledByMinter() external {
    uint256 _amount = 1000e18;

    vm.prank(_initialMinter);
    _govToken.mint(_recipient, _amount);

    // it transfers tokens to recipient
    assertEq(_govToken.balanceOf(_recipient), _amount);
    // it increases total supply
    assertEq(_govToken.totalSupply(), _amount);
  }

  function test_MintWhenCalledByNonMinter() external {
    vm.prank(_stranger);

    // it reverts
    vm.expectRevert(GovToken.NotMinter.selector);
    _govToken.mint(_recipient, 1000e18);
  }

  function test_MintZeroAmountByMinter() external {
    vm.prank(_initialMinter);
    _govToken.mint(_recipient, 0);

    // it succeeds and balance remains zero
    assertEq(_govToken.balanceOf(_recipient), 0);
  }

  function test_MintMultipleTimes() external {
    vm.startPrank(_initialMinter);
    _govToken.mint(_recipient, 500e18);
    _govToken.mint(_recipient, 300e18);
    vm.stopPrank();

    // it accumulates balance
    assertEq(_govToken.balanceOf(_recipient), 800e18);
    assertEq(_govToken.totalSupply(), 800e18);
  }

  /*///////////////////////////////////////////////////////////////
                           SET MINTER
  //////////////////////////////////////////////////////////////*/

  function test_SetMinterWhenCalledByMinter() external {
    vm.prank(_initialMinter);
    _govToken.setMinter(_newMinter);

    // it updates the minter
    assertEq(_govToken.minter(), _newMinter);
  }

  function test_SetMinterEmitsMinterChanged() external {
    // it emits OwnershipTransferred (OZ Ownable event) via transferOwnership
    vm.expectEmit(true, true, true, true, address(_govToken));
    emit Ownable.OwnershipTransferred(_initialMinter, _newMinter);

    vm.prank(_initialMinter);
    _govToken.setMinter(_newMinter);
  }

  function test_SetMinterWhenCalledByNonMinter() external {
    vm.prank(_stranger);

    // it reverts
    vm.expectRevert(GovToken.NotMinter.selector);
    _govToken.setMinter(_newMinter);
  }

  function test_SetMinterWithZeroAddressReverts() external {
    vm.prank(_initialMinter);

    // it reverts with ZeroAddress
    vm.expectRevert(GovToken.ZeroAddress.selector);
    _govToken.setMinter(address(0));
  }

  /*///////////////////////////////////////////////////////////////
              MINTER ROLE TRANSFER — BEHAVIORAL CONSEQUENCES
  //////////////////////////////////////////////////////////////*/

  function test_OldMinterCannotMintAfterTransfer() external {
    // transfer minter role away
    vm.prank(_initialMinter);
    _govToken.setMinter(_newMinter);

    // old minter is now unauthorized
    vm.prank(_initialMinter);
    vm.expectRevert(GovToken.NotMinter.selector);
    _govToken.mint(_recipient, 1e18);
  }

  function test_NewMinterCanMintAfterTransfer() external {
    vm.prank(_initialMinter);
    _govToken.setMinter(_newMinter);

    uint256 _amount = 750e18;

    vm.prank(_newMinter);
    _govToken.mint(_recipient, _amount);

    // it mints successfully under new minter
    assertEq(_govToken.balanceOf(_recipient), _amount);
  }

  function test_NewMinterCanTransferRoleFurther() external {
    address _thirdMinter = makeAddr('thirdMinter');

    vm.prank(_initialMinter);
    _govToken.setMinter(_newMinter);

    // it emits OwnershipTransferred for the second transfer
    vm.expectEmit(true, true, true, true, address(_govToken));
    emit Ownable.OwnershipTransferred(_newMinter, _thirdMinter);

    vm.prank(_newMinter);
    _govToken.setMinter(_thirdMinter);

    assertEq(_govToken.minter(), _thirdMinter);
  }

  function test_SetMinterToSameAddressIsAllowed() external {
    // setting minter to itself is not explicitly forbidden
    vm.expectEmit(true, true, true, true, address(_govToken));
    emit Ownable.OwnershipTransferred(_initialMinter, _initialMinter);

    vm.prank(_initialMinter);
    _govToken.setMinter(_initialMinter);

    assertEq(_govToken.minter(), _initialMinter);
  }
}
