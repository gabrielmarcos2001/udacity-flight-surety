pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
  using SafeMath for uint256;

  // Flight status codees - these codes are reported from the Oracle
  uint8 private constant STATUS_CODE_UNKNOWN = 0;
  uint8 private constant STATUS_CODE_ON_TIME = 10;
  uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
  uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
  uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
  uint8 private constant STATUS_CODE_LATE_OTHER = 50;

  // Defines an enum for the different states of an airline
  enum AirlineState { 
    Unregistered,
    Candidate,
    Approved,
    Funded
  }
  
  uint256 private constant FUNDING_COST = 10 ether;
  uint256 private constant MAX_INSURANCE_AMOUNT = 1 ether;

  // Keeps a counter with the number of airlines funded so we don't need
  // to iterate a map - this will save gas when having to calculate the required
  // consensus for approving new airlines
  uint256 fundedCounter = 0;
  uint256 registeredCounter = 0;

  // Events definition for Airlines lifecycle
  event AirlineRegistered(address indexed airlineAddress);
  event AirlineApproved(address indexed airlineAddress);
  event AirlineFunded(address indexed airlineAddress);

  // Events definition for insurance lifecycle
  event InsurancePurchased(address indexed insuree);
  event InsuranceCredited(address indexed insuree);
  event InsuranceWithdrawn(address indexed insuree);

  // Event definition for flight registered
  event FlightRegistered(string indexed flight);

  address private contractOwner;  // Account used to deploy contract
  bool private operational = true; // contract is operational - defaults to true

  // mapping for supporting multi mart consensus per airline
  // it stores for each airline the other airlines which have voted
  mapping(address => address[]) private multiCalls;

  // Reference for data contract
  FlightSuretyData private dataContract;

  // This data structures are for supporting the oracle
  struct Flight {
    bool isRegistered;
    uint8 statusCode;
    uint256 updatedTimestamp;        
    address airline;
  }

  mapping(bytes32 => Flight) private flights;

  /**
  * @dev Modifier that requires the "operational" boolean variable to be "true"
  *      This is used on all state changing functions to pause the contract in 
  *      the event there is an issue that needs to be fixed
  */
  modifier requireIsOperational() {
    require(operational, "Contract is currently not operational");  
    _;
  }

  /**
  * @dev Modifier that requires the "ContractOwner" account to be the function caller
  */
  modifier requireContractOwner() {
    require(msg.sender == contractOwner, "Caller is not contract owner");
    _;
  }

  /**
  * @dev Contract constructor
  */
  constructor(address data) public {
    contractOwner = msg.sender;
    dataContract = FlightSuretyData(data);
  }

  /**
  /@dev allows the contract owner to kill the contract
    */
  function kill() public 
    requireContractOwner {
      if (msg.sender == contractOwner) {
        selfdestruct(contractOwner);
      }
  }

  /**
  * @dev Sets contract operations on/off
  *
  * When operational mode is disabled, all write transactions except for this one will fail
  */    
  // TODO: Add multi-party consensus in here
  function setOperatingStatus (bool mode) external requireContractOwner {
    operational = mode;
  }

  /**
  /@dev returns wheter the contract is operational
    */
  function isOperational() external view returns(bool) {
    return operational;
  }

  /**
  /@dev returns if an aairline is a Candidate
    */
  function isCandidate(address _address) private view returns (bool) {
    if (!dataContract.isAirline(_address)) return false;
    uint state = dataContract.getAirlineState(_address);
    return state == uint(AirlineState.Candidate);
  }

  /**
  /@dev returns if an airline is Approved
    */
  function isApproved(address _address) private view returns (bool) {
    if (!dataContract.isAirline(_address)) return false;
    uint state = dataContract.getAirlineState(_address);
    return state == uint(AirlineState.Approved);
  }

  /**
  /@dev returns if an airline is a Funded
    */
  function isFunded(address _address) public view returns (bool) {
    if (!dataContract.isAirline(_address)) return false;
    uint state = dataContract.getAirlineState(_address);
    return state == uint(AirlineState.Funded);
  }

  /**
  * @dev Add an airline to the registration queue
  */
  function registerAirline (string _name) public requireIsOperational returns(bool success)  {
    require(!dataContract.isAirline(msg.sender), "airline is already registered");
    
    // Registers the airline in the data contract as a Candidate
    if (dataContract.registerAirline(_name, msg.sender, uint(AirlineState.Candidate))) {
      // Emits the event for the new arilne registered as a candidate
      emit AirlineRegistered(msg.sender);
    }
    
    // our app business logic requires that if less than 4 airlines are registered
    // we automatically approve the airline - other case we need 50% of the upvotes
    // participants counter gets incremented once the airline has submitted the funds
    if (registeredCounter < 4) {
      if (dataContract.updateAirline(msg.sender, uint(AirlineState.Approved))) {
        // Emits the event for the airline being automatically approved
        emit AirlineApproved(msg.sender);
      }
    }

    // updates the counter with number of airlines registered
    registeredCounter = registeredCounter + 1;

    // Returns the result of the registration
    return true;
  }

  /**
  * @dev upvoets for an airline
  */
  function upvoteAirline (address _airline) external requireIsOperational returns(bool success, uint votes) {
    require(isFunded(msg.sender), "only funded airlines can upvote"); // only funded airlines can upvote for another airline
    require(isCandidate(_airline), "airline voted is not a candidate"); // only candidate airlines can be upvoted
    
    // We need to validate the caller has not already voted for this airline
    bool isDuplicate = false;

    // Get the list of multi calls per airline
    address[] memory airlineMultiCalls = multiCalls[_airline];

    // Checks if the sender has already emitted a vote for this airline
    for (uint i=0; i < airlineMultiCalls.length; i++) {
      if (airlineMultiCalls[i] == msg.sender) {
        isDuplicate = true;
        break;
      }
    }

    // stops if a duplicate
    require (!isDuplicate, "caller has alrady voted for registering this airline");

    // Register the vote from the caller
    multiCalls[_airline].push(msg.sender);

    // TODO: This should be based on registerd airlines - Maybe we define Approved Airlines can upvote
    // Calculates the required consensus from the total number of funded airlines
    uint requiredConsensus = fundedCounter.div(2);

    // If we have reached consensus we update the state of the airline from Candidate to Approved
    // Airline still needs to submit funds to be Funded
    if (multiCalls[_airline].length > requiredConsensus) {
      if (dataContract.updateAirline(_airline, uint(AirlineState.Approved))) {
        // Removes the information for the multi calls
        delete multiCalls[_airline];

        // Emits the event for the airline being approved
        emit AirlineApproved(_airline);
      }
    }

    // Returns the result of the upvote
    return (true, multiCalls[_airline].length);
  }

  /**
  * @dev Register a future flight for insuring.
  */  
  function registerFlight (string _flight, uint256 _timestamp) external requireIsOperational returns(bool success) {
    require(isFunded(msg.sender), "airline is not funded"); // only particpants can register a flight
    
    // Generates a key for the flight based on its data
    bytes32 flightId = getFlightKey(msg.sender, _flight, _timestamp);
    
    // Registers the flight - this will fail if the flight has already being registered
    if (dataContract.registerFlight(flightId, msg.sender, _flight, _timestamp)) {
      // Emits the event for the flight being registered
      emit FlightRegistered(_flight);
      return true;
    }

    return false;
  }

  /**
  /@dev function called by the ariline to add funds
    */
  function fundAirline () external payable requireIsOperational returns(bool success) {
    // verifies the airline is approved
    require(isApproved(msg.sender), "only approved airlines can be funded");
    
    // verifies the airlines has sent enough funds
    uint amount = msg.value;
    require(amount >= FUNDING_COST, "not enough value sent");

    // checks if the airlines submitted extra funds 
    uint amountToReturn = msg.value - FUNDING_COST;

    // transfers the funds to the data contract - ke keep all the funds
    // in the data-contract in case we need to upgrade and deprecate current App Contract
    address(dataContract).transfer(FUNDING_COST);

    // Updates the funds available per airline in the data contract
    dataContract.fund(msg.sender, FUNDING_COST);
        
    // Updates the state of the airline in the data contract
    dataContract.updateAirline(msg.sender, uint(AirlineState.Funded));

    // updates the number of funded airlines
    fundedCounter = fundedCounter +1;

    // returns any extra value sent
    if (amountToReturn > 0) msg.sender.transfer(amountToReturn);

    // emits the event for the airline being funded
    emit AirlineFunded(msg.sender);

    return true;
  }

  /**
  / @dev executes the busniess logic for calculating the insurance amount
    */
  function calculateInsurance(uint256 _amount) internal pure returns (uint256 _value) {
    return _amount.mul(15).div(10);
  }

  /**
  * @dev Buy insurance for a flight
  */
  function purchaseInsurance (address _airline, string _flight, uint256 _timestamp) external payable requireIsOperational returns (bool success) {
      // Generates a key for the flight based on its data
      bytes32 flightId = getFlightKey(_airline, _flight, _timestamp);
      uint256 insuranceAmount = 0; // calculated insurance amount

      // verifies the flight id is valid
      require(dataContract.isFlight(flightId), "flight is not registered");

      // caps the amount of the insurance
      if (msg.value > MAX_INSURANCE_AMOUNT) {
        uint amountToReturn = msg.value - MAX_INSURANCE_AMOUNT;
        
        // Calculates the insurance amount
        insuranceAmount = calculateInsurance(MAX_INSURANCE_AMOUNT);

        // buys the insurance in the data contract
        if (dataContract.buy(msg.sender, _airline, flightId, MAX_INSURANCE_AMOUNT,  insuranceAmount)) {
          address(dataContract).transfer(MAX_INSURANCE_AMOUNT);
          msg.sender.transfer(amountToReturn);

          // Emits the event with an insurance being purchased
          emit InsurancePurchased(msg.sender);
          return true;
        }
      }else {
        // calculates the insurance amount from the value sent
        insuranceAmount = calculateInsurance(msg.value);

        // buys the insurance in the data contract
        if (dataContract.buy(msg.sender, _airline, flightId, msg.value,  insuranceAmount)) {
          address(dataContract).transfer(msg.value);
          // Emits the event with an insurance being purchased
          emit InsurancePurchased(msg.sender);
          return true;
        }
      }

      return false;
  }
  
  /**
  /@dev returns paseenger balance
   */
  function getBalance () external
    requireIsOperational {
      dataContract.getBalance(msg.sender);
  }

  /**
  * @dev withdraws all of the available amount for the insuree
  */
  function withdraw () external
    requireIsOperational {
      dataContract.pay(msg.sender);
  }

  /**
  /@dev fetches the airline information
    */
  function fetchAirline() external view returns (string name, uint state, string stateName) {
    (name, state) = dataContract.getAirline(msg.sender);
    if (state == 0) stateName = "Unregistered";
    if (state == 1) stateName = "Candidate";
    if (state == 2) stateName = "Approved";
    if (state == 3) stateName = "Funded";

    return (name, state, stateName);
  }

  /**
  /@dev returns the number of flights registerd by the called
   */
  function registerdFlightsCount() external requireIsOperational returns (uint256 count) {
    return dataContract.flightsPerAirlineCount(msg.sender);
  }

  /**
  /@dev returns the flight data given a flight id
   */
  function getFlightByIndex(uint256 index) external requireIsOperational returns (string flight, uint256 timestamp) {
    (flight, timestamp) = dataContract.getFlight(msg.sender, index);
    return (flight, timestamp);
  }

  /**
  * @dev Called after oracle has updated flight status
  */  
  function processFlightStatus (
    address airline, 
    string memory flight, 
    uint256 timestamp, 
    uint8 statusCode) internal {
      // This function is trigegred when the oracle comes back with a status code of the response

      if (statusCode == STATUS_CODE_LATE_AIRLINE) {
        bytes32 flightId = getFlightKey(airline, flight, timestamp);

        dataContract.creditInsurees(flightId);
        // address[] storage insurees = dataContract.creditInsurees(flightId);

        // for (uint i=0; i < insurees.length; i++) {
        //     // Emits an event for each insuree credited
        //     emit InsuranceCredited(insurees[i]);
        // }
      }
  }


  // Generate a request for oracles to fetch flight information
  function fetchFlightStatus (
    address airline,
    string flight, 
    uint256 timestamp) external requireIsOperational {
      uint8 index = getRandomIndex(msg.sender);

      // Generate a unique key for storing the request
      bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
      oracleResponses[key] = ResponseInfo({ requester: msg.sender, isOpen: true });

      emit OracleRequest(index, airline, flight, timestamp);
  }

  // ORACLE MANAGEMENT

  // Incremented to add pseudo-randomness at various points
  uint8 private nonce = 0;

  // Fee to be paid when registering oracle
  uint256 public constant REGISTRATION_FEE = 1 ether;

  // Number of oracles that must respond for valid status
  uint256 private constant MIN_RESPONSES = 3;

  struct Oracle {
    bool isRegistered;
    uint8[3] indexes;        
  }

  // Track all registered oracles
  mapping(address => Oracle) private oracles;

  // Model for responses from oracles
  // - requester: Account that requested status
  // - isPen: If open, oracle responses are accepted
  // - responses: Mapping key is the status code reported.
  //              This lets us group responses and identify
  //              the response that majority of the oracles
  struct ResponseInfo {
    address requester;                              
    bool isOpen;                                    
    mapping(uint8 => address[]) responses;
  }

  // Track all oracle responses
  // Key = hash(index, flight, timestamp)
  mapping(bytes32 => ResponseInfo) private oracleResponses;

  // Event fired each time an oracle submits a response
  event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

  event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

  // Event fired when flight status request is submitted
  // Oracles track this and if they have a matching index
  // they fetch data and submit a response
  event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

  // Register an oracle with the contract
  function registerOracle () external payable {
    // Require registration fee
    require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

    uint8[3] memory indexes = generateIndexes(msg.sender);

    oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
  }

  // // TODO: This is for testing according to the video
  // function getOracle(address ccount) external view requireContractOwner returns (uint8[3]) {
  //   return oracles[msg.sender].indexes;
  // }

  function getMyIndexes () view external returns(uint8[3]) {
    require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
    return oracles[msg.sender].indexes;
  }

  // Called by oracle when a response is available to an outstanding request
  // For the response to be accepted, there must be a pending request that is open
  // and matches one of the three Indexes randomly assigned to the oracle at the
  // time of registration (i.e. uninvited oracles are not welcome)
  function submitOracleResponse (
    uint8 index,
    address airline,
    string flight,
    uint256 timestamp,
    uint8 statusCode ) external {
      require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

      bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
      require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

      oracleResponses[key].responses[statusCode].push(msg.sender);

      // Information isn't considered verified until at least MIN_RESPONSES
      // oracles respond with the *** same *** information
      emit OracleReport(airline, flight, timestamp, statusCode);
      if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
        emit FlightStatusInfo(airline, flight, timestamp, statusCode);

        // Handle flight status as appropriate
        processFlightStatus(airline, flight, timestamp, statusCode);
      }
  }

  function getFlightKey (
    address airline, 
    string flight, 
    uint256 timestamp) pure internal returns(bytes32) {
      return keccak256(abi.encodePacked(airline, flight, timestamp));
  }

  // Returns array of three non-duplicating integers from 0-9
  function generateIndexes (address account) internal returns(uint8[3]) {
    uint8[3] memory indexes;
    indexes[0] = getRandomIndex(account);
    
    indexes[1] = indexes[0];
    while(indexes[1] == indexes[0]) {
      indexes[1] = getRandomIndex(account);
    }

    indexes[2] = indexes[1];
    while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
      indexes[2] = getRandomIndex(account);
    }

    return indexes;
  }

  // Returns array of three non-duplicating integers from 0-9
  function getRandomIndex (address account) internal returns (uint8) {
    uint8 maxValue = 10;

    // Pseudo random number...the incrementing nonce adds variation
    uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

    if (nonce > 250) {
      nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
    }

    return random;
  }
}   

/**
/ Data contract interface
    */
contract FlightSuretyData {
  function getBalance(address _insuree) external returns (uint256 balance);
  function flightsPerAirlineCount(address _airline) external returns (uint256 count);
  function getFlight(address _airline, uint256 index) external returns (string flight, uint256 timestamp);
  function registerFlight(bytes32 _flightId, address _airline, string _flight, uint256 _timestamp) external returns (bool success);
  function registerAirline(string _name, address _address, uint _state) external returns (bool success);
  function updateAirline(address _address, uint _state) external returns (bool success);
  function getAirlineState(address _address) external view returns(uint state);
  function getAirline(address _address) external view returns(string name, uint state);
  function isAirline(address _address) public view returns (bool);
  function isFlight(bytes32 _flightId) public view returns (bool);
  function fund (address _address, uint256 _amount) external returns (bool success);
  function buy (address _insuree, address _airline, bytes32 _flightId, uint256 _paidAmount, uint256 _insuranceAmount) external returns (bool success);
  function creditInsurees (bytes32 _flightId) external returns (bool success);
  function pay (address _insuree) external returns (bool success);
}
