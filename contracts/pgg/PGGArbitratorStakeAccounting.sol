/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@galtproject/libs/contracts/collections/ArraySet.sol";
import "./interfaces/IPGGConfig.sol";
import "./interfaces/IPGGArbitratorStakeAccounting.sol";


contract PGGArbitratorStakeAccounting is IPGGArbitratorStakeAccounting {
  using SafeMath for uint256;
  using ArraySet for ArraySet.AddressSet;

  bytes32 public constant ROLE_ARBITRATION_STAKE_SLASHER = bytes32("ARBITRATION_STAKE_SLASHER");

  event ArbitratorStakeDeposit(
    address indexed arbitrator,
    uint256 amount,
    uint256 arbitratorStakeBefore,
    uint256 arbitratorStakeAfter
  );

  event ArbitratorStakeSlash(
    address indexed arbitrator,
    uint256 amount,
    uint256 arbitratorStakeBefore,
    uint256 arbitratorStakeAfter
  );

  uint256 public totalStakes;
  uint256 public periodLengthInSeconds;
  uint256 internal _initialTimestamp;
  IPGGConfig internal pggConfig;
  ArraySet.AddressSet internal arbitrators;

  mapping(address => uint256) _balances;

  modifier onlySlashManager {
    require(
      pggConfig.ggr().getACL().hasRole(msg.sender, ROLE_ARBITRATION_STAKE_SLASHER),
      "Only ARBITRATION_STAKE_SLASHER role allowed"
    );

    _;
  }

  constructor(
    IPGGConfig _pggConfig,
    uint256 _periodLengthInSeconds
  )
    public
  {
    pggConfig = _pggConfig;
    periodLengthInSeconds = _periodLengthInSeconds;
    _initialTimestamp = block.timestamp;
  }

  // EXTERNAL

  function slash(address _arbitrator, uint256 _amount) external onlySlashManager {
    _slash(_arbitrator, _amount);
  }

  function slashMultiple(address[] calldata _arbitrators, uint256[] calldata _amounts) external onlySlashManager {
    assert(_arbitrators.length == _amounts.length);

    for (uint256 i = 0; i < _arbitrators.length; i++) {
      _slash(_arbitrators[i], _amounts[i]);
    }
  }

  function stake(address _arbitrator, uint256 _amount) external {
    require(_amount > 0, "Expect positive amount");

    address multiSig = address(pggConfig.getMultiSig());

    pggConfig.ggr().getGaltToken().transferFrom(msg.sender, multiSig, _amount);

    uint256 arbitratorStakeBefore = _balances[_arbitrator];
    uint256 arbitratorStakeAfter = arbitratorStakeBefore.add(_amount);

    _balances[_arbitrator] = arbitratorStakeAfter;
    // totalStakes += _amount;
    totalStakes = totalStakes.add(_amount);

    emit ArbitratorStakeDeposit(_arbitrator, _amount, arbitratorStakeBefore, arbitratorStakeAfter);
  }

  // INTERNAL

  function _slash(address _arbitrator, uint256 _amount) internal {
    uint256 arbitratorStakeBefore = _balances[_arbitrator];
    uint256 arbitratorStakeAfter = arbitratorStakeBefore.sub(_amount);

    _balances[_arbitrator] = arbitratorStakeAfter;
    // totalStakes -= _amount;
    totalStakes = totalStakes.sub(_amount);

    emit ArbitratorStakeSlash(_arbitrator, _amount, arbitratorStakeBefore, arbitratorStakeAfter);
  }

  // GETTERS

  function getCurrentPeriodAndTotalSupply() external view returns (uint256, uint256) {
    // return (((block.timestamp - _initialTimestamp) / periodLengthInSeconds), totalStakes);
    return (((block.timestamp.sub(_initialTimestamp)) / periodLengthInSeconds), totalStakes);
  }

  function getCurrentPeriod() external view returns (uint256) {
    // return (block.timestamp - _initialTimestamp) / periodLengthInSeconds;
    return (block.timestamp.sub(_initialTimestamp)) / periodLengthInSeconds;
  }

  function balanceOf(address _arbitrator) external view returns (uint256) {
    return _balances[_arbitrator];
  }

  function getInitialTimestamp() external view returns (uint256) {
    return _initialTimestamp;
  }
}
