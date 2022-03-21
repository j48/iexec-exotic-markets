//createMarket
//returnValues
//drainTime: "1653001188"
//marketId: "1"
//name: "test market 1"
//payoutTime: "1647749110"
//refundTime: "1647827588"
//stopTime: "1647746110"
//user: "0xDdb291a72e9005bFB2c2F44Aca6bA5047318fd2D"
//value: "500"

const actionEnum = {"0": "None", "1": "Bet", "2": "Claim", "3": "Refund"};
const resultEnum = {"0": "None", "1": "Under", "2": "Over", "3": "Tie"};

const nodeURL = "https://goerli.infura.io/v3/2e1357de2d5041e8b4a7e9d09c1a28f2";
const marketAddress = "0x204AA0cC951D38A8E12a1CF70B220c2555c9A016";
const tokenDecimals = 18;
const valueDecimals = 18;
const uriCharacters = 24;

function addDecimal(num, move, fixed=18){
    return parseFloat(Number((parseInt(num) / 10**move).toFixed(fixed))).toFixed(fixed).replace(/\.?0+$/,"");

}

function prettyDate2(t){
  //return new Date(UNIX_timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return t.toISOString().slice(0, 19).replace('T', ' ');
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

function addMarketsEvents(data, elementId="dataContainer", action="new"){

    const table = document.getElementById(elementId);

    const currentEntryCount = table.querySelectorAll('.entry-container').length;

    // build new entries
    let newEntryCount = 1;

    data.forEach(entry => {

        const newEntry = document.createElement("div");
        const entryId = currentEntryCount + newEntryCount;

        newEntry.id = `entry-id-${entryId}`;
        newEntry.classList.add("entry-container");

        if(entryId % 2 == 0){
            newEntry.classList.add("entry-even");
        }else{
            newEntry.classList.add("entry-odd");
        }

        if(entryId == 1){
            //only id 1 has entry-start
            newEntry.classList.add("entry-start");
        }else{
            // remove previous entry as end
            // this will allow for transition
            const previousEntry = document.getElementById(`entry-id-${entryId-1}`);
            previousEntry.classList.remove("entry-end");
            if(entryId != 2){
                previousEntry.classList.add("entry-middle");
            }
        }

        let dataHTML;

        //main
        const mainData = document.createElement("div");
        mainData.classList.add("entry-markets-results");

        // events are not timestamped...
        //const entryDate = new Date(entry.timestamp).toLocaleString("en-US")

        // dates
        const now = new Date();
        const stopTime = new Date(entry.returnValues.stopTime * 1000);
        const payoutTime = new Date(entry.returnValues.payoutTime * 1000);
        const refundTime = new Date(entry.returnValues.refundTime * 1000);
        const drainTime = new Date(entry.returnValues.drainTime * 1000);

        // date color
        let stopTimeColor = "time-white";
        let payoutTimeColor = "time-white";
        let refundTimeColor = "time-white";
        let drainTimeColor = "time-white";

        if(now > stopTime){
            stopTimeColor = "time-red";
        }else{
            stopTimeColor = "time-green";
        }

        if(now > payoutTime){
            payoutTimeColor = "time-green";
        }

        if(now > refundTime){
            payoutTimeColor = "time-red";
            refundTimeColor = "time-green";
        }

        if(now > drainTime){
            drainTimeColor = "time-green";
             refundTimeColor = "time-red";
        }

        //convert value
        const convertedValue = addDecimal(entry.returnValues.value, valueDecimals);


        dataHTML = `
            <div class="entry-results-header">
                <div class="entry-results-header-left">
                    <div class="entry-results-callback-label">market</div>
                    <div class="entry-results-callback-data">${entry.returnValues.marketId}</div>
                </div>
                <div class="entry-results-header-right">
                    <div class="entry-results-timestamp">
                        <div class="entry-results-timestamp-label">block</div>
                        <div class="entry-results-timestamp-data">${entry.blockNumber}</div>
                    </div>
                </div>
            </div>
            <div class="entry-markets-results-body">
                <div class="entry-results-markets-body-left">
                    <div class="entry-results-result">
                        <div class="entry-results-title-container">
                        <div class="entry-results-title">${entry.returnValues.name}</div>
                        <div class="entry-results-title">over/under ${convertedValue}</div>
                        <div class="entry-results-title">after ${prettyDate(payoutTime)}</div>
                    </div>
                        <div class="entry-results-result-label">all betting stops at</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span ${stopTimeColor}">${prettyDate(stopTime)}</span>
                        </div>
                        <div class="entry-results-result-label">market can be closed after</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span ${payoutTimeColor}">${prettyDate(payoutTime)}</span>
                        </div>
                        <div class="entry-results-result-label">market must be closed before</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span ${refundTimeColor}">${prettyDate(refundTime)}</span>
                        </div>
                        <div class="entry-results-result-label">unclaimed funds can be drained after</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span ${drainTimeColor}">${prettyDate(drainTime)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="input-container">
					<input class="button market-active" type="button" value="View Market" onclick="location.href='./market.html?id=${entry.returnValues.marketId}'" />
				</div>

            `;
        mainData.innerHTML = dataHTML;
        newEntry.appendChild(mainData);

        // details
        const subData = document.createElement("div");
        subData.classList.add("entry-details");
        subData.classList.add("entry-hide");

        newEntry.appendChild(subData);
        newEntry.classList.add("entry-end");

        table.appendChild(newEntry);

        ++newEntryCount;

        });

}

export async function load(eventData){
    const dataContainer = document.getElementById("dataContainer");

    if(eventData.error){
        dataContainer.innerHTML = eventData.error;
    }else if(eventData != null && eventData.length != 0){
        dataContainer.innerHTML = "";
        await addMarketsEvents(eventData, "dataContainer", "new");
    }else{
        dataContainer.innerHTML = "no market events found, contact admin";
    }

    //const web3Status = document.getElementById("web3Status");
    //add metamask connection
    //let web3Connect = document.getElementById("web3Connect");
    //web3Connect.setAttribute("class", "connect-button connection-inactive");
    //web3Status.innerHTML = `<span>Connect Web3 Wallet</span>`;
    //web3Connect.onclick = connectWallet;

}