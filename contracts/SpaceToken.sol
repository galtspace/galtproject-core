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

pragma solidity 0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./traits/Permissionable.sol";
import "./utils/Initializable.sol";


/*
 * SpaceToken contract
 */
contract SpaceToken is ERC721Full, Ownable, Permissionable {
  string public constant ROLE_MINTER = "minter";
  string public constant ROLE_BURNER = "burner";

  event NewSpaceToken(uint256 tokenId, address owner);

  uint256 packTokenIdCounter;

  modifier onlyMinter() {
    require(hasRole(msg.sender, ROLE_MINTER));
    _;
  }

  modifier onlyBurner() {
    require(hasRole(msg.sender, ROLE_BURNER));
    _;
  }

  constructor(
    string name,
    string symbol
  )
    public
    ERC721Full(name, symbol)
  {
  }

  function mint(
    address _to
  )
    external
    onlyMinter
    returns (uint256)
  {
    uint256 _tokenId = generateTokenId();
    super._mint(_to, _tokenId);

    emit NewSpaceToken(_tokenId, _to);

    return _tokenId;
  }

  function burn(uint256 _tokenId) external onlyBurner {
    super._burn(ownerOf(_tokenId), _tokenId);
  }

  function exists(uint256 _tokenId) external returns (bool) {
    return _exists(_tokenId);
  }

  function setTokenURI(
    uint256 _tokenId,
    string _uri
  )
    external
    // TODO: fix later
//    onlyOwnerOf(_tokenId)
  {
    super._setTokenURI(_tokenId, _uri);
  }

  function tokensOfOwner(address _owner) external view returns (uint256[]) {
//    return _ownedTokens[_owner];
  }

  function generateTokenId() internal returns (uint256) {
    return packTokenIdCounter++;
  }
}