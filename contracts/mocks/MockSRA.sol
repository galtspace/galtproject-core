/*
 * Copyright ©️ 2018 Galt•Space Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka),
 * [Dima Starodubcev](https://github.com/xhipster),
 * [Valery Litvin](https://github.com/litvintech) by
 * [Basic Agreement](http://cyb.ai/QmSAWEG5u5aSsUyMNYuX2A2Eaz4kEuoYWUkVBRdmu9qmct:ipfs)).
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) and
 * Galt•Space Society Construction and Terraforming Company by
 * [Basic Agreement](http://cyb.ai/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS:ipfs)).
 */

pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/drafts/Counter.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "../registries/interfaces/ISpaceLockerRegistry.sol";
import "../SpaceReputationAccounting.sol";


contract MockSRA is SpaceReputationAccounting {
  using Counter for Counter.Counter;

  Counter.Counter spaceCounter;

  constructor(
    IERC721 _spaceToken,
    MultiSigRegistry _multiSigRegistry,
    ISpaceLockerRegistry _spaceLockerRegistry
  )
    public
    SpaceReputationAccounting(_spaceToken, _multiSigRegistry, _spaceLockerRegistry)
  {
  }

  function mintHack(address _beneficiary, uint256 _amount) external {
    _mint(_beneficiary, _amount, spaceCounter.next());
  }

  function delegateHack(address _to, address _from, address _owner, uint256 _amount) external {
    _transfer(_to, _from, _owner, _amount);
  }

  function mintAll(address[] calldata _addresses, uint256 _amount) external {
    for (uint256 i = 0; i < _addresses.length; i++) {
      _mint(_addresses[i], _amount, spaceCounter.next());
    }
  }
}