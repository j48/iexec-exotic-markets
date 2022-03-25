import { exoticABI } from "./abi/exoticABI.js";

export const nodeURL = "https://viviani.iex.ec";
export const exoticAddress = "0x57c28744fbc8C5437b68613503108b64C4eCB61e";

export const exoticContract = {address: exoticAddress, abi: exoticABI};

export const tokenDecimals = 9; // make object
export const valueDecimals = 18; // all main gas currency is always 18
export const uriCharacters = 24;


export const actionEnum = {"0": "None", "1": "Bet", "2": "Claim", "3": "Refund"};
export const resultEnum = {"0": "None", "1": "Under", "2": "Over", "3": "Tie"};
export const statusEnum = {
                    "0": "None",
                    "1": "Betting Open",
                    "2": "Betting Closed",
                    "3": "Payout Winners",
                    "4": "Market Voided",
                    "5": "Market Ended"
                    };