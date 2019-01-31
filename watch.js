const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const admin = require("firebase-admin");
var session = require('express-session')
var Web3 = require('web3');
var Promise = require('promise');
var await = require('await')``
var EthereumTx = require('ethereumjs-tx')
var keyth = require('keythereum');
var moment = require('moment-timezone');
var txutils = require('./lib/txutils.js')
var encryption = require('./lib/encryption.js')
var signing = require('./lib/signing.js')
var lightwallet = require('./lib/keystore.js')
var upgrade = require('./lib/upgrade.js')
var numberToBN = require('number-to-bn');
var elasticsearch = require('elasticsearch');
var await = require('await');
var request = require('request');
var dateFormat = require('dateformat');
var mysql = require('mysql');

var listenPort = "4000";
var gethIPCPath = "https://rinkeby.infura.io/v3/26b9e69bffe84bafbd0e16cbad56365f";


var RINKEBY_WSS = 'wss://rinkeby.infura.io/ws';
var provider = new Web3.providers.WebsocketProvider(RINKEBY_WSS);
var web3 = new Web3(provider);

const abi = [{ "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "from", "type": "address" }, { "indexed": true, "name": "to", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }];
const contractAddress = '0x41b7a0ae98212f423c01409c8a3958981d0cc5a3';
const code = '608060405234801561001057600080fd5b50610396806100206000396000f300608060405260043610610057576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806318160ddd1461005c57806370a0823114610087578063a9059cbb146100de575b600080fd5b34801561006857600080fd5b5061007161012b565b6040518082815260200191505060405180910390f35b34801561009357600080fd5b506100c8600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610131565b6040518082815260200191505060405180910390f35b3480156100ea57600080fd5b50610129600480360381019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061017a565b005b60005481565b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6040600481016000369050101561019057600080fd5b6101e282600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461032490919063ffffffff16565b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555061027782600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461033d90919063ffffffff16565b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3505050565b60006103328383111561035b565b818303905092915050565b60008082840190506103518482101561035b565b8091505092915050565b80151561036757600080fd5b505600a165627a7a7230582041d33868e2c825d9563ee8afe2d65cd121c2638eb5a4a239baf51c7f972e91880029';
//function transfer token

provider.on('error', e => {
    console.error('WS Infura Error', e);
});

provider.on('end', e => {
    console.log('WS closed');
    console.log('Attempting to reconnect...');
    provider = new Web3.providers.WebsocketProvider(RINKEBY_WSS);
    provider.on('connect', function () {
        console.log('WSS Reconnected');
    });
    web3.setProvider(provider);
    listening();
});

setInterval(function () {
    web3.eth.net.isListening().then(console.log('okay')).catch(e => {
        console.log('[ - ] Lost connection to the node, reconnecting');
        web3.setProvider(RINKEBY_WSS);
        listening();
    })
}, 200);

var myContract = new web3.eth.Contract(abi, contractAddress);
// Generate filter options
const options = {
    toBlock: 'latest'
}
console.log('Start programs !');
listening();
// Subscribe to Transfer events matching filter criteria
function listening() {

    myContract.events.Transfer({
        fromBlock: 0,
        toBlock: "latest"
    }, (error, event) => { console.log(event); })
        .on('data', (event) => {
            console.log(event); // same results as the optional callback above
            console.log('got transfer: ' + event);
            myContract.methods.balanceOf(event.returnValues.from)
                .call()
                .then((value, result = event) => {
                    console.log(result.returnValues.from + " : " + value / 10e17);
                    //updateBalance(result.returnValues.from, value / 10e17);
                }).catch(e => {
                    console.log(e);
                });

            myContract.methods.balanceOf(event.returnValues.to)
                .call()
                .then((value, result = event) => {
                    console.log(result.returnValues.to + " : " + value / 10e17);
                    //updateBalance(result.returnValues.to, value / 10e17);
                }).catch(e => {
                    console.log(e);
                });
        })
        .on('changed', (event) => {
            // remove event from local database
        })


}

function updateBalance(address, balance) {
    // A post entry.
    var postData = {
        address: address,
        balance: balance,
        updateTime: moment().tz("Asia/Bangkok").format()
    };

    // Get a key for a new Post.
    var newPostKey = address;

    // Write the new post's data simultaneously in the posts list and the user's post list.
    var updates = {};
    updates['/balanceOf/' + newPostKey] = postData;

    return admin.database().ref().update(updates);
}