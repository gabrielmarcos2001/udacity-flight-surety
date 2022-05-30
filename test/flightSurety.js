
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  var airline1;
  var airline2;
  var airline3;
  var airline4;
  var airline5;
  var airline6;
  var insuree1;

  var flightTimeStamp = Date.now();

  const smallDifference = web3.utils.toWei("0.1", "ether");
  const insufficientFunding = web3.utils.toWei("1", "ether");
  const fundingPrice = web3.utils.toWei("10", "ether");
  const insuranceAmount = web3.utils.toWei("1", "ether");

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) first airline gets automatically approved', async () => {
    var airlineRegisterdEventEmitted = false;
    var airlineApprovedEventEmitted = false;

    await config.flightSuretyApp.AirlineRegistered((err, res) => {
      airlineRegisterdEventEmitted = true
    })

    await config.flightSuretyApp.AirlineApproved((err, res) => {
      airlineApprovedEventEmitted = true
    })

    airline1 = config.testAddresses[1];
    await config.flightSuretyApp.registerAirline('TangoAir01', {from: airline1});

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline1});

    assert.equal(airlineInfo[0], 'TangoAir01', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 1, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Approved', 'Ariline state name is invalid');
    assert.equal(airlineRegisterdEventEmitted, true, "Airline was not registered");
    assert.equal(airlineApprovedEventEmitted, true, "Airline was not approved");
  });

  it('(airline) airline is already registered', async () => {
    var error;
    try {
      await config.flightSuretyApp.registerAirline('TangoAir01', {from: airline1});
    }catch (e) {
      error = e;
    }
    
    assert.equal(error.reason, 'airline is already registered', "Airline is already registered");
  });

  it('(airline) second airline gets automatically approved', async () => {
    var airlineRegisterdEventEmitted = false;
    var airlineApprovedEventEmitted = false;

    await config.flightSuretyApp.AirlineRegistered((err, res) => {
      airlineRegisterdEventEmitted = true
    })

    await config.flightSuretyApp.AirlineApproved((err, res) => {
      airlineApprovedEventEmitted = true
    })

    airline2 = config.testAddresses[2];
    await config.flightSuretyApp.registerAirline('TangoAir02', { from: airline2 });

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline2});

    assert.equal(airlineInfo[0], 'TangoAir02', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 1, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Approved', 'Ariline state name is invalid');
    assert.equal(airlineRegisterdEventEmitted, true, "Airline was not registered");
    assert.equal(airlineApprovedEventEmitted, true, "Airline was not approved");
  });

  it('(airline) third airline gets automatically approved', async () => {
    var airlineRegisterdEventEmitted = false;
    var airlineApprovedEventEmitted = false;

    await config.flightSuretyApp.AirlineRegistered((err, res) => {
      airlineRegisterdEventEmitted = true
    })

    await config.flightSuretyApp.AirlineApproved((err, res) => {
      airlineApprovedEventEmitted = true
    })

    airline3 = config.testAddresses[3];
    await config.flightSuretyApp.registerAirline('TangoAir03', { from: airline3 });

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline3});

    assert.equal(airlineInfo[0], 'TangoAir03', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 1, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Approved', 'Ariline state name is invalid');
    assert.equal(airlineRegisterdEventEmitted, true, "Airline was not registered");
    assert.equal(airlineApprovedEventEmitted, true, "Airline was not approved");
  });

  it('(airline) fourth airline gets automatically approved', async () => {
    var airlineRegisterdEventEmitted = false;
    var airlineApprovedEventEmitted = false;

    await config.flightSuretyApp.AirlineRegistered((err, res) => {
      airlineRegisterdEventEmitted = true
    })

    await config.flightSuretyApp.AirlineApproved((err, res) => {
      airlineApprovedEventEmitted = true
    })

    airline4 = config.testAddresses[4];
    await config.flightSuretyApp.registerAirline('TangoAir04', { from: airline4 });

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from:airline4});

    assert.equal(airlineInfo[0], 'TangoAir04', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 1, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Approved', 'Ariline state name is invalid');

    assert.equal(airlineRegisterdEventEmitted, true, "Airline was not registered");
    assert.equal(airlineApprovedEventEmitted, true, "Airline was not approved");
  });

  it('(airline) fifth airline does not get automatically approved', async () => {
    airline5 = config.testAddresses[5];
    await config.flightSuretyApp.registerAirline('TangoAir05', { from: airline5 });

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline5});

    assert.equal(airlineInfo[0], 'TangoAir05', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 0, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Candidate', 'Ariline state name is invalid');
  });

  it('(airline) sixth airline does not get automatically approved', async () => {
    airline6 = config.testAddresses[6];
    await config.flightSuretyApp.registerAirline('TangoAir06', { from: airline6 });

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline6});

    assert.equal(airlineInfo[0], 'TangoAir06', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 0, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Candidate', 'Ariline state name is invalid');
  });

  it('(airline) approved airlines can not upvote', async () => {
    var error;
    try {
      await config.flightSuretyApp.upvoteAirline(airline5, {from: airline2});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'only funded airlines can upvote', "Only funded airlines can upvote");
  });

  it('(airline) candidate airlines can not upvote', async () => {
    var error;
    try {
      await config.flightSuretyApp.upvoteAirline(airline5, {from: airline6});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'only funded airlines can upvote', "Only funded airlines can upvote");
  });

  it('(airline) approved airlines can submit funds', async () => {

    var airlineFundedEventEmitted = false;
    await config.flightSuretyApp.AirlineFunded((err, res) => {
      airlineFundedEventEmitted = true
    })

    let contractBeforeBalance = await web3.eth.getBalance(config.flightSuretyData.address);
    let airlineBeforeBalance = await web3.eth.getBalance(airline1);
    await config.flightSuretyApp.fundAirline({from: airline1, value: fundingPrice});
    let airlineAfterBalance = await web3.eth.getBalance(airline1);
    let contractAfterBalance = await web3.eth.getBalance(config.flightSuretyData.address);

    const airlineInfo = await config.flightSuretyApp.fetchAirline.call({from: airline1});
    let airlineBalanceDiff = airlineBeforeBalance - airlineAfterBalance;
    let contractBalanceDiff = contractAfterBalance - contractBeforeBalance;

    // validates the funds were substracted from the airline
    assert(airlineBalanceDiff > fundingPrice, "funds were not substracted");

    // validates the funds were added to the data contract
    assert.equal(contractBalanceDiff, fundingPrice, "funding value was not added to the data contract");
    assert.equal(airlineInfo[0], 'TangoAir01', 'Ariline name is invalid');
    assert.equal(airlineInfo[1], 2, 'Ariline state is invalid');
    assert.equal(airlineInfo[2], 'Funded', 'Ariline state name is invalid');
    assert.equal(airlineFundedEventEmitted, true, "Airline was not funded");
  });

  it('(airline) test minimal funding requirements', async () => {
    let airlineBeforeBalance = await web3.eth.getBalance(airline2);
    try {
      await config.flightSuretyApp.fundAirline({from: airline2, value: insufficientFunding});
    }catch (e) {
      error = e;
    }
    // validates only a small amount of gas was substracted but the airline did not spent 10 ether
    let airlineAfterBalance = await web3.eth.getBalance(airline2);
    let airlineBalanceDiff = airlineBeforeBalance - airlineAfterBalance;

    assert(airlineBalanceDiff < smallDifference)
    assert.equal(error.reason, 'not enough value sent', "Not enough funding value sent");
  });

  it('(airline) candidate airlines can not be funded', async () => {
    var error;
    let airlineBeforeBalance = await web3.eth.getBalance(airline5);
    try {
      await config.flightSuretyApp.fundAirline({from: airline5, value: fundingPrice});
    }catch (e) {
      error = e;
    }

    // validates only a small amount of gas was substracted but the airline did not spent 10 ether
    let airlineAfterBalance = await web3.eth.getBalance(airline5);
    let airlineBalanceDiff = airlineBeforeBalance - airlineAfterBalance;

    assert(airlineBalanceDiff < smallDifference)
    assert.equal(error.reason, 'only approved airlines can be funded', "only approved airlines can be funded");
  });

  it('(airline) multi-party approval', async () => {
    // funds all initial four airlines - airline 1 was funded in previous test
    await config.flightSuretyApp.fundAirline({from: airline2, value: fundingPrice});
    await config.flightSuretyApp.fundAirline({from: airline3, value: fundingPrice});
    await config.flightSuretyApp.fundAirline({from: airline4, value: fundingPrice});

    // vallidates all airlines are funded
    const airline1Info = await config.flightSuretyApp.fetchAirline.call({from: airline1});
    assert.equal(airline1Info[2], 'Funded', 'Ariline state name is invalid');

    const airline2Info = await config.flightSuretyApp.fetchAirline.call({from: airline2});
    assert.equal(airline2Info[2], 'Funded', 'Ariline state name is invalid');

    const airline3Info = await config.flightSuretyApp.fetchAirline.call({from: airline3});
    assert.equal(airline3Info[2], 'Funded', 'Ariline state name is invalid');

    const airline4Info = await config.flightSuretyApp.fetchAirline.call({from: airline4});
    assert.equal(airline4Info[2], 'Funded', 'Ariline state name is invalid');

    // Validates airline 5 state is Candidate
    var airline5Info = await config.flightSuretyApp.fetchAirline.call({from: airline5});
    assert.equal(airline5Info[2], 'Candidate', 'Ariline state name is invalid');

    // Funded airlines can upvote airline5 - it should update its state at the third upvote
    // First vote from Airline1
    await config.flightSuretyApp.upvoteAirline(airline5, {from: airline1});

    // Checks status has not changed
    airline5Info = await config.flightSuretyApp.fetchAirline.call({from: airline5});
    assert.equal(airline5Info[2], 'Candidate', 'Ariline state name is invalid');

    // Second vote from Airline2
    await config.flightSuretyApp.upvoteAirline(airline5, {from: airline2});

    // Checks status has not changed
    airline5Info = await config.flightSuretyApp.fetchAirline.call({from: airline5});
    assert.equal(airline5Info[2], 'Candidate', 'Ariline state name is invalid');

    // Event should be emitted
    var airlineApprovedEventEmitted = false;
    await config.flightSuretyApp.AirlineApproved((err, res) => {
      airlineApprovedEventEmitted = true
    })

    // Third Vote from Airline3 - this one should reach consensus
    await config.flightSuretyApp.upvoteAirline(airline5, {from: airline3});

    // Checks status has changed
    airline5Info = await config.flightSuretyApp.fetchAirline.call({from: airline5});
    assert.equal(airline5Info[2], 'Approved', 'Ariline state name is invalid');
    assert.equal(airlineApprovedEventEmitted, true, "Airline was not approved");
  });

  it('(airline) only funded airline can register flight', async () => {
    try {
      await config.flightSuretyApp.registerFlight("flight01", flightTimeStamp, {from: airline5});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'airline is not funded', "only funded airlines can register flights");
  });

  it('(airline) funded airline can register flight', async () => {
    var flightRegisteredEvent = false;
    await config.flightSuretyApp.FlightRegistered((err, res) => {
      flightRegisteredEvent = true
    })
    await config.flightSuretyApp.registerFlight("flight01", flightTimeStamp, {from: airline1});
    assert.equal(flightRegisteredEvent, true, "flight registered event was not emitted");
  });

  it('(insurance) insurance can be purchased', async () => {
    var insurancePurchasedEvent = false;
    await config.flightSuretyApp.InsurancePurchased((err, res) => {
      insurancePurchasedEvent = true
    })
    insuree1 = accounts[7];
    let contractBeforeBalance = await web3.eth.getBalance(config.flightSuretyData.address);
    await config.flightSuretyApp.purchaseInsurance(airline1, "flight01", flightTimeStamp, {from: insuree1, value: insuranceAmount});
    let contractAfterBalance = await web3.eth.getBalance(config.flightSuretyData.address);
    let balanceDifference = contractAfterBalance - contractBeforeBalance;
    assert.equal(balanceDifference, insuranceAmount, "insurance amount was not added to funds");
    assert.equal(insurancePurchasedEvent, true, "insurance purchased event was not emitted");
  });

  it('(insurance) insurance for not registered flight can not be purchased', async () => {
    try {
      await config.flightSuretyApp.purchaseInsurance(airline1, "flight02", flightTimeStamp, {from: insuree1, value: insuranceAmount});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'flight is not registered', "flight is not registered");
  });

  it('(insurance) duplicate insurance can not be purchased', async () => {
    try {
      await config.flightSuretyApp.purchaseInsurance(airline1, "flight01", flightTimeStamp, {from: insuree1, value: insuranceAmount});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'insurance has already being purchased', "insurance has already being purchased");
  });

  it('(insurance) withdraw without funds', async () => {
    try {
      await config.flightSuretyApp.withdraw({from: insuree1});
    }catch (e) {
      error = e;
    }
    assert.equal(error.reason, 'insuree has no balance available to withdraw', "insuree has no balance available to withdraw");
  });
});
