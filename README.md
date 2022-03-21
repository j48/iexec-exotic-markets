# iexec-exotic-markets
 iexec exotic markets MVP ethdenver2022

this project is an over/under exotic market where users bet whether a certain iExec oracle value will be over or under the defined market value after the completion time. In cases where the value is equal, it is considered "over" as opposed to "under".


**V1**

- coded in vanilla JS
- all market data is fetched using on-chain events and filtering is done client-side
- betting is based on single-contract markets with unlimited shares
- for certain markets this betting format requires a buffer time between bets ending and time the market determination value can be set by the oracle

**V2+ (potential)**
- add a limit on shares for each market where creator sets initial price
- add ability to buy and sell shares to create a proper prediction market (would work like a DEX)
- create multi-contract markets
- create subgraph
- replace results based on event data with subgraph API support
- optimize smart contract (gas savings, remove redundancies...)
- add ability for different token based markets
- add multiple oracles for a final medianized/aggregate value
- add string and boolean based markets
- optimize website for more fluid design
- use node.js for easier integration into iExec dapp ecosystem for any future upgrades by community
- create a better user experience when connecting to oracle factory website
- add more user-friendly oracle read/update options
- add more wallet options

**Overview**

User must create a market with 5 times in mind

- market betting start - when the market is created
- market betting end - when all betting stops
- market close - when the markets associated oracle value can be used to determine the outcome of the market
- market pool refund - when all users can claim a full refund if market isnt closed in time
- market pool drain - when market creator can drain all funds still left in the pool

For example,

- ETH will be Over/Under 3000 after April 4, 2022
- Market created on April 1, 2022 when the createMarket function was used
- Betting ends on April 2, 2022 and users must wait until the market close time
- Market close begins on April 4, 2022 in which the market value can be set by the oracle and determine the outcome
- Market pool refund begins on April 5, 2022 if not closed within 24hrs
- Market pool drain can happen any time after April 4, 2023 where market creator can empty what is left in the market pool

betting in this format favors users that bid at the last moment for certain markets. This is why a limit on shares and trading of shares may be introduced in v2.

**Market Creation**

before a market is created the smart contract first verifies:
1) the oracle is valid and has already updated at least one (time>0)
2) returns a number (oracle factory has options to return bool and string)
3) the completion time is within the marketTime
4) name is under 32 bytes

When creating a market the user must supply both the oracle ID and UID as they are both different.
Market name should be both minimal and understandable as possible to reduce smart contract storage cost.
Full market name format should always be read as:

__name__ will be Over/Under __value__ after __endTime__


**Market Completion**

when the current time is after the market completion time:
1) no more bets are allowed
2) update the oracle using the oracle factory contract
3) close the market using this contract

in order to close a market:
1) oracle update time must be after the market completion time
2) market close time must be before refundTime

When a user successfully closes a market their claim is immediately called instead of having to run two transactions.

Since this is a smart contract it MUST be updated in order to close a market. The results are not updated automatically after market completion.

if the market is not closed before the refundTime:
1) the market can no longer be closed by a user
2) everyone that made a bet can make a 1:1 refund claim

note: Due to any fluctuations, a market can be "over" 1 second after the completion time but then become "under" minutes later. For example, you may create a market to predict weather the price of RLC will be over or under $5.00 after 24hrs. After 24 hours and 1 minute the price may be $5.05 but $4.95 25 hours later. Proper market results depend on game theory where winners will want to close the market ASAP to lock in their win. A reward mechanism for closing markets can be implemented if needed.

**Betting**

Currently only the main currency is used (ETH, xRLC). The ability to add specific token markets can be added in future ( WETH, WBTC, USDT).

**Payout**

Market payout is currently 1:1. If total market pool is 10 xRLC, the winners equally split the full 10 xRLC. Market creator could receive a % in the future.
When a market is closed winners can claim their payout. The specific market tokens the user holds are burned and then the user is sent their appropriate winnings.
After drainTime, the market creator can drain any unclaimed winnings or refunds if desired. This is a solution for any users that may lose their private key.


