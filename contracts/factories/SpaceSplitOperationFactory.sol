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

pragma solidity 0.5.3;
//pragma experimental ABIEncoderV2;

import "../interfaces/ISpaceSplitOperationFactory.sol";
import "../interfaces/ISpaceToken.sol";
import "../interfaces/ISplitMerge.sol";
import "../SpaceSplitOperation.sol";

contract SpaceSplitOperationFactory is ISpaceSplitOperationFactory {

  ISpaceToken spaceToken;
  ISplitMerge splitMerge;
  
  constructor(ISpaceToken _spaceToken, ISplitMerge _splitMerge) public {
    spaceToken = _spaceToken;
    splitMerge = _splitMerge;
  }

  function build(uint256 _spaceTokenId, uint256[] calldata _clippingContour) external returns (address) {
    SpaceSplitOperation newSplitOperation = new SpaceSplitOperation(
      address(spaceToken),
      address(splitMerge),
      spaceToken.ownerOf(_spaceTokenId),
      _spaceTokenId,
      splitMerge.getPackageContour(_spaceTokenId),
      _clippingContour
    );
    return address(newSplitOperation);
  }
}
