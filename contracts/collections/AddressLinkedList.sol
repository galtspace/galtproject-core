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

library AddressLinkedList {
  struct Data {
    bool allowDuplicates;
    mapping(address => Node) nodesByIds;
    address headId;
    uint256 count;
  }

  struct Node {
    address prevId;
    address nextId;
  }

  function insertByFoundAndComparator(Data storage data, address newId, address foundId, int8 compareResult) public {
    if (data.headId == 0) {
      data.count += 1;
      
      data.headId = newId;
      return;
    }

    if (compareResult == 0) {
      insertAfter(data, newId, foundId);
    } else if (compareResult < 0) {
      insertAfter(data, newId, foundId);
    } else {
      if (foundId == data.headId) {
        data.count += 1;

        data.nodesByIds[newId].nextId = data.headId;

        data.nodesByIds[data.headId].prevId = newId;
        data.headId = newId;
        return;
      }
      
      insertAfter(data, newId, data.nodesByIds[foundId].prevId);
    }
  }

  function insertAfter(Data storage data, address newId, address prevId) public {
    data.count += 1;

    data.nodesByIds[newId].nextId = data.nodesByIds[prevId].nextId;
    data.nodesByIds[newId].prevId = prevId;

    data.nodesByIds[prevId].nextId = newId;
    if (data.nodesByIds[newId].nextId != 0) {
      data.nodesByIds[data.nodesByIds[newId].nextId].prevId = newId;
    }
  }

  function remove(Data storage data, address id) public {
    if (id == 0) {
      return;
    }
    Node storage node = data.nodesByIds[id];

    if (node.prevId != 0) {
      data.nodesByIds[node.prevId].nextId = node.nextId;
    }
    if (node.nextId != 0) {
      data.nodesByIds[node.nextId].prevId = node.prevId;
    }

    if (id == data.headId) {
      data.headId = node.nextId;
    }

    delete data.nodesByIds[id];
  }

  function swap(Data storage data, address aId, address bId) public {
    Node storage aNode = data.nodesByIds[aId];
    Node storage bNode = data.nodesByIds[bId];
    address aNodePrevId = aNode.prevId;
    address aNodeNextId = aNode.nextId;
    address bNodePrevId = bNode.prevId;
    address bNodeNextId = bNode.nextId;

    if (aNodePrevId == bId) {
      aNode.prevId = aId;
      bNode.nextId = bId;
    } else if (aNodeNextId == bId) {
      aNode.nextId = aId;
      bNode.prevId = bId;
    }

    if (aNodePrevId != 0) {
      data.nodesByIds[aNodePrevId].nextId = bId;
    }
    if (aNodeNextId != 0) {
      data.nodesByIds[aNodeNextId].prevId = bId;
    }
    if (bNodePrevId != 0) {
      data.nodesByIds[bNodePrevId].nextId = aId;
    }
    if (bNodeNextId != 0) {
      data.nodesByIds[bNodeNextId].prevId = aId;
    }

    data.nodesByIds[aId] = bNode;
    data.nodesByIds[bId] = aNode;

    if (data.nodesByIds[aId].prevId == 0) {
      data.headId = aId;
    }
    if (data.nodesByIds[bId].prevId == 0) {
      data.headId = bId;
    }
  }

  function getIndex(Data storage data, address id) public returns (uint256) {
    if (id == 0) {
      require(false, "id not exists in LinkedList");
    }
    address curId = data.headId;
    uint256 index = 0;
    do {
      if (curId == id) {
        return index;
      }
      curId = data.nodesByIds[curId].nextId;
      index++;
    }
    while (true);
  }

  event LogPop(address popId, address headId, uint256 count);
  
  function pop(Data storage data) public returns (address) {
    address popId = data.headId;

    if (data.nodesByIds[popId].nextId != 0) {
      data.nodesByIds[data.nodesByIds[popId].nextId].prevId = 0;
      data.headId = data.nodesByIds[popId].nextId;
    } else {
      data.headId = 0;
    }

    delete data.nodesByIds[popId];
    
    return popId;
  }
}
