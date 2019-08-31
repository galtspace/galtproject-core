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

pragma solidity 0.5.10;

import "@galtproject/geodesic/contracts/utils/GeohashUtils.sol";
import "@galtproject/geodesic/contracts/utils/SegmentUtils.sol";
import "@galtproject/geodesic/contracts/utils/LandUtils.sol";
import "@galtproject/geodesic/contracts/utils/PolygonUtils.sol";
import "../registries/ContourVerificationSourceRegistry.sol";
import "../registries/interfaces/ISpaceGeoDataRegistry.sol";
import "./interfaces/IContourModifierApplication.sol";
import "./ContourVerificationManager.sol";
import "../registries/GaltGlobalRegistry.sol";


library ContourVerificationManagerLib {

  // e-is-h
  function denyWithExistingContourIntersectionProof(
    GaltGlobalRegistry _ggr,
    ContourVerificationManager.Application storage a,
    address _reporter,
    uint256 _existingTokenId,
    uint256 _existingContourSegmentFirstPointIndex,
    uint256 _existingContourSegmentFirstPoint,
    uint256 _existingContourSegmentSecondPoint,
    uint256 _verifyingContourSegmentFirstPointIndex,
    uint256 _verifyingContourSegmentFirstPoint,
    uint256 _verifyingContourSegmentSecondPoint
  )
    external
  {
    require(isSelfUpdateCase(a, _existingTokenId) == false, "Can't reject self-update action");

    ISpaceGeoDataRegistry geoDataRegistry = ISpaceGeoDataRegistry(_ggr.getSpaceGeoDataRegistryAddress());

    uint256[] memory existingTokenContour = geoDataRegistry.getSpaceTokenContour(_existingTokenId);
    ISpaceGeoDataRegistry.SpaceTokenType existingSpaceTokenType = geoDataRegistry.getSpaceTokenType(_existingTokenId);

    _requireSameTokenType(a, existingSpaceTokenType);

    bool intersects = checkContourIntersects(
      a,
      existingTokenContour,
      _existingContourSegmentFirstPointIndex,
      _existingContourSegmentFirstPoint,
      _existingContourSegmentSecondPoint,
      _verifyingContourSegmentFirstPointIndex,
      _verifyingContourSegmentFirstPoint,
      _verifyingContourSegmentSecondPoint
    );

    if (intersects == true) {
      if (existingSpaceTokenType == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        int256 existingTokenHighestPoint = geoDataRegistry.getSpaceTokenHighestPoint(_existingTokenId);
        require(
          checkVerticalIntersects(a, existingTokenContour, existingTokenHighestPoint) == true,
          "No intersection neither among contours nor among heights"
        );
      }
    } else {
      revert("Contours don't intersect");
    }
  }

  // e-in-h
  function denyWithExistingPointInclusionProof(
    GaltGlobalRegistry _ggr,
    ContourVerificationManager.Application storage a,
    address _reporter,
    uint256 _existingTokenId,
    uint256 _verifyingContourPointIndex,
    uint256 _verifyingContourPoint
  )
    external
  {
    require(isSelfUpdateCase(a, _existingTokenId) == false, "Can't reject self-update action");

    ISpaceGeoDataRegistry geoDataRegistry = ISpaceGeoDataRegistry(_ggr.getSpaceGeoDataRegistryAddress());

    uint256[] memory existingTokenContour = geoDataRegistry.getSpaceTokenContour(_existingTokenId);
    ISpaceGeoDataRegistry.SpaceTokenType existingSpaceTokenType = geoDataRegistry.getSpaceTokenType(_existingTokenId);

    _requireSameTokenType(a, existingSpaceTokenType);

    bool isInside = _checkPointInsideContour(
      a,
      existingTokenContour,
      _verifyingContourPointIndex,
      _verifyingContourPoint
    );
    if (isInside == true) {
      if (existingSpaceTokenType == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        int256 existingTokenHighestPoint = geoDataRegistry.getSpaceTokenHighestPoint(_existingTokenId);
        require(
          checkVerticalIntersects(a, existingTokenContour, existingTokenHighestPoint) == true,
          "Contour inclusion/height intersection not found"
        );
      }
    } else {
      revert("Existing contour doesn't include verifying");
    }
  }

  // aa-is-h
  function denyWithApplicationApprovedContourIntersectionProof(
    GaltGlobalRegistry _ggr,
    ContourVerificationManager.Application storage a,
    address _reporter,
    address _applicationContract,
    bytes32 _externalApplicationId,
    uint256 _existingContourSegmentFirstPointIndex,
    uint256 _existingContourSegmentFirstPoint,
    uint256 _existingContourSegmentSecondPoint,
    uint256 _verifyingContourSegmentFirstPointIndex,
    uint256 _verifyingContourSegmentFirstPoint,
    uint256 _verifyingContourSegmentSecondPoint
  )
    external
  {
    ContourVerificationSourceRegistry(_ggr.getContourVerificationSourceRegistryAddress()).requireValid(_applicationContract);
    IContourModifierApplication applicationContract = IContourModifierApplication(_applicationContract);
    require(applicationContract.isCVApplicationApproved(_externalApplicationId), "Not in CVApplicationApproved list");

    _requireSameTokenType(a, applicationContract.getCVSpaceTokenType(_externalApplicationId));

    uint256[] memory existingContour = applicationContract.getCVContour(_externalApplicationId);

    if (checkContourIntersects(
      a,
      existingContour,
      _existingContourSegmentFirstPointIndex,
      _existingContourSegmentFirstPoint,
      _existingContourSegmentSecondPoint,
      _verifyingContourSegmentFirstPointIndex,
      _verifyingContourSegmentFirstPoint,
      _verifyingContourSegmentSecondPoint
    ) == true) {
      if (applicationContract.getCVSpaceTokenType(_externalApplicationId) == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        require(
          checkVerticalIntersects(
            a,
            existingContour,
            applicationContract.getCVHighestPoint(_externalApplicationId)
          ) == true,
          "No intersection neither among contours nor among heights"
        );
      }
    } else {
      revert("Contours don't intersect");
    }
  }

  // aa-in-h
  function denyWithApplicationApprovedPointInclusionProof(
    GaltGlobalRegistry _ggr,
    ContourVerificationManager.Application storage a,
    address _reporter,
    address _applicationContract,
    bytes32 _externalApplicationId,
    uint256 _verifyingContourPointIndex,
    uint256 _verifyingContourPoint
  )
    external
  {
    ContourVerificationSourceRegistry(_ggr.getContourVerificationSourceRegistryAddress()).requireValid(_applicationContract);
    IContourModifierApplication applicationContract = IContourModifierApplication(_applicationContract);
    require(applicationContract.isCVApplicationApproved(_externalApplicationId), "Not in CVApplicationApproved list");

    ISpaceGeoDataRegistry.SpaceTokenType existingSpaceTokenType = applicationContract.getCVSpaceTokenType(_externalApplicationId);

    _requireSameTokenType(a, existingSpaceTokenType);

    bool isInside = _checkPointInsideContour(
      a,
      applicationContract.getCVContour(_externalApplicationId),
      _verifyingContourPointIndex,
      _verifyingContourPoint
    );

    if (isInside == true) {
      if (existingSpaceTokenType == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        require(
          checkVerticalIntersects(
            a,
            applicationContract.getCVContour(_externalApplicationId),
            applicationContract.getCVHighestPoint(_externalApplicationId)
          ) == true,
          "No inclusion neither among contours nor among heights"
        );
      }
    } else {
      revert("Existing contour doesn't include verifying");
    }
  }

  // at-in-h
  function denyInvalidApprovalWithApplicationApprovedTimeoutPointInclusionProof(
    ContourVerificationManager.Application storage a,
    ContourVerificationManager.Application storage existingA,
    address _reporter,
    uint256 _existingCVApplicationId,
    uint256 _verifyingContourPointIndex,
    uint256 _verifyingContourPoint
  )
    external
  {
    require(
      existingA.status == ContourVerificationManager.Status.APPROVAL_TIMEOUT,
      "Expect APPROVAL_TIMEOUT status for existing application"
    );

    IContourModifierApplication existingApplicationContract = IContourModifierApplication(existingA.applicationContract);
    ISpaceGeoDataRegistry.SpaceTokenType existingSpaceTokenType = existingApplicationContract.getCVSpaceTokenType(existingA.externalApplicationId);

    _requireSameTokenType(a, existingSpaceTokenType);

    bool isInside = _checkPointInsideContour(
      a,
      IContourModifierApplication(existingA.applicationContract).getCVContour(existingA.externalApplicationId),
      _verifyingContourPointIndex,
      _verifyingContourPoint
    );

    if (isInside == true) {
      if (existingSpaceTokenType == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        require(
          checkVerticalIntersects(
            a,
            existingApplicationContract.getCVContour(existingA.externalApplicationId),
            existingApplicationContract.getCVHighestPoint(existingA.externalApplicationId)
          ) == true,
          "No inclusion neither among contours nor among heights"
        );
      }
    } else {
      revert("Existing contour doesn't include verifying");
    }
  }

  // at-is-h
  function denyWithApplicationApprovedTimeoutContourIntersectionProof(
    ContourVerificationManager.Application storage a,
    ContourVerificationManager.Application storage existingA,
    address _reporter,
    uint256 _existingCVApplicationId,
    uint256 _existingContourSegmentFirstPointIndex,
    uint256 _existingContourSegmentFirstPoint,
    uint256 _existingContourSegmentSecondPoint,
    uint256 _verifyingContourSegmentFirstPointIndex,
    uint256 _verifyingContourSegmentFirstPoint,
    uint256 _verifyingContourSegmentSecondPoint
  )
    external
  {

    require(
      existingA.status == ContourVerificationManager.Status.APPROVAL_TIMEOUT,
      "Expect APPROVAL_TIMEOUT status for existing application"
    );

    IContourModifierApplication existingApplicationContract = IContourModifierApplication(existingA.applicationContract);
//    ISpaceGeoDataRegistry.SpaceTokenType existingSpaceTokenType = existingApplicationContract.getCVSpaceTokenType(existingA.externalApplicationId);

    _requireSameTokenType(a, existingApplicationContract.getCVSpaceTokenType(existingA.externalApplicationId));

    uint256[] memory existingContour = existingApplicationContract.getCVContour(existingA.externalApplicationId);

    if (checkContourIntersects(
      a,
      existingContour,
      _existingContourSegmentFirstPointIndex,
      _existingContourSegmentFirstPoint,
      _existingContourSegmentSecondPoint,
      _verifyingContourSegmentFirstPointIndex,
      _verifyingContourSegmentFirstPoint,
      _verifyingContourSegmentSecondPoint
    ) == true) {
      if (existingApplicationContract.getCVSpaceTokenType(existingA.externalApplicationId) == ISpaceGeoDataRegistry.SpaceTokenType.ROOM) {
        require(
          checkVerticalIntersects(
            a,
            existingContour,
            existingApplicationContract.getCVHighestPoint(existingA.externalApplicationId)
          ) == true,
          "No intersection neither among contours nor among heights"
        );
      }
    } else {
      revert("Contours don't intersect");
    }
  }

  function filterHeight(uint256[] memory _geohash5zContour)
    public
    pure
    returns (uint256[] memory)
  {
    uint256 len = _geohash5zContour.length;
    uint256[] memory geohash5Contour = new uint256[](len);

    for (uint256 i = 0; i < len; i++) {
      (,uint256 current) = GeohashUtils.geohash5zToGeohash(_geohash5zContour[i]);
      geohash5Contour[i] = current;
    }

    return geohash5Contour;
  }

  function checkContourIntersects(
//    uint256 _aId,
    ContourVerificationManager.Application storage a,
    uint256[] memory _existingTokenContour,
    uint256 _existingContourSegmentFirstPointIndex,
    uint256 _existingContourSegmentFirstPoint,
    uint256 _existingContourSegmentSecondPoint,
    uint256 _verifyingContourSegmentFirstPointIndex,
    uint256 _verifyingContourSegmentFirstPoint,
    uint256 _verifyingContourSegmentSecondPoint
  )
    internal
    returns (bool)
  {
    // Existing Token
    require(
      _contourHasSegment(
        _existingContourSegmentFirstPointIndex,
        _existingContourSegmentFirstPoint,
        _existingContourSegmentSecondPoint,
          filterHeight(_existingTokenContour)
      ),
      "Invalid segment for existing token"
    );

    // Verifying Token
    IContourModifierApplication applicationContract = IContourModifierApplication(a.applicationContract);

    applicationContract.isCVApplicationPending(a.externalApplicationId);
    uint256[] memory verifyingTokenContour = applicationContract.getCVContour(a.externalApplicationId);

    require(
      _contourHasSegment(
        _verifyingContourSegmentFirstPointIndex,
        _verifyingContourSegmentFirstPoint,
        _verifyingContourSegmentSecondPoint,
        verifyingTokenContour
      ),
      "Invalid segment for verifying token"
    );

    return SegmentUtils.segmentsIntersect(
      getLatLonSegment(_existingContourSegmentFirstPoint, _existingContourSegmentSecondPoint),
      getLatLonSegment(_verifyingContourSegmentFirstPoint, _verifyingContourSegmentSecondPoint)
    );
  }

  function _checkPointInsideContour(
    ContourVerificationManager.Application storage a,
    uint256[] memory _existingTokenContour,
    uint256 _verifyingContourPointIndex,
    uint256 _verifyingContourPoint
  )
    internal
    returns (bool)
  {
    // Verifying Token
    IContourModifierApplication applicationContract = IContourModifierApplication(a.applicationContract);

    applicationContract.isCVApplicationPending(a.externalApplicationId);
    uint256[] memory verifyingTokenContour = applicationContract.getCVContour(a.externalApplicationId);

    require(
      verifyingTokenContour[_verifyingContourPointIndex] == _verifyingContourPoint,
      "Invalid point of verifying token"
    );

    return PolygonUtils.isInsideWithoutCache(_verifyingContourPoint, _existingTokenContour);
  }

  function getLatLonSegment(
    uint256 _firstPointGeohash,
    uint256 _secondPointGeohash
  )
    public
    view
    returns (int256[2][2] memory)
  {
    (int256 lat1, int256 lon1) = LandUtils.geohash5ToLatLon(_firstPointGeohash);
    (int256 lat2, int256 lon2) = LandUtils.geohash5ToLatLon(_secondPointGeohash);

    int256[2] memory first = int256[2]([lat1, lon1]);
    int256[2] memory second = int256[2]([lat2, lon2]);

    return int256[2][2]([first, second]);
  }

  function _contourHasSegment(
    uint256 _firstPointIndex,
    uint256 _firstPoint,
    uint256 _secondPoint,
    uint256[] memory _contour
  )
    internal
    returns (bool)
  {
    uint256 len = _contour.length;
    require(len > 0, "Empty contour");
    require(_firstPointIndex < len, "Invalid existing coord index");

    if(_contour[_firstPointIndex] != _firstPoint) {
      return false;
    }

    uint256 secondPointIndex = _firstPointIndex + 1;
    if (secondPointIndex == len) {
      secondPointIndex = 0;
    }

    if(_contour[secondPointIndex] != _secondPoint) {
      return false;
    }

    return true;
  }

  function checkVerticalIntersects(
    ContourVerificationManager.Application storage a,
    uint256[] memory existingContour,
    int256 eHP
  )
    internal
    returns (bool)
  {
    IContourModifierApplication applicationContract = IContourModifierApplication(a.applicationContract);
    uint256[] memory verifyingTokenContour = applicationContract.getCVContour(a.externalApplicationId);
    int256 vHP = applicationContract.getCVHighestPoint(a.externalApplicationId);

    int256 vLP = _getLowestElevation(verifyingTokenContour);
    int256 eLP = _getLowestElevation(verifyingTokenContour);

    if (eHP < vHP && eHP > vLP) {
      return true;
    }

    if (vHP < eHP && vHP > eLP) {
      return true;
    }

    if (eLP < vHP && eLP > vLP) {
      return true;
    }

    if (vLP < eHP && vLP > eLP) {
      return true;
    }

    return false;
  }

  function _getLowestElevation(
    uint256[] memory _contour
  )
    internal
    view
    returns (int256)
  {
    uint256 len = _contour.length;
    int256 theLowest;

    for (uint256 i = 0; i < len; i++) {
      (int256 elevation,) = GeohashUtils.geohash5zToGeohash(_contour[i]);
      if (elevation < theLowest) {
        theLowest = elevation;
      }
    }

    return theLowest;
  }

  function _requireSameTokenType(
    ContourVerificationManager.Application storage a,
    ISpaceGeoDataRegistry.SpaceTokenType _existingSpaceTokenType
  )
    internal
  {
    ISpaceGeoDataRegistry.SpaceTokenType verifyingSpaceTokenType = IContourModifierApplication(a.applicationContract).getCVSpaceTokenType(a.externalApplicationId);
    require(_existingSpaceTokenType == verifyingSpaceTokenType, "Existing/Verifying space token types mismatch");
  }

  function isSelfUpdateCase(ContourVerificationManager.Application storage a, uint256 _existingTokenId) public view returns (bool) {
    (IContourModifierApplication.ContourModificationType modificationType, uint256 spaceTokenId,) = IContourModifierApplication(a.applicationContract).getCVData(a.externalApplicationId);
    if (modificationType == IContourModifierApplication.ContourModificationType.UPDATE) {
      return (spaceTokenId ==_existingTokenId);
    }

    return false;
  }
}