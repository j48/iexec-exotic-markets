import { verifyNetwork } from "./app.js";
import { exoticContract, valueDecimals } from "./data.js";

//create market using metamask
async function createMarket(marketData, user) {
    const web3 = new Web3(window.ethereum);
    const addressChecksum = web3.utils.toChecksumAddress(user);

    if(!verifyNetwork()){
        // give error msg
        return false;

    }

    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);

    const data = await contractConn.methods.marketCreate(
        marketData.oracleId,
        marketData.oracleUri,
        marketData.value,
        marketData.stopTime,
        marketData.payoutTime,
        marketData.name).send({from:addressChecksum});

    return data;

}

export async function connectCreate() {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    //showAccount.innerHTML = account;

    if(!account){
        return false;
    }

    const verifiedNetwork = await verifyNetwork();

    if(!verifiedNetwork){
        // give error msg
        return false;

    }

    // check networkid here

    let web3Connect = document.getElementById("web3Connect");
    web3Connect.innerHTML = "connected as " + account;
    web3Connect.classList.remove("connection-inactive");
    web3Connect.classList.add("connection-active");

    // get user input and prepare for smart contract

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

        const marketData = {oracleId: OracleIdConvert,
                            oracleUri: OracleUidConvert,
                            value: valueConvert,
                            stopTime: stopTimeConvert,
                            payoutTime: payoutTimeConvert,
                            name: nameConvert};

        const results = await createMarket(marketData, account);

        if(results){
            runTaskButton.disabled = true;
            runTaskButton.classList.add("task-block");
        }

}

}


export function load(){
    const now = new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString().slice(0, 16);

    const bettingDeadline = document.getElementById("marketStop");
    const marketDeadline = document.getElementById("marketPayout");

    bettingDeadline.min= now;
    bettingDeadline.value= now;

    marketDeadline.min = now;
    marketDeadline.value = now;

    const connectButton = document.getElementById("web3Connect");
    //const showAccount = document.querySelector('.showAccount');

    connectButton.onclick = connectCreate;

}