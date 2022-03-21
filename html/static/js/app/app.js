// clean this up lol

async function latestBlock() {
				web3.eth.getBlock("latest")
			.then( (currentBlock) => {
              console.log(currentBlock);
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
            if(result){
                return result;
            }else{
                throw null
            }
        })
        .catch((e) => {
            //console.log(e);
          return null;
        });

export async function eventData(contract, eventName, filter="", topics="", pBlocks=10000) {
        const web3 = new Web3("https://goerli.infura.io/v3/2e1357de2d5041e8b4a7e9d09c1a28f2");

        return web3.eth.getBlock("latest")
        .then( (currentBlock) => {
              const startBlock = currentBlock.number - pBlocks;
              const contractConn = new web3.eth.Contract(contract.abi, contract.address);
              return pastEvents(contractConn, eventName, startBlock, filter, topics);
            })
        .then( (eventData) => {
            return eventData;
        })
    .catch((e) => {
      //console.log(e);
      return {error: e};
    });
}

// read market struct
export async function marketData(contract, marketId) {
    const web3 = new Web3("https://goerli.infura.io/v3/2e1357de2d5041e8b4a7e9d09c1a28f2");
    const contractConn = new web3.eth.Contract(contract.abi, contract.address);
    const data = await contractConn.methods.marketData(marketId).call();

    return data;

}

//create market using metamask
export async function createMarket(contract, marketData, user) {
    const web3 = new Web3(window.ethereum);
    const contractConn = new web3.eth.Contract(contract.abi, contract.address);

    const data = await contractConn.methods.marketCreate(
    marketData.oracleId,
    marketData.oracleUri,
    marketData.value,
    marketData.stopTime,
    marketData.payoutTime,
    marketData.name).send({from:user});

    return data;

}


export async function connectMetaMask() {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    //showAccount.innerHTML = account;

    if(!account){
        return false;
    }
    let web3button = document.getElementById("web3button");
    web3Connect.innerHTML = "connected as " + account;


    const valueDecimals = 18;

    // get user input and prepare for smart contract

    console.log(accounts);

    const createButton = document.getElementById("runTaskButton");

    runTaskButton.disabled = false;
    runTaskButton.classList.remove("task-block");
    runTaskButton.onclick = sendCreateMarket;

    async function sendCreateMarket(){
        let nameConvert = document.getElementById("marketName").value;
        let valueConvert = document.getElementById("marketValue").value;
        let payoutTimeConvert = document.getElementById("marketPayout").value;
        let stopTimeConvert = document.getElementById("marketStop").value;
        let OracleIdConvert = document.getElementById("marketOracleId").value;
        let OracleUidConvert = document.getElementById("marketOracleUid").value;

        valueConvert = (valueConvert * 10 ** valueDecimals).toLocaleString('fullwide', {useGrouping:false});

        payoutTimeConvert = Math.floor(new Date(payoutTimeConvert).getTime() / 1000);
        stopTimeConvert = Math.floor(new Date(stopTimeConvert).getTime() / 1000);

        OracleUidConvert = "0x" + OracleUidConvert.padStart(64, '0')

        console.log(valueConvert, payoutTimeConvert, stopTimeConvert, OracleUidConvert, OracleIdConvert);

        const marketData = {oracleId: OracleIdConvert,
                            oracleUri: OracleUidConvert,
                            value: valueConvert,
                            stopTime: stopTimeConvert,
                            payoutTime: payoutTimeConvert,
                            name: nameConvert};

        const exoticContract = {address: "0x204AA0cC951D38A8E12a1CF70B220c2555c9A016", abi: exoticABI};
        const results = await createMarket(exoticContract, marketData, account);

        if(results){

        }
}

}

export async function connectMetaMask2() {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    //showAccount.innerHTML = account;

    if(!account){
        return false;
    }

    let web3button = document.getElementById("web3button");
    web3Connect.innerHTML = "connected as " + account;

}



