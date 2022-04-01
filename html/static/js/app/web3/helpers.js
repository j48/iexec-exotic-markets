import { chainData, exoticContract } from "../data/chain.js";
import { valueDecimals } from "../data/markets.js";

// combine get account, add, and verify into 1 function

export async function getAccount() {
    return await window.ethereum.request({
            method: 'eth_requestAccounts'
        }).then((result) => {
            return result[0];
        })
        .catch((e) => {
            //console.log(e);
            return false;
        });

}

export async function addNetwork() {
    return await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: chainData.chainId,
                rpcUrls: chainData.rpcUrls,
                chainName: chainData.chainName,
                nativeCurrency: {
                    name: chainData.nativeCurrency.name,
                    symbol: chainData.nativeCurrency.symbol,
                    decimals: chainData.nativeCurrency.decimals
                }
            }]
        }).then((result) => {
            return true;
        })
        .catch((e) => {
            //console.log(e);
            return false;
        });

}

export async function confirmNetwork(){
    return await window.ethereum.request({
            method: 'eth_chainId'
        }).then((result) => {
            if(result == chainData.chainId){
                // console.log(`chainId ${result} confirmed`)
                return true;
            }else{
                // throw error message
                return false;
            }
        })
        .catch((e) => {
            //console.log(e);
            return false;
        });


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
        if (result) {
            return result;
        } else {
            //throw null;
        }
    })
    .catch((e) => {
        //console.log(e);
        return {
            error: e.message,
            msg: e.message
        };
    });

export async function eventData(eventName, filter = "", topics = "", pBlocks = 0) {
    const web3 = new Web3(chainData.rpcUrls[0]);

    return web3.eth.getBlock("latest")
        .then((currentBlock) => {
            let startBlock = 0;
            if(pBlocks != 0){
                startBlock = currentBlock.number - pBlocks;
            }

            const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
            return pastEvents(contractConn, eventName, startBlock, filter, topics);
        })
        .then((data) => {
            return data;
        })
        .catch((e) => {
            //console.log(e);
            return {
                error: e.message,
                msg: e.message
            };
        });
}