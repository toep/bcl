"use strict";

const keypair = require('keypair');

const utils = require('./utils.js')

/**
 * A wallet is a collection of "coins", where a coin is defined as
 * a UTXO (unspent transaction output) and its associated
 * transaction ID and output index.
 * 
 * In order to spend the coins, we also hold the public/private keys
 * associated with each coin.
 * 
 * For simplicity, we use a JBOK ("just a bag of keys") wallet.
 */
module.exports = class Wallet {
  
  /**
   * Initializes an array for coins as well as an address->keypair map.
   * 
   * A coin is a triple of the UTXO, a transaction ID, and an output index,
   * in the form:
   * { output, txID, outputIndex }
   * 
   * An address is the hash of the corresponding public key.
   */
  constructor() {
    // An array of the UTXOs
    this.coins = [];

    // An address is the hash of the public key.
    // Its value is the public/private key pair.
    this.addresses = {};
  }

  /**
   * Return the total balance of all UTXOs.
   * 
   * @returns The total number of coins in the wallet.
   */
  get balance() {
    return this.coins.reduce((acc, {output}) => acc + output.amount, 0);
  }

  /**
   * Accepts and stores a UTXO and the information needed to create
   * the input to spend it.
   * 
   * @param {Object} utxo - The unspent transaction output.
   * @param {String} txID - The hex string representing the ID of the transaction
   *          where the UTXO was created.
   * @param {number} outputIndex - The index of the output in the transaction.
   */
  addUTXO(utxo, txID, outputIndex) {
    if (this.addresses[utxo.address] === undefined) {
      throw new Error(`Wallet does not have key for ${utxo.address}`);
    }

    // We store the coins in a queue, so that we spend the oldest
    // (and most likely finalized) first.
    this.coins.unshift({
      output: utxo,
      txID: txID,
      outputIndex: outputIndex,
    });
  }

  /**
   * Returns inputs to spend enough UTXOs to meet or exceed the specified
   * amount of coins.
   * 
   * Calling this method also **deletes** the UTXOs used. This approach
   * optimistically assumes that the transaction will be accepted.  Just
   * in case, the keys are not deleted.  From the blockchain and the
   * key pair, the wallet can manually recreate the UTXO if it fails to
   * be created.
   * 
   * If the amount requested exceeds the available funds, an exception is
   * thrown.
   * 
   * @param {number} amount - The amount that is desired to spend.
   * 
   * @returns An object containing an array of inputs that meet or exceed
   *    the amount required, and the amount of change left over.
   */
  spendUTXOs(amount) {
    if (amount > this.balance) {
      throw new Error(`Insufficient funds.  Requested ${amount}, but only ${this.balance} is available.`);
    }

    //each coins should contain { txID, outputIndex, pubKey, sig } 
    //
    // **YOUR CODE HERE**
    //
    let needed = [];
    for(let i = 0; i < this.coins.length; i++) {
      if(amount > 0) {
        let c = this.coins[i];
        c.pubKey = this.addresses[c.output.address].public;
        c.sig = utils.sign(this.addresses[c.output.address].private, c.output);
        needed.push(c);
        amount -= c.output.amount;
        delete c.output;
      }
      else {
        break;
      }
    }
    needed.forEach(element => {
      this.coins.splice(this.coins.indexOf(element), 1);
    });

    return {inputs: needed, changeAmt: -amount};

  }

  spendUTXOsFully(amount) {
    if (amount > this.balance) {
      throw new Error(`Insufficient funds.  Requested ${amount}, but only ${this.balance} is available.`);
    }

    //each coins should contain { txID, outputIndex, pubKey, sig } 

    let needed = [];
    for(let i = 0; i < this.coins.length; i++) {
      if(amount > 0) {
        let c = this.coins[i];
        c.pubKey = this.addresses[c.output.address].public;
        c.sig = utils.sign(this.addresses[c.output.address].private, c.output);
        needed.push(c);
        amount -= c.output.amount;
        delete c.output;
      }
      else {
        break;
      }
    }
    needed.forEach(element => {
      this.coins.splice(this.coins.indexOf(element), 1);
    });

    return {inputs: needed};

  }

  /**
   * Makes a new keypair and calculates its address from that.
   * The address is the hash of the public key.
   * 
   * @returns The address.
   */
  makeAddress() {
    let kp = keypair();
    let addr = utils.calcAddress(kp.public);
    this.addresses[addr] = kp;
    return addr;
  }

  getEligibilityAddress() {
    return this.eligibility_address;
  }

  saveElibilityProof() {
    let total_add = "";
    let keys = Object.keys(this.addresses)
    //let keys =[ ...this.addresses.keys() ];
    for(const k of keys) {
      total_add = this.addresses[k].public;
    }
    this.eligibility_address = total_add;
  }

  /**
   * Checks to see if the wallet contains the specified public key.
   * This function allows a client to check if a broadcast output
   * should be added to the client's wallet.
   * 
   * @param {String} address - The hash of the public key identifying an address.
   */
  hasKey(address) {
    return !!this.addresses[address];
  }
}
