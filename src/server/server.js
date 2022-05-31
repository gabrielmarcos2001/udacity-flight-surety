import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];

// Reference to the App Smart Contract
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

// Fee required to register an oracle
const fee = web3.utils.toWei("1", "ether");

// Constant with number of oracles to register
const ORACLES_COUNT = 10;
const oracles = [];

async function registerOracles(count) {
  const accounts = await web3.eth.getAccounts();
  for(let i=0; i<count; i++) {
    try {
      await flightSuretyApp.methods.registerOracle().send({from: accounts[i], value:fee, gas:2000000});
      oracles[i] = accounts[i];
      console.log(`Oracle was successfully registered for account: ${accounts[i]}`);
    } catch (e) {
      console.log(`there was an error registering oracle: ${e}`);
    }
  }
}

registerOracles(ORACLES_COUNT);

// Defines an array with all the status codes so we can randomly return one by the oracle when
// a flight status is requested
const STATUS_CODES = [0, 10, 20, 30, 40, 50];

async function processEvent(airline, flight, timestamp) {
  // iterates all registered oracles
  for (const address of oracles) {
    const indexes = await flightSuretyApp.methods.getMyIndexes().call({from: address, gas:1000000});

    for(let i=0; i<indexes.length; i++) {
      // Gets a random status index and submits the response
      const statusIndex = Math.round(Math.random()*STATUS_CODES.length-1);
      const status = STATUS_CODES[statusIndex];
      console.log(`submitting response with status: ${status} from oracle: ${address}`);
      try {
        await flightSuretyApp.methods.submitOracleResponse(indexes[i], airline, flight, timestamp, status).send( { from: address, gas:1000000 });
        console.log(`oracle response accepted`)
      }catch (e) {
        console.log(`oracle response not accepted: ${e}`);
      }
    }
  };
}

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    processEvent(event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp);
});

const app = express();
app.get('/api', (req, res) => {
  console.log('api called');
});

export default app;


