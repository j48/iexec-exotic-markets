import { getAccount, addNetwork, confirmNetwork } from "./web3/helpers.js";
import { exoticContract } from "./data/chain.js";
import { valueDecimals } from "./data/markets.js";
import { sampleOracles } from "./data/oracles.js";


//create market using metamask
async function createMarket(marketData) {
    let web3Status = document.getElementById("web3Status");
    web3Status.innerHTML = "";
    const account = await getAccount();
        //showAccount.innerHTML = account;

        if (!account) {
            web3Status.innerHTML = "no accounts found";
            return false;
        }

    const networkAdded = await addNetwork();

    if (!networkAdded) {
        web3Status.innerHTML = "please switch to iExec Sidechain";
        return false;
    }

    const networkConfirmed = await confirmNetwork();

    if (!networkConfirmed) {
        web3Status.innerHTML = "not connected to iExec Sidechain, please switch networks";
        return false;
    }

    const web3 = new Web3(window.ethereum);
    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);

    // verify user data
    const contractData = contractConn.methods.marketCreate(
        marketData.oracleId,
        marketData.oracleUri,
        marketData.value,
        marketData.stopTime,
        marketData.payoutTime,
        marketData.name
    );
    // https://web3js.readthedocs.io/en/v1.7.1/callbacks-promises-events.html?highlight=%20Promises%20Events
    // cant catch user input errors in web3
    let data;
    try{
        data = await contractConn.methods.marketCreate(
            marketData.oracleId,
            marketData.oracleUri,
            marketData.value,
            marketData.stopTime,
            marketData.payoutTime,
            marketData.name
        ).send({
            from: account
        }).on('error', function(error){
            // code, message
            web3Status.innerHTML = error.message;
            return false;
        }).then((result, error) => {
            if (result) {
                return result;
            } else {

            }
        }).catch((e) => {
            //console.log(e);
            return false;;
        });
    }catch(error){
        // user out put error
        web3Status.innerHTML = "Error with user input";
        return false;

    }

    return data;

}

export async function connectCreate() {
    let web3Status = document.getElementById("web3Status");
    web3Status.innerHTML = "";

    const account = await getAccount();
        //showAccount.innerHTML = account;

        if (!account) {
            web3Status.innerHTML = "no accounts found";
            return false;
        }

    const networkAdded = await addNetwork();

    if (!networkAdded) {
        web3Status.innerHTML = "please switch to iExec Sidechain";
        return false;
    }

    const networkConfirmed = await confirmNetwork();

    if (!networkConfirmed) {
        web3Status.innerHTML = "not connected to iExec Sidechain, please switch networks";
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

    async function sendCreateMarket() {
        let nameConvert = document.getElementById("marketName").value;
        let valueConvert = document.getElementById("marketValue").value;
        let payoutTimeConvert = document.getElementById("marketPayout").value;
        let stopTimeConvert = document.getElementById("marketStop").value;
        let OracleIdConvert = document.getElementById("marketOracleId").value;
        let OracleUidConvert = document.getElementById("marketOracleUid").value;

        if(!nameConvert){
            web3Status.innerHTML = "enter a name";
            return false;

        }

        if(!valueConvert){
            web3Status.innerHTML = "enter a value";
            return false;

        }

        if(!OracleIdConvert){
            web3Status.innerHTML = "enter an oracle id";
            return false;

        }

        if(!OracleUidConvert){
            web3Status.innerHTML = "enter an oracle uid";
            return false;

        }

        payoutTimeConvert = Math.floor(new Date(payoutTimeConvert).getTime() / 1000);
        stopTimeConvert = Math.floor(new Date(stopTimeConvert).getTime() / 1000);

        if(stopTimeConvert > payoutTimeConvert){
            web3Status.innerHTML = "prediction deadline must be before market decision time";
            return false;

        }

        valueConvert = (valueConvert * 10 ** valueDecimals).toLocaleString('fullwide', {
            useGrouping: false
        });


        OracleUidConvert = "0x" + OracleUidConvert.padStart(64, '0')

        const marketData = {
            oracleId: OracleIdConvert,
            oracleUri: OracleUidConvert,
            value: valueConvert,
            stopTime: stopTimeConvert,
            payoutTime: payoutTimeConvert,
            name: nameConvert
        };

        const results = await createMarket(marketData, account);

        if (results) {
            runTaskButton.disabled = true;
            runTaskButton.classList.add("task-block");
        }

    }

}


export function load() {
    //const now = new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString().slice(0, 16);
    const now = new Date();

    const nowFormat = new Date(now.toString().split('GMT')[0]+ ' UTC').toISOString().slice(0, 16);

    // add 1 hour
    now.setHours( now.getHours() + 1 );

    const nowFormatFuture = new Date(now.toString().split('GMT')[0]+ ' UTC').toISOString().slice(0, 16);

    const marketCurrent = document.getElementById("marketCurrent");
    const bettingDeadline = document.getElementById("marketStop");
    const marketDeadline = document.getElementById("marketPayout");

    marketCurrent.value = nowFormat;
    bettingDeadline.value = nowFormatFuture;
    marketDeadline.value = nowFormatFuture;

    // populate oracles
    const oraclesList = document.getElementById("marketOracles");

    for(const o of sampleOracles){
        const oEntry = document.createElement("a");

        oEntry.classList.add("oracle-sample");
        oEntry.dataset.id = o.id;
        oEntry.dataset.uid = o.uid;
        oEntry.dataset.name = o.name;
        oEntry.innerHTML = o.name;
        oEntry.onmouseover = populateOracleData;
        oEntry.onclick = toggleLock;

        oraclesList.appendChild(oEntry);
    }

    const oracleButton = document.getElementById("viewOracleButton");

    oracleButton.onclick = viewOracle;
    oracleButton.disabled = false;
    oracleButton.classList.remove("task-block");

    const connectButton = document.getElementById("web3Connect");
    //const showAccount = document.querySelector('.showAccount');

    connectButton.onclick = connectCreate;

}

function populateOracleData() {
    if(this.parentElement.classList.contains("locked")){
        return;
    }
    // or use radio
    const siblings = this.parentElement.children;
    for(let sib of siblings) {
        sib.classList.remove("oracle-active");
    }
    this.classList.add("oracle-active");
    document.getElementById("marketName").value = this.dataset.name;
    document.getElementById("marketOracleId").value  = this.dataset.id;
    document.getElementById("marketOracleUid").value = this.dataset.uid;

}

function toggleLock(){
    this.parentElement.classList.toggle("locked");
    this.dispatchEvent(new MouseEvent('mouseover'));

}

function viewOracle(){
    const oracleUid = document.getElementById("marketOracleUid").value;

    if(!oracleUid){
        web3Status.innerHTML = "enter an oracle uid";
        return false;
    }

    // check formatting

    window.open(`https://oracle-factory.iex.ec/gallery/${oracleUid}`);

}