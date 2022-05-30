import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

// TODO: Flight numbers and timestamps can be hardcoded in here
/// flights = [{'AB01', Date.now()}]
export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.airlines = [];
        this.passengers = [];
        
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            self.owner = accts[0];
            let counter = 1;
            // Uses first 5 addresses as airlines
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            // Uses 5th to 10th address as passengers
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    subscribeToEvents(callback) {
        this.flightSuretyApp.events.AirlineRegistered({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
        this.flightSuretyApp.events.AirlineApproved({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
        this.flightSuretyApp.events.AirlineFunded({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
        this.flightSuretyApp.events.InsurancePurchased({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
        this.flightSuretyApp.events.InsuranceWithdrawn({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
        this.flightSuretyApp.events.FlightRegistered({}, function(error, event){ 
            if (error) console.log(error);
        })
        .on('data', function(event){
            callback(event);
        });
    }

    getAirlineInfo(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods.fetchAirline().call({from: airline, gas:1000000}, callback);
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods.isOperational().call({from: self.owner, gas:1000000}, callback);
    }

    registerAirline(airline, name, callback) {
        let self = this;
        self.flightSuretyApp.methods.registerAirline(name).send({from: airline, gas:1000000}, callback);
    }

    registerFlight(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods.registerFlight(flight, timestamp).send({from: airline, gas:1000000}, callback);
    }

    getNumFlightsRegistered(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods.registerdFlightsCount().call({from: airline, gas:1000000}, callback);
    }

    getFlight(airline, index, callback) {
        let self = this;
        self.flightSuretyApp.methods.getFlightByIndex(index).call({from: airline, gas:1000000}, callback);
    }

    fundAirline(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods.fundAirline().send({from: airline, gas:1000000, value: self.web3.utils.toWei("10", "ether")}, callback);
    }

    purchaseInsurance(passenger, airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods.purchaseInsurance(airline, flight, timestamp).send({from: passenger, gas:1000000, value: self.web3.utils.toWei("1", "ether")}, callback);
    }

    getPassengerBalance(passenger, callback) {
        let self = this;
        self.flightSuretyApp.methods.getBalance().call({from: passenger, gas:1000000}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}