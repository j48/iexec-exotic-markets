import { nodeURL, exoticContract, valueDecimals } from "./data.js";

async function latestBlock() {
    web3.eth.getBlock("latest")
        .then( (currentBlock) => {
            console.log(currentBlock);
        });
    }


export async function verifyNetwork(){
    return await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
            chainId: "0x85",
            rpcUrls: [nodeURL],
            chainName: "iExec Sidechain",
            nativeCurrency: {
                name: "vRLC",
                symbol: "vRLC",
                decimals: 18
            }
        }]
    }).then((result) => {
            return true;
        })
        .catch((e) => {
            //console.log(e);
          return false;
        });;

}

// read events
const pastEvents = (contract, event, startBlock, indexedFilter, topicsFilter) =>
      contract
        .getPastEvents(event, {
        filter: indexedFilter,
        fromBlock: startBlock,
        topics: topicsFilter
        })
        .then((result) => {
            if(result){
                return result;
            }else{
                throw null;
            }
        })
        .catch((e) => {
            //console.log(e);
          return {error: e.message, msg:e.message};
        });

export async function eventData(eventName, filter="", topics="", pBlocks=100000) {
        const web3 = new Web3(nodeURL);

        return web3.eth.getBlock("latest")
        .then( (currentBlock) => {
              const startBlock = currentBlock.number - pBlocks;
              const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
              return pastEvents(contractConn, eventName, startBlock, filter, topics);
            })
        .then( (data) => {
            return data;
        })
    .catch((e) => {
      //console.log(e);
      return {error: e.message, msg:e.message};
    });
}




