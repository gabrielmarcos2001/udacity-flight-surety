const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async function (deployer, accounts) {
    await deployer.deploy(FlightSuretyData);
    await deployer.deploy(FlightSuretyApp, FlightSuretyData.address);
    // Get deployed instance of Data contract, and set App as a valid caller.
    const instanceData = await FlightSuretyData.deployed();
    await instanceData.authorizeContract(FlightSuretyApp.address);
    let config = {
        localhost: {
            url: 'http://localhost:8545',
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
        }
    }
    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
}

// module.exports = function(deployer) {

//     let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
//     deployer.deploy(FlightSuretyData)
//     .then(() => {
//         return deployer.deploy(FlightSuretyApp,  FlightSuretyData.address)
//                 .then(()=> {
//                     console.log('llego aca 1')
//                     return FlightSuretyData.authorizeContract(FlightSuretyApp.address)
//                         .then(() => {
//                             let config = {
//                                 localhost: {
//                                     url: 'http://localhost:8545',
//                                     dataAddress: FlightSuretyData.address,
//                                     appAddress: FlightSuretyApp.address
//                                 }
//                             }
//                             fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
//                             fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
//                         });
//                 });
                
//     });
// }