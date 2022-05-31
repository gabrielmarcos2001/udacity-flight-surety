pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    // Structure for saving the Airline information and State
    struct Airline {
      string name;
      uint256 state;
      uint256 balance;
      bool isValue;
    }

    // Defines an enum for the different states of the Insurance
    enum InsuranceState {
      Submitted,
      Credited
    }

    // Structure for saving the Insurance information and State
    struct Insurance {
      address insuree;
      address airline;
      bytes32 flightId;
      uint256 paidAmount;
      uint256 insuranceAmount;
      InsuranceState state;
      bool isValue;
    }

    // Structure for saving Flight information
    struct Flight {
      string flight;
      address airline;
      uint256 timestamp;
      bool isValue;
    }

    // Map with all the arilines and its state
    mapping(address => Airline) private airlines;

    // Map with valid registered flights
    mapping(bytes32 => Flight) private flights;

    // Registered flight ids per airline
    mapping(address => bytes32[]) private airlineFlights;

    // Map with all the insurances by key
    mapping(bytes32 => Insurance) private insurances;

    // Map with list of insurees per flight id
    mapping(bytes32 => bytes32[]) private insurees;

    // Map with the balance available per insuree to withdraw
    mapping(address => uint256) private insureesBalance;

    // Map with list of contracts are allowed to call this data functions
    mapping(address => uint256) private authorizedContracts;

    /**
     * @dev Constructor
     *   The deploying account becomes contractOwner
     */
    constructor() public {
      contractOwner = msg.sender;

      // by default the owner is also an authorized contract
      authorizeContract(msg.sender);
    }

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
     * @dev Modifier that requires the "caller" to be an authorized contract
     */
    modifier requireCallerAuthorized() {
      require(
        authorizedContracts[msg.sender] == 1,
        "Caller is not an authorized contract"
      );
      _;
    }

    /**
    /@dev allows the contract owner to kill the contract
     */
    function kill() external requireContractOwner {
      if (msg.sender == contractOwner) {
        selfdestruct(contractOwner);
      }
    }

    /**
     * @dev Get operating status of contract
     */
    function isOperational() public view returns (bool) {
      return operational;
    }

    /**
     * @dev Sets contract operations on/off
     */
    function setOperatingStatus(bool _mode) external requireContractOwner {
      operational = _mode;
    }

    /**
     * @dev Authorizes a contract which can call functions on this contract
     */
    function authorizeContract(address _address) public requireIsOperational requireContractOwner {
      authorizedContracts[_address] = 1;
    }

    /**
     * @dev Deauthorizes a contract which can call functions on this contract
     */
    function deAuthorizeContract(address _address) external requireIsOperational requireContractOwner {
      delete authorizedContracts[_address];
    }

    /** 
    /@dev checks if an address belongs to an airline
    */
    function isAirline(address _address) public view requireIsOperational returns (bool) {
      return (airlines[_address].isValue);
    }

    /**
    /@dev returns if a flight id is already registered
     */
    function isFlight(bytes32 _flightId) public view requireIsOperational returns (bool) {
      return (flights[_flightId].isValue);
    }

    /**
    /@dev registers a flight
     */
    function registerFlight(bytes32 _flightId, address _airline, string _flight, uint256 _timestamp) external requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the flight id is not already registered
      require(!isFlight(_flightId), "flight is already registered");

      // Adds the new flight object to the contract data
      flights[_flightId] = Flight({
        flight: _flight,
        airline: _airline,
        timestamp: _timestamp,
        isValue: true
      });

      // Keeps track of the flight ids per airline - since we can not iterate a dictionary
      // this will allow us to easily return all flights registred per airline
      airlineFlights[_airline].push(_flightId);

      return true;
    }

    /**
    /@dev returns the number of flights per airline this is so we can iterate on contract calls because of the inability
    / to return an array of strings in the solidity version being used for this exercise
     */
    function flightsPerAirlineCount(address _airline) external requireIsOperational requireCallerAuthorized returns (uint256 count) {
      count = airlineFlights[_airline].length;
      return (count);
    }

    /**
    /@dev returns the flight information given an index
     */
    function getFlight(address _airline, uint256 index) external requireIsOperational requireCallerAuthorized returns (string flight, uint256 timestamp) {
      bytes32 flightId = airlineFlights[_airline][index];
      flight = flights[flightId].flight;
      timestamp = flights[flightId].timestamp;
      return (flight, timestamp);
    }

    /**
    /@dev registers a new airline
     */
    function registerAirline(string _name, address _address, uint256 _state) external requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the ariline address is not already registred
      require(!isAirline(_address), "airline is already registered");

      airlines[_address] = Airline({
        name: _name,
        state: _state,
        balance: 0,
        isValue: true
      });

      return true;
    }

    /**
    / @dev updates a registerd airline
     */
    function updateAirline(address _address, uint256 _state) external requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the address belong to an airline
      require(isAirline(_address), "airline is not registered");

      // Updates the state of the airline
      airlines[_address].state = _state;

      return true;
    }

    /**
    /@dev returns airline state by its id
     */
    function getAirlineState(address _address) external view requireIsOperational requireCallerAuthorized returns (uint256 state) {
      // Returns the airline state
      return (airlines[_address].state);
    }

    /**
    /@dev returns airline information by its id
     */
    function getAirline(address _address) external view requireIsOperational requireCallerAuthorized returns (string name, uint256 state) {
      // Returns a map with the airline information
      return (airlines[_address].name, airlines[_address].state);
    }

    /**
    /@dev returns a key for the combination of insuree - flight
     */
    function getInsuranceKey(address _insuree, bytes32 _flightId) internal pure returns (bytes32) {
      return keccak256(abi.encodePacked(_insuree, _flightId));
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     */
    function fund(address _address, uint256 _amount) external payable requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the address belongs to an airline
      require(isAirline(_address), "airline is not registered");

      contractOwner.transfer(msg.value);

      // Increments the balance available for the ariline
      airlines[_address].balance = airlines[_address].balance.add(_amount);

      return true;
    }

    /**
     * @dev Buy insurance for a flight
     */
    function buy(address _insuree, address _airline, bytes32 _flightId, uint256 _paidAmount, uint256 _insuranceAmount) external requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the flight id is valid
      require(isFlight(_flightId), "flight is not registered");

      // gets a key for the insuree to make sure we are not allowing multiple
      // insurances for the same flight
      bytes32 key = getInsuranceKey(_insuree, _flightId);

      require(
        !insurances[key].isValue,
        "insurance has already being purchased"
      );

      // Genertaes a new insurance object for this flight
      insurances[key] = Insurance({
        insuree: _insuree,
        airline: _airline,
        flightId: _flightId,
        paidAmount: _paidAmount,
        insuranceAmount: _insuranceAmount,
        state: InsuranceState.Submitted,
        isValue: true
      });

      // saves the insurance key by flight id - this is so its fast
      // to retrieve all of the insurees when we need to credit them
      insurees[_flightId].push(key);

      return true;
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 _flightId) external requireIsOperational requireCallerAuthorized returns (bool success) {
      // verifies the flight id is valid
      require(isFlight(_flightId), "flight is not registered");

      // gets all the insurees per flight
      bytes32[] storage keys = insurees[_flightId];

      for (uint256 i = 0; i < keys.length; i++) {
        Insurance storage insurance = insurances[keys[i]];

        // Validates the insurance amount has not been credited yet
       if (insurance.state == InsuranceState.Submitted) {
          // updates the state of the insurance so it can not be credited again
          insurance.state = InsuranceState.Credited;

          // Adds balance avaiable to withdraw to the insuree. An insuree can have balance from multiple insurances, so it acumulates
          insureesBalance[insurance.insuree] = insureesBalance[insurance.insuree].add(insurance.insuranceAmount);

          // reduces the amount available for the airline - we could add a check
          // so we stop paying insurances if the airline has no more funds. In this case
          // we will end up with an airline with a negative balance
          airlines[insurance.airline].balance = airlines[insurance.airline].balance.sub(insurance.insuranceAmount);
        }
      }

      return true;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function getBalance(address _insuree) external requireIsOperational requireCallerAuthorized returns (uint256 balance) {
      return insureesBalance[_insuree];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function pay(address _insuree) external requireIsOperational requireCallerAuthorized returns (bool success) {
      require(
        insureesBalance[_insuree] > 0,
        "insuree has no balance available to withdraw"
      );

      // withdraws all the funds
      uint256 prev = insureesBalance[_insuree];
      insureesBalance[_insuree] = 0;
      _insuree.transfer(prev);

      return true;
    }

    /**
     * @dev Fallback function for funding smart contract.
     */
    function() external payable {}
}
