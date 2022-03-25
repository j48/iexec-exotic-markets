import { nodeURL, exoticContract, valueDecimals, tokenDecimals, uriCharacters, resultEnum, statusEnum } from "./data.js";
import { verifyNetwork } from "./app.js";
import { prettyDate, addDecimal } from "./tools.js";

let connected = false;

// read market struct
async function getMarketData(marketId) {
    const web3 = new Web3(nodeURL);
    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
    const data = await contractConn.methods.marketData(marketId).call();

    return data;

}

export async function populateMarket(mId, marketData){
    // times
    const now = new Date();
    const payoutTime = new Date(parseInt(marketData.payoutTime) * 1000);
    const startTime = new Date(parseInt(marketData.startTime) * 1000);
    const stopTime = new Date(parseInt(marketData.stopTime) * 1000);
    const refundTime = new Date(parseInt(marketData.refundTime) * 1000);
    const drainTime = new Date(parseInt(marketData.drainTime) * 1000);
    const closeTime = new Date(parseInt(marketData.closeTime) * 1000);
    const oracleTime = new Date(parseInt(marketData.oracleTime) * 1000);

    const connectButton = document.getElementById("web3Connect");
    //const showAccount = document.querySelector('.showAccount');
    connectButton.onclick = connectWallet;

    // quick fix, update in v2
    // check is betting closed
    let marketStatusFix;
    let allowBetting = false;
    let userUpdateOracle = false;
    if(marketData.status == "1"){
        if(now > stopTime){
            if(now < payoutTime){

                marketStatusFix = "Betting closed, waiting for Market time to pass";

            }else{
                if(now < refundTime){

                    marketStatusFix = "Waiting for Close to start Payout";
                    userUpdateOracle = true;
                }else{
                    marketStatusFix = "Waiting for Close to start Refunds";
                }

                const closeButton = document.getElementById("closeButton");
                closeButton.value = "Close Market";
                closeButton.disabled = false;
                closeButton.classList.remove("task-block");
                closeButton.onclick = sendClose;

            }

        }else{
            marketStatusFix = "Betting Open";
            allowBetting = true;



        }
    }else{
        marketStatusFix = statusEnum[marketData.status];

    }

    // claim
    if(marketData.status == "3"){
        const claimButton = document.getElementById("claimButton");
        claimButton.value = "Claim Payout";
        claimButton.disabled = false;
        claimButton.classList.remove("task-block");
        claimButton.onclick = sendClaim;

    }else if(marketData.status == "4"){
        const claimButton = document.getElementById("claimButton");
        claimButton.value = "Get Refund";
        claimButton.disabled = false;
        claimButton.classList.remove("task-block");
        claimButton.onclick = sendClaim;

    }



    let oracleUri = marketData.oracleUri.slice(-uriCharacters);

    document.getElementById("marketName").value = marketData.name;
    document.getElementById("marketValue").value = addDecimal(marketData.value, valueDecimals);
    document.getElementById("marketPayout").value = prettyDate(payoutTime);
    document.getElementById("marketStatus").value = marketStatusFix;
    document.getElementById("marketResult").value = marketData.closeTime == "0" ? "-" : resultEnum[marketData.result];
    document.getElementById("marketStart").value = prettyDate(startTime);
    document.getElementById("marketStop").value = prettyDate(stopTime);
    document.getElementById("marketRefund").value = prettyDate(refundTime);
    document.getElementById("marketDrain").value = prettyDate(drainTime);
    document.getElementById("marketClose").value = marketData.closeTime == "0" ? "-" : prettyDate(closeTime);
    document.getElementById("marketOracleValue").value = marketData.oracleTime == "0" ? "-" : addDecimal(marketData.oracleValue, valueDecimals);
    document.getElementById("marketOracleTime").value = marketData.oracleTime == "0" ? "-" : prettyDate(oracleTime);
    document.getElementById("marketOracleId").value = marketData.oracleId;
    document.getElementById("marketOracleUri").value = oracleUri;
    document.getElementById("marketCreator").value = marketData.creator;
    document.getElementById("marketClaim").value = marketData.closeTime == "0" ? "-" : addDecimal(marketData.poolClaim, tokenDecimals);
    document.getElementById("marketPool").value = addDecimal(marketData.poolTotal, tokenDecimals);
    document.getElementById("marketBetUnder").value = addDecimal(marketData.poolUnder, tokenDecimals);
    document.getElementById("marketBetOver").value = addDecimal(marketData.poolTotal - marketData.poolUnder, tokenDecimals);

    document.getElementById("orderContainer").classList.remove("hide");
    document.getElementById("oracleContainer").classList.remove("hide");
    document.getElementById("tokensContainer").classList.remove("hide");

    const viewOracleButton = document.getElementById("viewOracleButton");
    viewOracleButton.classList.remove("task-block");
    viewOracleButton.classList.remove("hide");
    viewOracleButton.disabled = false;
    const viewOraclePage = () => { location.href='https://oracle-factory.iex.ec/gallery/' + oracleUri; }
    viewOracleButton.onclick = viewOraclePage;


    if(marketData.oracleTime == "0"){
        if(userUpdateOracle){
            const oracleButton = document.getElementById("updateOracleButton");
            oracleButton.classList.remove("task-block");
            oracleButton.classList.remove("hide");
            oracleButton.disabled = false;
            const openOraclePage = () => { location.href='https://oracle-factory.iex.ec/gallery/' + oracleUri; }
            oracleButton.onclick = openOraclePage;
        }
    }

    //add token button logic
    const underButton = document.getElementById("underButton");
    underButton.onclick = getUnderTokens;

    const overButton = document.getElementById("overButton");
    overButton.onclick = getOverTokens;

    async function getUnderTokens(){
        const tokenId = mId * 10 + 1;
        const balance = await tokenBalance(tokenId);
        document.getElementById("underTokens").value = balance;
        underButton.classList.add("task-block");
        underButton.disabled = true;

    }

    async function getOverTokens(){
        const tokenId = mId * 10 + 2;
        const balance = await tokenBalance(tokenId);
        document.getElementById("overTokens").value = balance;

        overButton.classList.add("task-block");
        overButton.disabled = true;

    }

    async function sendClaim(){
        const result = await confirmClaim(mId);

        const claimButton = document.getElementById("claimButton");
        claimButton.classList.add("task-block");
        claimButton.disabled = true;

    }

    async function sendClose(){
        const result = await confirmClose(mId);

        const closeButton = document.getElementById("closeButton");
        closeButton.classList.add("task-block");
        closeButton.disabled = true;

    }

    async function sendBetUnder(){
        let betValue = document.getElementById("betAmount").value;
        betValue = betValue;
        const result = await sendBet(mId, "1", betValue);

        betUnderButton.classList.add("task-block");
        betUnderButton.disabled = true;

    }

    async function sendBetOver(){
        let betValue = document.getElementById("betAmount").value;
        betValue = betValue;
        const result = await sendBet(mId, "2", betValue);

        betOverButton.classList.add("task-block");
        betOverButton.disabled = true;

    }

    async function connectWallet() {
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

        let web3button = document.getElementById("web3button");
        web3Connect.innerHTML = "connected as " + account;
        web3Connect.classList.remove("connection-inactive");
        web3Connect.classList.add("connection-active");
        connected = true;

        underButton.classList.remove("task-block");
        underButton.disabled = false;
        overButton.classList.remove("task-block");
        overButton.disabled = false;

        // add bet menu
        if(allowBetting){
            const betUnderButton = document.getElementById("betUnderButton");
            betUnderButton.disabled = false;
            betUnderButton.classList.remove("task-block");
            betUnderButton.onclick = sendBetUnder;

            const betOverButton = document.getElementById("betOverButton");
            betOverButton.disabled = false;
            betOverButton.classList.remove("task-block");
            betOverButton.onclick = sendBetOver;
        }

}


    /*
    if(eventData.error){
        dataContainer.innerHTML = eventData.error;
    }else if(eventData != null && eventData.length != 0){
        dataContainer.innerHTML = "";
        await addMarketsEvents(eventData, "dataContainer", "new");
    }else{
        dataContainer.innerHTML = "no market events found, contact admin";
    }
    */

    //const web3Status = document.getElementById("web3Status");
    //add metamask connection
    //let web3Connect = document.getElementById("web3Connect");
    //web3Connect.setAttribute("class", "connect-button connection-inactive");
    //web3Status.innerHTML = `<span>Connect Web3 Wallet</span>`;
    //web3Connect.onclick = connectWallet;

}

// get user market tokens
async function tokenBalance(tokenId) {
    const web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    //showAccount.innerHTML = account;

    if(!account){
        return false;
    }

    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
    //const payload = {account: user, id: tokenId};
    const data = await contractConn.methods.balanceOf(account, tokenId).call();

    return data;

}

async function confirmClaim(mId) {
    const web3 = new Web3(window.ethereum);
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

    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
    //const payload = {account: user, id: tokenId};
    const data = await contractConn.methods.marketClaim(mId).send({from: account});

    return data;

}

async function sendBet(mId, betType, betAmount) {
    const web3 = new Web3(window.ethereum);
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

    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
    // value is wei
    const data = await contractConn.methods.marketBet(mId, betType).send({from: account, value: betAmount});

    return data;

}

async function confirmClose(mId) {
    const web3 = new Web3(window.ethereum);
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

    const contractConn = new web3.eth.Contract(exoticContract.abi, exoticContract.address);
    //const payload = {account: user, id: tokenId};
    const data = await contractConn.methods.marketClose(mId).send({from: account});

    return data;

}

async function populateMarketData(mId) {
        return getMarketData(mId )
            .then( (results) => {
                return results;
            });
    }

async function fetchMarket(mId){
        const marketData = await populateMarketData(mId);

        // build table with data
        // console.log(marketData);
        if(marketData.startTime == "0"){
            titleContainer.innerHTML = "Market " + marketId + " does not Exist";
        }else{
            populateMarket(mId, marketData);
            }


    }

export async function load(p){
    const titleContainer = document.getElementById("market-title-h2");
    const marketId = p.get("id");

    if(Number.isSafeInteger(parseInt(marketId))){
        titleContainer.innerHTML = "Market " + marketId;
        // rate-limit?
        try {
            await fetchMarket(marketId);

        } catch (error) {
            const parsedError = {error:error.name,  msg:error.message};
            console.log(parsedError);
            // populate on screen error msg
        }

    } else{
        titleContainer.innerHTML = "No Market ID Found";
    }


}

