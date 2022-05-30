var HDWalletProvider =  require("@truffle/hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },

    // develop: {
    //   host: "127.0.0.1",
    //   port: 8545,
    //   network_id: "*" // Match any network id
    // },
    

    // rinkeby: {
    //   provider: () => new HDWallet(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),
    //     network_id: 4,       // rinkeby's id
    // },
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};

// module.exports = {
//   networks: {
//     development: {
//       provider: function() {
//         return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
//       },
//       network_id: '*',
//       gas: 9999999
//     }
//   },
//   compilers: {
//     solc: {
//       version: "^0.4.24"
//     }
//   }
// };