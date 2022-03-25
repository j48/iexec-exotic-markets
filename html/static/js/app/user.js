import { resultEnum, actionEnum } from "./data.js";
import { eventData } from "./app.js";

function showEntryDetails(){
    const parentContainer = this.parentNode;

    // hide/show details
    const subDiv = parentContainer.getElementsByClassName("entry-details")[0];
    subDiv.classList.toggle("entry-hide");
    subDiv.classList.toggle("entry-show");

    //logo
    const expandOption = this.querySelector('.entry-expand-span');
    if(expandOption.dataset.show == "true"){
        expandOption.dataset.show = "false";
        expandOption.innerHTML = "Details ▼";

    }else{
        expandOption.dataset.show = "true";
        expandOption.innerHTML = "   Hide ▲";
    }

}

function addUserEvents(data, elementId="dataContainer", action="new"){
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
        mainData.classList.add("entry-user-results");
        mainData.onclick = showEntryDetails;

        // events are not timestamped...
        //const entryDate = new Date(entry.timestamp).toLocaleString("en-US")

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
            <div class="entry-user-results-body">
                <div class="entry-results-body-left">
                    <div class="entry-results-result">
                        <div class="entry-results-result-label">action</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span">${actionEnum[entry.returnValues.action]}</span>
                        </div>
                        <div class="entry-results-result-label">bet</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span">${resultEnum[entry.returnValues.result]}</span>
                        </div>
                        <div class="entry-results-result-label">amount</div>
                        <div class="entry-results-result-data">
                            <span class="uint256-span">${entry.returnValues.amount} tokens</span>
                        </div>
                    </div>
                </div>
                <div class="entry-results-body-right">
                    <span class="entry-expand-span" data-show="false">Details ▼</span>
                </div>
            </div>
            `;
        mainData.innerHTML = dataHTML;
        newEntry.appendChild(mainData);

        // details
        const subData = document.createElement("div");
        subData.classList.add("entry-details");
        subData.classList.add("entry-hide");

        dataHTML = `
            <div class="entry-details-left">
                <div class="entry-details-requester">
                    <div class="entry-details-requester-label">block hash</div>
                    <div class="entry-details-requester-data">${entry.blockHash}</div>
                </div>
                <div class="entry-details-resultsCallback">
                    <div class="entry-details-resultsCallback-label">signature</div>
                    <div class="entry-details-resultsCallback-data">
                    <span class="uint256-span">${entry.signature}</span>
                    </div>
                </div>
                <div class="entry-details-resultType">
                    <div class="entry-details-resultType-label">transaction hash</div>
                    <div class="entry-details-resultType-data">${entry.transactionHash}</div>
                </div>
           </div>
            `;
        
        subData.innerHTML = dataHTML;
        newEntry.appendChild(subData);
        newEntry.classList.add("entry-end");

        table.appendChild(newEntry);

        ++newEntryCount;

        });

}

export async function populateUserData(eventData){
    const dataContainer = document.getElementById("dataContainer");

    if(eventData.error){
        dataContainer.innerHTML = eventData.error;
    }else if(eventData != null && eventData.length != 0){
        dataContainer.innerHTML = "";
        await addUserEvents(eventData, "dataContainer", "new");
    }else{
        dataContainer.innerHTML = "no events found for user";
    }

    //const web3Status = document.getElementById("web3Status");
    //add metamask connection
    //let web3Connect = document.getElementById("web3Connect");
    //web3Connect.setAttribute("class", "connect-button connection-inactive");
    //web3Status.innerHTML = `<span>Connect Web3 Wallet</span>`;
    //web3Connect.onclick = connectWallet;

}

async function populateUserData(addr) {
        const filter = {user: addr };

        return eventData("UserAction", filter)
            .then( (results) => {
                return results;
            });
    }

async function searchUser(){
        // demo get user address
        const userAddress = "0xDdb291a72e9005bFB2c2F44Aca6bA5047318fd2D";
        const userData = await populateUserData(userAddress);
        const dataContainer = document.getElementById("dataContainer");

        // build table with data
        await populateUserData(userData.reverse());

        // disable
        // userSearchButton.disabled = true;

    }

export function load(){

    const userSearchButton = document.getElementById('userSearchButton');

    // enable button
    userSearchButton.disabled = false;
    userSearchButton.onclick = searchUser;

    // wait for click

}