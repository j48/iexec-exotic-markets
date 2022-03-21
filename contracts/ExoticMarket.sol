// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";


interface OracleCall{
    function getInt(bytes32) view external returns (int256, uint256);
}


contract OverUnderMarket is Ownable, ERC1155Supply
{

    enum Status {
        NONE,
        OPEN,
        CLAIM,
        REFUND,
        END
    }

    enum Action {
        NONE,
        BET,
        CLAIM,
        REFUND
    }

    enum Result {
        NONE,
        UNDER,
        OVER,
        TIE
    }

    // storing ALL data in struct in v1 for readability and easy market lookup (it's beefy)
    // gas savings will come at a cost and may require separate database to track market data
    // full market name format should always be read as:
    // __name__ will be Over/Under __value__ after __endTime__
    struct Market {
        bytes32 oracleId;
        int256 value; // oracle factory uses int
        uint256 endTime;
        uint256 startTime;
        uint256 refundTime;
        uint256 drainTime;
        uint256 closeTime; // when market is actually closed via contract function
        uint256 oracleTime;
        int256 oracleValue; // oracle value set when market closed
        uint256 poolTotal;
        uint256 poolClaim;
        uint256 oracleUri; // uri of oracle for direct link to oracle page
        address creator;
        Status status;
        Result result;
        string name; // reccomened limit to ~unit256
    }

    // decide if owner or market creator define these times
    uint256 _refundTimeOffset = 86400; // using default of 1 day
    uint256 _marketTimeOffset = 2630000; // using default of 1 month
    uint256 _drainTimeOffset = 31536000; // using default of 1 year

    // track market ids (updated at market creation)
    uint256 _markets = 0;

    OracleCall public Oracle;

    // mapping market data to market id
    mapping(uint256 => Market) private _marketData;

	event MarketUpdate(uint256 indexed marketId, address indexed user, int256 value, uint256 time, Status indexed status);
    event UserUpdate(uint256 indexed marketId, address indexed user, uint256 amount, Result result, Action indexed action);

    constructor(
        address oracleFactoryAddr,
        string memory uri
        )
    ERC1155(uri)
    {
        Oracle = OracleCall(oracleFactoryAddr);
    }

    // contract

    // catch error if non-int oracle type
    function oracleCall(bytes32 oracleId) public view virtual returns (int256, uint256){
        // can get raw and convert here
        try Oracle.getInt(oracleId) returns (int256 v, uint256 t) {
            return (v, t);
        } catch {
            revert("oracleId not valid or does not return an int");
        }

    }

    // owner
    function updateTimeOffsets(
	    uint256 marketTimeOffset,
	    uint256 refundTimeOffset,
	    uint256 drainTimeOffset
	)
	external onlyOwner {
		_marketTimeOffset = marketTimeOffset;
        _refundTimeOffset = refundTimeOffset;
        _drainTimeOffset = drainTimeOffset;
	}

    function marketData(uint256 marketId) public view returns (Market memory) {
        return _marketData[marketId];
    }

    // creator
    function marketCreate(
        bytes32 oracleId,
        int256 value,
        uint256 endTime,
        uint256 oracleUri,
        string memory name
    ) public {
        // time requirements
        require( endTime > block.timestamp, "market end time already past");
        require( endTime < block.timestamp + _marketTimeOffset, "market too far in future");

        //name requirements
        require( bytes(name).length <= 32, "market name too long");

        // verify valid oracle
        (int256 _value, uint256 _timestamp) = oracleCall(oracleId);

        require( _timestamp > 0, "oracle needs to be updated first");
        require( _value >= 0 || _value <= 0, "invalid oracle value format"); // add value logic here


        //Dataset memory dataset = _datasets[results.dataset];
        _marketData[++_markets] = Market(
            oracleId,
            value,
            endTime,
            block.timestamp,
            block.timestamp + _refundTimeOffset,
            block.timestamp + _drainTimeOffset,
            0,
            0,
            0,
            0,
            0,
            oracleUri,
            msg.sender,
            Status.OPEN,
            Result.NONE,
            name
        );

        emit MarketUpdate(_markets, msg.sender, value, endTime, Status.OPEN);

    }

    // add drain all function?
    // problem is if a user accidently sends to contract theres no way to drain without knowing if its associated with a market
    // would have to fully trust owner OR lose funds forever...
    // would adding an overall payment/token tracker be worth it?

    function marketDrain(uint256 marketId) external onlyOwner {
        require(_marketData[marketId].status == Status.CLAIM || _marketData[marketId].status == Status.REFUND , "market not closed yet");
        require(block.timestamp > _marketData[marketId].drainTime, "market can not be drained yet");

        //drain pool
        payable(msg.sender).transfer(_marketData[marketId].poolClaim);
        _marketData[marketId].poolClaim = 0;
        _marketData[marketId].status == Status.END;

        emit MarketUpdate(_markets, msg.sender, 0, block.timestamp, Status.END);

    }

    // user
    function marketBet(uint256 marketId, uint256 bet) payable public {
        // verify valid market and bet
        require(_marketData[marketId].status == Status.OPEN, "market is not open");

        require(block.timestamp < _marketData[marketId].endTime, "market end time has passed");

        require(msg.value > 0, "no wager was sent");

        Result result;

        if(bet == 1){
            result = Result.UNDER;
        }else if(bet == 2){
            result = Result.OVER;
        }else{
            revert("bet is not valid");
        }

        //build token id
        uint256 tokenId = (marketId * 10) + bet;

        // mint market tokens
        _mint(msg.sender, tokenId, msg.value, "");

        // update market pool
        _marketData[marketId].poolTotal += msg.value;

        emit UserUpdate(marketId, msg.sender, msg.value, result, Action.BET);

    }

    function marketClose(uint256 marketId) public{
        require(_marketData[marketId].status == Status.OPEN, "market is not open");

        require(block.timestamp > _marketData[marketId].endTime, "market betting still open");

        if(block.timestamp <= _marketData[marketId].refundTime){
            (int256 oracleValue, uint256 oracleTimestamp) = oracleCall(_marketData[marketId].oracleId);

            require(oracleTimestamp > _marketData[marketId].endTime, "market oracle not updated yet");

            if(oracleValue < _marketData[marketId].value){
                _marketData[marketId].result = Result.UNDER;
            }else{
                _marketData[marketId].result = Result.OVER;
            }

            _marketData[marketId].oracleValue = oracleValue;
            _marketData[marketId].oracleTime = oracleTimestamp;
            _marketData[marketId].closeTime = block.timestamp;
            _marketData[marketId].status = Status.CLAIM;

            emit MarketUpdate(_markets, msg.sender, oracleValue, _marketData[marketId].drainTime, Status.CLAIM);


        } else {
            _marketData[marketId].closeTime = block.timestamp;
            _marketData[marketId].status = Status.REFUND;
            _marketData[marketId].result = Result.NONE;

            emit MarketUpdate(_markets, msg.sender, 0, _marketData[marketId].drainTime, Status.REFUND);
        }

        marketClaim(marketId);

    }

    // searches for winning tokens, burns them, returns winnings
    // losing tokens can just be manually burned
    function marketClaim(uint256 marketId) public {

        // tokens to eth will always be 1:1
        if(_marketData[marketId].status == Status.CLAIM){
            // need total amount of winning tokens then calculate users percent take
            // winners split entire pool

            // get winning tokenId
            uint256 tokenId = marketId * 10 + uint256(_marketData[marketId].result);

            uint256 balance = balanceOf(msg.sender, tokenId);
            require(balance > 0, "no winning tokens found for this market");

            // need to know total amount of winning tokens left and what percent user controls
            uint256 payout = (balance/totalSupply(tokenId)) * _marketData[marketId].poolClaim;

            // not sure if this check is needed *TEST THIS*
            if (payout > _marketData[marketId].poolClaim){
                payout = _marketData[marketId].poolClaim;
            }

            payable(msg.sender).transfer(payout);
            _burn(msg.sender, tokenId, balance);
            _marketData[marketId].poolClaim = _marketData[marketId].poolClaim - payout;

            emit UserUpdate(marketId, msg.sender, payout, _marketData[marketId].result, Action.CLAIM);

        } else if(_marketData[marketId].status == Status.REFUND) {
            // everyone split entire pool (always 1:1)
            // user can have both over/under/multiple tokens ...
            // since only 2 options for now its not a big deal
            // can move refund to its own function if it gets complicated

            uint256 underBalance = balanceOf(msg.sender, marketId * 10 + uint256(Result.UNDER));
            uint256 overBalance  = balanceOf(msg.sender, marketId * 10 + uint256(Result.OVER));

            require( (underBalance + overBalance > 0) , "no tokens to refund for this market"); // give user feedback

            uint256 payout;

            if(underBalance > 1){
                payout = underBalance;
                _burn(msg.sender, tokenId, underBalance);
            }

            if(overBalance > 1){
                payout = payout + overBalance;
                _burn(msg.sender, (tokenId + 1), overBalance);
            }

            payable(msg.sender).transfer(payout);

            _marketData[marketId].poolClaim = _marketData[marketId].poolClaim - payout;

            emit UserUpdate(marketId, msg.sender, payout, _marketData[marketId].result, Action.REFUND);

        } else if(_marketData[marketId].status == Status.END){
            // can see instances where lost key is eventually found and creator feels generous
            // not burning tokens at this stage, user can manually burn if wanted
            // can add to if wanted
            revert("market drained and ended by creator");

        } else{
            // gas punishment for checking early or invalid market
            // this is just for user feedback
            require(_marketData[marketId].status != Status.OPEN, "market must be closed first");
            revert("market does not exist");

        }

    }

}