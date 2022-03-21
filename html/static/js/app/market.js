/*
closeTime: "0"
creator: "0xDdb291a72e9005bFB2c2F44Aca6bA5047318fd2D"
drainTime: "1653051663"
name: "RLC Price"
oracleId: "0x0000000000000000000000000000000000000000000000000000000000000001"
oracleTime: "0"
oracleUri: "0x0000000000000000000000000000000000000000000000000000000000000001"
oracleValue: "0"
payoutTime: "1647781972"
poolClaim: "0"
poolTotal: "555565555554"
poolUnder: "9999999"
refundTime: "1647867663"
result: "0"
startTime: "1647781263"
status: "1"
stopTime: "1647781972"
value: "50000"
*/

const nodeURL = "https://goerli.infura.io/v3/2e1357de2d5041e8b4a7e9d09c1a28f2";
const marketAddress = "0x204AA0cC951D38A8E12a1CF70B220c2555c9A016";
const tokenDecimals = 18;
const valueDecimals = 18;
const uriCharacters = 24;

const actionEnum = {"0": "None", "1": "Bet", "2": "Claim", "3": "Refund"};
const resultEnum = {"0": "None", "1": "Under", "2": "Over", "3": "Tie"};
const statusEnum = {
                    "0": "None",
                    "1": "Betting Open",
                    "2": "Betting Closed",
                    "3": "Payout Winners",
                    "4": "Market Voided",
                    "5": "Market Ended"
                    }


function addDecimal(num, move, fixed=18){
    return parseFloat(Number((parseInt(num) / 10**move).toFixed(fixed))).toFixed(fixed).replace(/\.?0+$/,"");

}

function removeDecimal(num, places){
    return Number((num / 100).toFixed(2));

}

function prettyDate(a){
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
  var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
  var time = month + ' ' + date + ', ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

export async function load(mId, marketData){
    // times
    const now = new Date();
    const payoutTime = new Date(parseInt(marketData.payoutTime) * 1000);
    const startTime = new Date(parseInt(marketData.startTime) * 1000);
    const stopTime = new Date(parseInt(marketData.stopTime) * 1000);
    const refundTime = new Date(parseInt(marketData.refundTime) * 1000);
    const drainTime = new Date(parseInt(marketData.drainTime) * 1000);
    const closeTime = new Date(parseInt(marketData.closeTime) * 1000);
    const oracleTime = new Date(parseInt(marketData.oracleTime) * 1000);

    // quick fix, update in v2
    // check is betting closed
    let marketStatusFix;
    if(marketData.status == "1"){
        if(now > stopTime){
            if(now < refundTime){

                marketStatusFix = "Waiting for Close to start Payout";
            }else{
                marketStatusFix = "Waiting for Close to start Refunds";
            }



        }else{
            marketStatusFix = "Betting Open";
            // add bet menu
            const betUnderButton = document.getElementById("betUnderButton");
            betUnderButton.disabled = false;
            betUnderButton.classList.remove("task-block");
            betUnderButton.onclick = sendBetUnder;

            const betOverButton = document.getElementById("betOverButton");
            betOverButton.disabled = false;
            betOverButton.classList.remove("task-block");
            betOverButton.onclick = sendBetOver;

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
    document.getElementById("marketResult").value = resultEnum[marketData.result];
    document.getElementById("marketStart").value = prettyDate(startTime);
    document.getElementById("marketStop").value = prettyDate(stopTime);
    document.getElementById("marketRefund").value = prettyDate(refundTime);
    document.getElementById("marketDrain").value = prettyDate(drainTime);
    document.getElementById("marketClose").value = marketData.closeTime == "0" ? "-" : prettyDate(closeTime);
    document.getElementById("marketOracleValue").value = marketData.oracleTime == "0" ? "not updated" : addDecimal(marketData.oracleValue, valueDecimals);
    document.getElementById("marketOracleTime").value = marketData.oracleTime == "0" ? "not updated" : prettyDate(oracleTime);
    document.getElementById("marketOracleId").value = marketData.oracleId;
    document.getElementById("marketOracleUri").value = oracleUri;
    document.getElementById("marketCreator").value = marketData.creator;
    document.getElementById("marketClaim").value = addDecimal(marketData.poolClaim, tokenDecimals);
    document.getElementById("marketPool").value = addDecimal(marketData.poolTotal, tokenDecimals);
    document.getElementById("marketBetUnder").value = addDecimal(marketData.poolUnder, tokenDecimals);
    document.getElementById("marketBetOver").value = addDecimal(marketData.poolTotal - marketData.poolUnder, tokenDecimals);

    document.getElementById("orderContainer").classList.remove("hide");
    document.getElementById("oracleContainer").classList.remove("hide");
    document.getElementById("tokensContainer").classList.remove("hide");


    if(marketData.oracleTime == "0"){
        const oracleButton = document.getElementById("updateOracleButton");
        oracleButton.classList.remove("task-block");
        oracleButton.classList.remove("hide");
        oracleButton.disabled = false;
        const openOraclePage = () => { location.href='https://oracle-factory.iex.ec/gallery/' + oracleUri; }
        oracleButton.onclick = openOraclePage;
    }

    //add token button logic
    const underButton = document.getElementById("underButton");
    underButton.onclick = getUnderTokens;
    underButton.classList.remove("task-block");
    underButton.disabled = false;

    const overButton = document.getElementById("overButton");
    overButton.onclick = getOverTokens;
    overButton.classList.remove("task-block");
    overButton.disabled = false;

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
        claimButton.classList.add("task-block");
        claimButton.disabled = true;

    }

    async function sendBetUnder(){
        let betValue = document.getElementById("betAmount").value;
        betValue = betValue;
        const result = await sendBet(mId, "1", betValue);

        document.getElementById("overTokens").value = balance;
        betUnderButton.classList.add("task-block");
        betUnderButton.disabled = true;

    }

    async function sendBetOver(){
        let betValue = document.getElementById("betAmount").value;
        betValue = betValue;
        const result = await sendBet(mId, "2", betValue);

        document.getElementById("overTokens").value = balance;
        betOverButton.classList.add("task-block");
        betOverButton.disabled = true;

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
    const contract = {address: marketAddress, abi: exoticABI};

    const contractConn = new web3.eth.Contract(contract.abi, contract.address);
    //const payload = {account: user, id: tokenId};
    const data = await contractConn.methods.balanceOf(account, tokenId).call();

    return data;

}

async function sendClaim(mId) {
    const web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    //showAccount.innerHTML = account;

    if(!account){
        return false;
    }
    const contract = {address: marketAddress, abi: exoticABI};

    const contractConn = new web3.eth.Contract(contract.abi, contract.address);
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

    const contract = {address: marketAddress, abi: exoticABI};

    const contractConn = new web3.eth.Contract(contract.abi, contract.address);
    // value is wei
    const data = await contractConn.methods.marketBet(mId, betType).send({from: account, value: betAmount});

    return data;

}