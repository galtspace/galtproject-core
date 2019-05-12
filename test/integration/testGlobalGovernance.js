const GaltToken = artifacts.require('./GaltToken.sol');
const ACL = artifacts.require('./ACL.sol');
const SpaceToken = artifacts.require('./SpaceToken.sol');
const FeeRegistry = artifacts.require('./FeeRegistry.sol');
const MultiSigRegistry = artifacts.require('./MultiSigRegistry.sol');
const ClaimManager = artifacts.require('./ClaimManager.sol');
const SpaceRA = artifacts.require('./SpaceRA.sol');
const GaltRA = artifacts.require('./GaltRA.sol');
const LockerRegistry = artifacts.require('./LockerRegistry.sol');
const GaltGlobalRegistry = artifacts.require('./GaltGlobalRegistry.sol');
const SpaceLockerFactory = artifacts.require('./SpaceLockerFactory.sol');
const GaltLockerFactory = artifacts.require('./GaltLockerFactory.sol');
const StakeTracker = artifacts.require('./StakeTracker.sol');
const OwnedUpgradeabilityProxy = artifacts.require('./OwnedUpgradeabilityProxy.sol');
const GlobalGovernance = artifacts.require('./GlobalGovernance.sol');
// eslint-disable-next-line
const MockGlobalGovernance_V2 = artifacts.require('./MockGlobalGovernance_V2.sol');

const Web3 = require('web3');

GlobalGovernance.numberFormat = 'String';
MockGlobalGovernance_V2.numberFormat = 'String';
OwnedUpgradeabilityProxy.numberFormat = 'String';
StakeTracker.numberFormat = 'String';
GaltRA.numberFormat = 'String';
SpaceRA.numberFormat = 'String';

const { assertRevert, ether, initHelperWeb3, deploySplitMergeMock, paymentMethods } = require('../helpers');
const { deployMultiSigFactory } = require('../deploymentHelpers');
const globalGovernanceHelpers = require('../globalGovernanceHelpers');

const { utf8ToHex } = Web3.utils;
const bytes32 = utf8ToHex;
const web3 = new Web3(GaltToken.web3.currentProvider);

initHelperWeb3(web3);

// NOTICE: uncomment one of below for tests
// const { log } = console;
const log = function() {};

contract('GlobalGovernance', accounts => {
  const [
    coreTeam,
    minter,
    oracleModifier,
    geoDataManager,
    claimManagerAddress,

    // initial arbitrators
    a1,
    a2,
    a3,

    // arbitrators
    alice,
    bob,
    charlie,
    dan,
    eve,
    frank,
    george,
    hannah,
    mike,
    nick,
    oliver,

    // oracles
    xander,
    yan,
    zack
  ] = accounts;

  beforeEach(async function() {
    // Setup Galt token
    await (async () => {
      this.galtToken = await GaltToken.new({ from: coreTeam });

      await this.galtToken.mint(alice, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(bob, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(charlie, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(dan, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(eve, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(frank, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(george, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(hannah, ether(10000000), { from: coreTeam });

      await this.galtToken.mint(mike, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(nick, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(oliver, ether(10000000), { from: coreTeam });

      await this.galtToken.mint(zack, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(zack, ether(10000000), { from: coreTeam });
      await this.galtToken.mint(zack, ether(10000000), { from: coreTeam });
    })();

    // Create and initialize contracts
    await (async () => {
      this.spaceToken = await SpaceToken.new('Space Token', 'SPACE', { from: coreTeam });
      this.claimManager = await ClaimManager.new({ from: coreTeam });
      this.ggr = await GaltGlobalRegistry.new({ from: coreTeam });
      this.acl = await ACL.new({ from: coreTeam });
      const deployment = await deploySplitMergeMock(this.ggr);
      this.splitMerge = deployment.splitMerge;

      this.globalGovernance = await GlobalGovernance.new({ from: coreTeam });
      this.feeRegistry = await FeeRegistry.new({ from: coreTeam });
      this.stakeTracker = await StakeTracker.new(this.ggr.address, { from: coreTeam });
      this.multiSigRegistry = await MultiSigRegistry.new(this.ggr.address, { from: coreTeam });
      this.spaceLockerRegistry = await LockerRegistry.new(this.ggr.address, bytes32('SPACE_LOCKER_REGISTRAR'), {
        from: coreTeam
      });
      this.galtLockerRegistry = await LockerRegistry.new(this.ggr.address, bytes32('GALT_LOCKER_REGISTRAR'), {
        from: coreTeam
      });
      this.spaceLockerFactory = await SpaceLockerFactory.new(this.ggr.address, { from: coreTeam });
      this.galtLockerFactory = await GaltLockerFactory.new(this.ggr.address, { from: coreTeam });

      this.globalGovernance.initialize(this.ggr.address, 750000, 750000, { from: coreTeam });

      await this.spaceToken.addRoleTo(minter, 'minter', {
        from: coreTeam
      });

      this.spaceRA = await SpaceRA.new(this.ggr.address, { from: coreTeam });
      this.galtRA = await GaltRA.new(this.ggr.address, { from: coreTeam });

      await this.ggr.setContract(await this.ggr.ACL(), this.acl.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.GALT_TOKEN(), this.galtToken.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.SPACE_TOKEN(), this.spaceToken.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.FEE_REGISTRY(), this.feeRegistry.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.STAKE_TRACKER(), this.stakeTracker.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.MULTI_SIG_REGISTRY(), this.multiSigRegistry.address, {
        from: coreTeam
      });
      await this.ggr.setContract(await this.ggr.GALT_TOKEN(), this.galtToken.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.CLAIM_MANAGER(), claimManagerAddress, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.GLOBAL_GOVERNANCE(), this.globalGovernance.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.SPACE_LOCKER_REGISTRY(), this.spaceLockerRegistry.address, {
        from: coreTeam
      });
      await this.ggr.setContract(await this.ggr.GALT_LOCKER_REGISTRY(), this.galtLockerRegistry.address, {
        from: coreTeam
      });
      await this.ggr.setContract(await this.ggr.SPACE_RA(), this.spaceRA.address, { from: coreTeam });
      await this.ggr.setContract(await this.ggr.GALT_RA(), this.galtRA.address, { from: coreTeam });

      this.multiSigFactory = await deployMultiSigFactory(this.ggr, coreTeam);

      await this.acl.setRole(bytes32('ARBITRATION_STAKE_SLASHER'), this.claimManager.address, true, { from: coreTeam });
      await this.acl.setRole(bytes32('ORACLE_STAKE_SLASHER'), this.claimManager.address, true, { from: coreTeam });
      await this.acl.setRole(bytes32('ORACLE_MODIFIER'), oracleModifier, true, { from: coreTeam });
      await this.acl.setRole(bytes32('MULTI_SIG_REGISTRAR'), this.multiSigFactory.address, true, { from: coreTeam });
      await this.acl.setRole(bytes32('SPACE_REPUTATION_NOTIFIER'), this.spaceRA.address, true, { from: coreTeam });
      await this.acl.setRole(bytes32('GALT_REPUTATION_NOTIFIER'), this.galtRA.address, true, { from: coreTeam });
      await this.acl.setRole(bytes32('SPACE_LOCKER_REGISTRAR'), this.spaceLockerFactory.address, true, {
        from: coreTeam
      });
      await this.acl.setRole(bytes32('GALT_LOCKER_REGISTRAR'), this.galtLockerFactory.address, true, {
        from: coreTeam
      });
      await this.acl.setRole(bytes32('GEO_DATA_MANAGER'), geoDataManager, true, { from: coreTeam });

      await this.feeRegistry.setGaltFee(await this.multiSigFactory.FEE_KEY(), ether(10), { from: coreTeam });
      await this.feeRegistry.setEthFee(await this.multiSigFactory.FEE_KEY(), ether(5), { from: coreTeam });
      await this.feeRegistry.setPaymentMethod(await this.multiSigFactory.FEE_KEY(), paymentMethods.ETH_AND_GALT, {
        from: coreTeam
      });
      await this.feeRegistry.setGaltFee(await this.spaceLockerFactory.FEE_KEY(), ether(10), { from: coreTeam });
      await this.feeRegistry.setEthFee(await this.spaceLockerFactory.FEE_KEY(), ether(5), { from: coreTeam });
      await this.feeRegistry.setPaymentMethod(await this.spaceLockerFactory.FEE_KEY(), paymentMethods.ETH_AND_GALT, {
        from: coreTeam
      });
      await this.feeRegistry.setGaltFee(await this.galtLockerFactory.FEE_KEY(), ether(10), { from: coreTeam });
      await this.feeRegistry.setEthFee(await this.galtLockerFactory.FEE_KEY(), ether(5), { from: coreTeam });
      await this.feeRegistry.setPaymentMethod(await this.galtLockerFactory.FEE_KEY(), paymentMethods.ETH_AND_GALT, {
        from: coreTeam
      });

      await this.claimManager.initialize(this.ggr.address, {
        from: coreTeam
      });
    })();
  });

  describe('self-upgrade', () => {
    it('should allow self-upgrade logic using proxy', async function() {
      const proxy = await OwnedUpgradeabilityProxy.new({ from: alice });
      let globalGovernance = await GlobalGovernance.at(proxy.address);

      const globalGovernanceV1 = await GlobalGovernance.new({ from: coreTeam });
      const txData1 = globalGovernanceV1.contract.methods.initialize(this.ggr.address, 75000, 75000).encodeABI();
      await proxy.upgradeToAndCall(globalGovernanceV1.address, txData1, { from: alice });
      await proxy.transferProxyOwnership(globalGovernance.address, { from: alice });

      await this.ggr.setContract(await this.ggr.GLOBAL_GOVERNANCE(), globalGovernance.address, { from: coreTeam });

      const { seedArbitration } = globalGovernanceHelpers(
        this.galtToken,
        this.spaceToken,
        this.spaceRA,
        this.galtRA,
        this.splitMerge,
        this.spaceLockerFactory,
        this.galtLockerFactory,
        [a1, a2, a3],
        minter,
        oracleModifier,
        geoDataManager,
        alice,
        log
      );

      await this.galtToken.approve(this.multiSigFactory.address, ether(100), { from: alice });

      this.abM = await seedArbitration(
        this.multiSigFactory,
        alice,
        [alice, bob, charlie, dan],
        [bob, george, hannah, mike],
        [xander, bob],
        500,
        200,
        200
      );

      log('M weight', (await globalGovernance.getMultiSigWeight(this.abM.multiSig.address)).weight);

      // Step #1. Create proposal for an increased threshold for add2ggr change to 95% instead of default 75%
      const globalGovernanceV2 = await MockGlobalGovernance_V2.new({ from: coreTeam });
      const upgradeBytecode = await proxy.contract.methods.upgradeTo(globalGovernanceV2.address).encodeABI();

      // we want to vote to transfer it back to the coreTeam
      let res = await this.abM.createGlobalProposalProposalManager.propose(
        globalGovernance.address,
        '0',
        upgradeBytecode,
        'back to centralization',
        { from: alice }
      );
      let { proposalId } = res.logs[0].args;

      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: bob });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.createGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.createGlobalProposalProposalManager.getProposal(proposalId);
      const globalProposalId = res.globalId;

      // Step #2. Create support proposal and accept it
      res = await this.abM.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
        from: alice
      });
      // eslint-disable-next-line
      proposalId = res.logs[0].args.proposalId;

      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: bob });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: george });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: xander });

      await this.abM.supportGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.config.globalProposalSupport(globalProposalId);
      assert.equal(true, res);

      // Step #3. Now accept the proposal and check that #foo() method works correctly
      globalGovernance = await MockGlobalGovernance_V2.at(proxy.address);
      await assertRevert(globalGovernance.foo());

      await globalGovernance.trigger(globalProposalId);

      res = await globalGovernance.foo();
      assert.equal(res, 'bar');
    });
  });

  describe('#setThreshold()', () => {
    it('should apply custom threshold if one exists', async function() {
      await this.ggr.transferOwnership(this.globalGovernance.address, { from: coreTeam });
      const { seedArbitration } = globalGovernanceHelpers(
        this.galtToken,
        this.spaceToken,
        this.spaceRA,
        this.galtRA,
        this.splitMerge,
        this.spaceLockerFactory,
        this.galtLockerFactory,
        [a1, a2, a3],
        minter,
        oracleModifier,
        geoDataManager,
        alice,
        log
      );

      await this.galtToken.approve(this.multiSigFactory.address, ether(100), { from: alice });

      this.abM = await seedArbitration(
        this.multiSigFactory,
        alice,
        [alice, bob, charlie, dan],
        [bob, george, hannah, mike],
        [xander, bob],
        500,
        200,
        200
      );

      this.abN = await seedArbitration(
        this.multiSigFactory,
        alice,
        [bob, charlie, dan, eve],
        [george, hannah, mike, nick],
        [yan, zack],
        10,
        30,
        0
      );
      log('M weight', (await this.globalGovernance.getMultiSigWeight(this.abM.multiSig.address)).weight);
      log('N weight', (await this.globalGovernance.getMultiSigWeight(this.abN.multiSig.address)).weight);

      // Step #1. Create proposal for an increased threshold for add2ggr change to 95% instead of default 75%
      const signatureHash = await this.ggr.contract.methods
        .setContract(bytes32(''), alice)
        .encodeABI()
        .substr(0, 10);

      // console.log('signatureHash >>>', signatureHash);
      const marker = await this.globalGovernance.getMarker(this.ggr.address, signatureHash);
      // console.log('marker >>>', marker);
      const increaseThreshold = this.globalGovernance.contract.methods.setThreshold(marker, 950000).encodeABI();

      // we want to vote to transfer it back to the coreTeam
      let res = await this.abM.createGlobalProposalProposalManager.propose(
        this.globalGovernance.address,
        '0',
        increaseThreshold,
        'back to centralization',
        { from: alice }
      );
      let { proposalId } = res.logs[0].args;

      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: bob });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.createGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.createGlobalProposalProposalManager.getProposal(proposalId);
      let globalProposalId = res.globalId;

      // Step #2. Create support proposal and accept it
      res = await this.abM.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
        from: alice
      });
      // eslint-disable-next-line
      proposalId = res.logs[0].args.proposalId;

      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: bob });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: george });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: xander });

      await this.abM.supportGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.config.globalProposalSupport(globalProposalId);
      assert.equal(true, res);

      await this.globalGovernance.trigger(globalProposalId);

      // Step #3. Crate proposal to add a record
      const addRecordBytecode = this.ggr.contract.methods
        .setContract(await this.ggr.FEE_COLLECTOR(), charlie)
        .encodeABI();

      res = await this.abM.createGlobalProposalProposalManager.propose(
        this.ggr.address,
        '0',
        addRecordBytecode,
        'charlie is a new fee manager',
        { from: alice }
      );
      proposalId = res.logs[0].args.proposalId;

      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: bob });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.createGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.createGlobalProposalProposalManager.getProposal(proposalId);
      globalProposalId = res.globalId;

      // Step #4. Support proposal to add a record at around 94.19%
      res = await this.abM.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
        from: alice
      });
      // eslint-disable-next-line
      proposalId = res.logs[0].args.proposalId;

      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: bob });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: george });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });
      await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: xander });

      await this.abM.supportGlobalProposalProposalManager.triggerApprove(proposalId);

      await assertRevert(this.globalGovernance.trigger(globalProposalId));

      // Step #5. Support proposal to add a record at 100%
      res = await this.abN.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
        from: alice
      });
      // eslint-disable-next-line
      proposalId = res.logs[0].args.proposalId;

      await this.abN.supportGlobalProposalProposalManager.nay(proposalId, { from: bob });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: dan });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: eve });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: george });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: nick });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: yan });
      await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: zack });

      await this.abN.supportGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.config.globalProposalSupport(globalProposalId);
      log('M support', res);
      res = await this.abN.config.globalProposalSupport(globalProposalId);
      log('N support', res);

      // Step #6. Trigger the proposal and check the new key
      await this.globalGovernance.trigger(globalProposalId);

      res = await this.ggr.getContract(await this.ggr.FEE_COLLECTOR());
      assert.equal(res, charlie);
    });
  });

  describe('Create/Support Global Proposal Proposals', () => {
    it('should change a corresponding application config value', async function() {
      await this.ggr.transferOwnership(this.globalGovernance.address, { from: coreTeam });
      const { seedArbitration } = globalGovernanceHelpers(
        this.galtToken,
        this.spaceToken,
        this.spaceRA,
        this.galtRA,
        this.splitMerge,
        this.spaceLockerFactory,
        this.galtLockerFactory,
        [a1, a2, a3],
        minter,
        oracleModifier,
        geoDataManager,
        alice,
        log
      );

      // Step #1. Create several multiSigs
      await (async () => {
        await this.galtToken.approve(this.multiSigFactory.address, ether(100), { from: alice });

        this.abM = await seedArbitration(
          this.multiSigFactory,
          alice,
          [alice, bob, charlie, dan],
          [bob, george, hannah, mike],
          [xander, bob],
          500,
          200,
          200
        );
        this.abN = await seedArbitration(
          this.multiSigFactory,
          alice,
          [bob, charlie, dan, eve],
          [george, hannah, mike, nick],
          [yan, zack],
          0,
          50,
          0
        );
        // X: charlie, dan, eve, george, hannah, mike, nick, yan, zack
        this.abX = await seedArbitration(
          this.multiSigFactory,
          alice,
          [charlie, dan, eve, george],
          [eve, george, hannah, mike, nick],
          [eve, yan, zack],
          1250,
          60,
          100
        );
        // Y: hannah, mike, nick, oliver, alice, bob, charlie, dan, xander, yan, zack
        this.abY = await seedArbitration(
          this.multiSigFactory,
          alice,
          [hannah, mike, nick, oliver],
          [alice, bob, charlie, dan],
          [xander, yan, zack],
          2000,
          150,
          50
        );
        // Z: oliver, alice, xander
        this.abZ = await seedArbitration(
          this.multiSigFactory,
          alice,
          [oliver, xander],
          [alice],
          [xander],
          3500,
          0,
          600
        );
      })();

      // Step #2. Transfer MultiSigRegistry to the Governance contract
      await this.multiSigRegistry.transferOwnership(this.globalGovernance.address);

      // Step #3. Transfer MultiSigRegistry to the Governance contract
      const transferBackBytecode = this.multiSigRegistry.contract.methods.transferOwnership(coreTeam).encodeABI();

      // we want to vote to transfer it back to the coreTeam
      let res = await this.abM.createGlobalProposalProposalManager.propose(
        this.multiSigRegistry.address,
        '0',
        transferBackBytecode,
        'back to centralization',
        { from: alice }
      );
      let { proposalId } = res.logs[0].args;

      // [alice, bob, charlie, dan],
      //   [bob, george, hannah, mike],
      //   [xander, bob],
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: alice });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: bob });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: charlie });
      await this.abM.createGlobalProposalProposalManager.aye(proposalId, { from: dan });

      res = await this.abM.createGlobalProposalProposalManager.getAyeShare(proposalId);
      res = await this.abM.createGlobalProposalProposalManager.getNayShare(proposalId);

      await assertRevert(this.abM.createGlobalProposalProposalManager.triggerReject(proposalId));
      await this.abM.createGlobalProposalProposalManager.triggerApprove(proposalId);

      res = await this.abM.createGlobalProposalProposalManager.getProposal(proposalId);
      const globalProposalId = res.globalId;

      assert.equal(res.destination, this.multiSigRegistry.address);
      assert.equal(res.value, 0);
      assert.equal(res.globalId, 1);
      assert.equal(res.data, transferBackBytecode);
      assert.equal(res.description, 'back to centralization');

      res = await this.globalGovernance.proposals(globalProposalId);
      assert.equal(res.creator, this.abM.createGlobalProposalProposalManager.address);
      assert.equal(res.value, 0);
      assert.equal(res.destination, this.multiSigRegistry.address);
      assert.equal(res.data, transferBackBytecode);

      res = await this.globalGovernance.getSupport(globalProposalId);
      assert.equal(res, 0);

      // Now voting process begin
      // MultiSig M votes AYE
      await (async () => {
        log('### MultiSig M');
        res = await this.abM.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
          from: alice
        });
        // eslint-disable-next-line
        proposalId = res.logs[0].args.proposalId;

        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: alice });
        await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: bob });
        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: charlie });
        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: dan });
        await this.abM.supportGlobalProposalProposalManager.nay(proposalId, { from: george });
        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });
        await this.abM.supportGlobalProposalProposalManager.aye(proposalId, { from: xander });

        await this.abM.supportGlobalProposalProposalManager.triggerApprove(proposalId);

        res = await this.abM.config.globalProposalSupport(globalProposalId);
        assert.equal(true, res);

        res = await this.globalGovernance.getSupportDetails(globalProposalId);
        log('global support details', res);

        res = await this.globalGovernance.getSupport(globalProposalId);
        log('global support (%)', res);
      })();

      // MultiSig N votes AYE
      await (async () => {
        log('### MultiSig N');
        res = await this.abN.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
          from: alice
        });
        // eslint-disable-next-line
        proposalId = res.logs[0].args.proposalId;

        await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: george });
        await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });
        await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: nick });
        await this.abN.supportGlobalProposalProposalManager.aye(proposalId, { from: mike });

        res = await this.abN.supportGlobalProposalProposalManager.getAyeShare(proposalId);
        assert.equal(res, 30);

        await this.abN.supportGlobalProposalProposalManager.triggerApprove(proposalId);

        res = await this.globalGovernance.getSupportedMultiSigs(globalProposalId);
        assert.sameMembers(res, [this.abM.multiSig.address, this.abN.multiSig.address]);

        res = await this.abN.config.globalProposalSupport(globalProposalId);
        assert.equal(res, true);

        res = await this.globalGovernance.getSupportDetails(globalProposalId);
        log('global support details', res);

        res = await this.globalGovernance.getSupport(globalProposalId);
        log('global support (%)', res);
      })();

      // MultiSig X doesn't reach the theshold
      // X: charlie, dan, eve, george, hannah, mike, nick, yan, zack
      await (async () => {
        log('### MultiSig X');
        res = await this.abX.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
          from: alice
        });
        // eslint-disable-next-line
        proposalId = res.logs[0].args.proposalId;

        await this.abX.supportGlobalProposalProposalManager.aye(proposalId, { from: hannah });

        res = await this.abX.supportGlobalProposalProposalManager.getAyeShare(proposalId);
        log('>>>', res.toString(10));
        // assert.equal(res, 30);

        await assertRevert(this.abX.supportGlobalProposalProposalManager.triggerApprove(proposalId));

        res = await this.globalGovernance.getSupportedMultiSigs(globalProposalId);
        assert.sameMembers(res, [this.abM.multiSig.address, this.abN.multiSig.address]);

        res = await this.abX.config.globalProposalSupport(globalProposalId);
        assert.equal(res, false);

        res = await this.globalGovernance.getSupportDetails(globalProposalId);
        log('global support details', res);

        res = await this.globalGovernance.getSupport(globalProposalId);
        log('global support (%)', res);
      })();

      // MultiSig Y votes NAY
      // Y: charlie, dan, eve, george, hannah, mike, nick, yan, zack
      await (async () => {
        log('### MultiSig Y');
        res = await this.abY.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
          from: alice
        });
        // eslint-disable-next-line
        proposalId = res.logs[0].args.proposalId;

        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: charlie });
        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: dan });
        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: eve });
        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: george });
        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: hannah });
        await this.abY.supportGlobalProposalProposalManager.nay(proposalId, { from: mike });
        await this.abY.supportGlobalProposalProposalManager.aye(proposalId, { from: nick });

        res = await this.abY.supportGlobalProposalProposalManager.getAyeShare(proposalId);
        log('>>>', res.toString(10));
        // assert.equal(res, 30);

        await this.abY.supportGlobalProposalProposalManager.triggerReject(proposalId);

        res = await this.globalGovernance.getSupportedMultiSigs(globalProposalId);
        assert.sameMembers(res, [this.abM.multiSig.address, this.abN.multiSig.address]);

        res = await this.abY.config.globalProposalSupport(globalProposalId);
        assert.equal(res, false);

        res = await this.globalGovernance.getSupportDetails(globalProposalId);
        log('global support details', res);

        res = await this.globalGovernance.getSupport(globalProposalId);
        log('global support (%)', res);
      })();

      const support = await this.globalGovernance.getSupport(globalProposalId);
      const defaultThreshold = await this.globalGovernance.defaultThreshold();
      assert.equal(parseInt(support, 10) < parseInt(defaultThreshold, 10), true);

      // not available to be executed yet
      await assertRevert(this.globalGovernance.trigger(globalProposalId));

      res = await this.multiSigRegistry.owner();
      assert.equal(res, this.globalGovernance.address);

      // MultiSig Z votes NAY
      // Z: oliver, alice, xander
      await (async () => {
        log('### MultiSig Z');
        res = await this.abZ.supportGlobalProposalProposalManager.propose(globalProposalId, 'looks good', {
          from: alice
        });
        // eslint-disable-next-line
        proposalId = res.logs[0].args.proposalId;

        await this.abZ.supportGlobalProposalProposalManager.aye(proposalId, { from: oliver });
        await this.abZ.supportGlobalProposalProposalManager.aye(proposalId, { from: alice });
        await this.abZ.supportGlobalProposalProposalManager.aye(proposalId, { from: xander });

        res = await this.abZ.supportGlobalProposalProposalManager.getAyeShare(proposalId);
        log('>>>', res.toString(10));
        // assert.equal(res, 30);

        await this.abZ.supportGlobalProposalProposalManager.triggerApprove(proposalId);

        res = await this.globalGovernance.getSupportedMultiSigs(globalProposalId);
        assert.sameMembers(res, [this.abM.multiSig.address, this.abN.multiSig.address, this.abZ.multiSig.address]);

        res = await this.abZ.config.globalProposalSupport(globalProposalId);
        assert.equal(res, true);

        res = await this.globalGovernance.getSupportDetails(globalProposalId);
        log('global support details', res);

        res = await this.globalGovernance.getSupport(globalProposalId);
        log('global support (%)', res);
      })();

      await this.globalGovernance.trigger(globalProposalId);

      res = await this.multiSigRegistry.owner();
      assert.equal(res, coreTeam);

      log(
        'M',
        await this.spaceRA.lockedMultiSigBalance(this.abM.multiSig.address),
        await this.galtRA.lockedMultiSigBalance(this.abM.multiSig.address),
        await this.stakeTracker.balanceOf(this.abM.multiSig.address)
      );

      log(
        'N',
        await this.spaceRA.lockedMultiSigBalance(this.abN.multiSig.address),
        await this.galtRA.lockedMultiSigBalance(this.abN.multiSig.address),
        await this.stakeTracker.balanceOf(this.abN.multiSig.address)
      );

      log(
        'X',
        await this.spaceRA.lockedMultiSigBalance(this.abX.multiSig.address),
        await this.galtRA.lockedMultiSigBalance(this.abX.multiSig.address),
        await this.stakeTracker.balanceOf(this.abX.multiSig.address)
      );

      log(
        'Y',
        await this.spaceRA.lockedMultiSigBalance(this.abY.multiSig.address),
        await this.galtRA.lockedMultiSigBalance(this.abY.multiSig.address),
        await this.stakeTracker.balanceOf(this.abY.multiSig.address)
      );

      log(
        'Z',
        await this.spaceRA.lockedMultiSigBalance(this.abZ.multiSig.address),
        await this.galtRA.lockedMultiSigBalance(this.abZ.multiSig.address),
        await this.stakeTracker.balanceOf(this.abZ.multiSig.address)
      );

      log(
        'total',
        await this.spaceRA.totalSupply(),
        await this.galtRA.totalSupply(),
        await this.stakeTracker.totalSupply()
      );
    });
  });
});