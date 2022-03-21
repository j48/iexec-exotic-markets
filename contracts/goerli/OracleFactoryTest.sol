// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";


interface OracleCall{
    function getInt(bytes32) view external returns (int256, uint256);

}


contract OverUnderExoticMarket is Ownable, ERC1155Supply
{

    //using SafeMath for uint256; v2

    // markets can have 1 of 5 statuses
    //
    // markets in payoff/void mode are considered ended when pool = 0
    // optional for creator to "drain" a 0 pool just to set end status
    // beton - betting active, set when market created
    // betoff - betting no longer active, waiting for close time (never set, just a placeholder)
    // payout - set when market closed with valid oracle value update
    // void - market was not closed within time, set when closed after refund time
    // end - creator drained all funds after predefined drain time (drain is always optional)

    // status is mainly for event logging and tracking

    // for enum always set an implied none/0 value for index 0
    enum Status {
        NONE,
        BETON,
        BETOFF,
        PAYOUT,
        VOID,
        END
    }

    // user actions when interacting with closed market
    enum Action {
        NONE,
        BET,
        CLAIM,
        REFUND
    }

    // market results
    enum Result {
        NONE,
        UNDER,
        OVER,
        TIE
    }

    // storing ALL data in struct (v1) for readability and easy market lookup (it's dirty and beefy)
    // gas savings will come at a cost and may require separate database to track market data
    // full market name format should always be read as:
    // __name__ will be Over/Under __value__ after __endTime__
    // storing all times is essential or can have constant time offsets set by owner
    // design decisions are currently 100% for user experience while not using database

    struct Market {
        bytes32 oracleId;
        bytes32 oracleUri; // uri of oracle for direct link to oracle page

        uint40  startTime; // betting start
        uint40  stopTime; // betting stop
        uint40  payoutTime; // when maket is unlocked to accept oracle value for payout
        uint40  refundTime; // when market becomes void
        uint40  drainTime; // when creator can claim all pool funds
        uint40  closeTime; // when market is actually closed via contract function

        Status  status; // enums are 1 byte aka 256 max values (uint8)
        Result  result;

        uint40  oracleTime; // time when the oracle value was updated (really needed?)

        address creator; // uint160

        int256  value; // oracle factory uses int
        int256  oracleValue; // oracle value set when market closed

        uint256 poolTotal;
        uint256 poolClaim;

        uint256 poolUnder; // for determining over/under pool balance

        string  name; // always <= 32 bytes

    }

    // decide if owner or market creator define these times
    uint256 _refundTimeOffset =   86400; // using default of 1 day
    uint256 _marketTimeOffset = 2592000; // using default of 1 month
    uint256 _drainTimeOffset  = 5184000; // using default of 2 month

    // track market ids (updated at market creation)
    uint256 _markets;

    OracleCall public Oracle;

    // mapping market data to market id
    mapping(uint256 => Market) private _marketData;

    // events being used for populating dapp lists w/o database or subgraph

    // use current time to determine possible market status
	event MarketCreated(
        uint256 indexed marketId,
        address indexed user,
        string  name,
        int256  value,
        uint256 stopTime,
        uint256 payoutTime,
        uint256 refundTime,
        uint256 drainTime);

    // used for user history
    event UserAction(
        uint256 indexed marketId,
        address indexed user,
        Action  indexed action,
        uint256 amount,
        Result  result);

    constructor(address oracleFactoryAddr, string memory uri) ERC1155(uri){
        Oracle = OracleCall(oracleFactoryAddr);
    }

    // contract

    // catch error if non-int oracle type
    function oracleCall(bytes32 oracleId) private view returns (int256, uint256){
        // can get raw and convert here
        // unupdated oracle will return (0, 0)
        // undefined oracle will error
        try Oracle.getInt(oracleId) returns (int256 v, uint256 t) {
            return (v, t);
        } catch {
            revert("oracleId does not return number");
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
        _drainTimeOffset  = drainTimeOffset;
	}

    function updateOracle(address oracleFactoryAddr) external onlyOwner {
		Oracle = OracleCall(oracleFactoryAddr);
	}

    function marketData(uint256 marketId) public view returns (Market memory) {
        return _marketData[marketId];
    }

    function marketTotal() public view returns (uint256) {
        return _markets;
    }

    // creator
    function marketCreate(
        bytes32 oracleId,
        bytes32 oracleUri,
        int256  value,
        uint40  stopTime,
        uint40  payoutTime,
        string  memory name
    ) public {

        // time requirements
        require(block.timestamp <  stopTime,                            "invalid stop time");
        require(stopTime        <= payoutTime,                          "payout time not after stop time");
        require(payoutTime      <  block.timestamp + _marketTimeOffset, "payout time too far in future");
        require(bytes(name).length <= 32                              , "market name too long");
        require(bytes(name).length > 1                                , "market name too short");

        // verify valid oracle
        (int256 _value, uint256 _timestamp) = oracleCall(oracleId);

        require(_timestamp > 0, "oracle never been updated");
        require(_value % 1 >= 0, "invalid value requirement"); // add value logic here

        Market storage newMarket = _marketData[++_markets];

        newMarket.oracleId   = oracleId;
        newMarket.oracleUri  = oracleUri;
        newMarket.startTime  = uint40(block.timestamp);
        newMarket.stopTime   = stopTime;
        newMarket.payoutTime = payoutTime;
        newMarket.refundTime = uint40(payoutTime + _refundTimeOffset);
        newMarket.drainTime  = uint40(payoutTime + _refundTimeOffset + _drainTimeOffset);
        //newMarket.closeTime;
        newMarket.status     = Status.BETON;
        //newMarket.result;
        //newMarket.oracleTime;
        newMarket.creator    = msg.sender;
        newMarket.value      = value;
        //newMarket.oracleValue;
        //newMarket.poolTotal;
        //newMarket.poolClaim;
        newMarket.name       = name;

        emit MarketCreated(
            _markets,
            msg.sender,
            name,
            value,
            stopTime,
            payoutTime,
            block.timestamp + _refundTimeOffset,
            block.timestamp + _drainTimeOffset);

    }

    // add drain all function?
    // problem is if a user accidently sends to contract theres no way to drain without knowing if its associated with a market
    // would have to fully trust owner OR lose funds forever...
    // possible solution: only allow drain all if no active markets
    // owner could pause the creation of all new markets and/or wait for all markets to end, then drain

    function marketDrain(uint256 marketId) external {
        require(_marketData[marketId].closeTime != 0             , "market not closed");
        require(block.timestamp > _marketData[marketId].drainTime, "market cannot be drained yet");

        //drain pool
        if(_marketData[marketId].poolClaim > 0){
            payable(_marketData[marketId].creator).transfer(_marketData[marketId].poolClaim);
            _marketData[marketId].poolClaim = 0;
        }

        _marketData[marketId].status == Status.END;

    }

    // user
    function marketBet(uint256 marketId, uint8 bet) payable public {
        // verify valid market and bet
        require(_marketData[marketId].startTime > 0                    , "market does not exist");
        require(block.timestamp < _marketData[marketId].stopTime       , "market no longer accepting bets");
        require(msg.value > 0                                          , "no wager was sent");
        require(bet == uint8(Result.UNDER) || bet == uint8(Result.OVER), "bet is not valid");

        // mint market tokens
        _mint(msg.sender, marketId * 10 + bet, msg.value, "");

        // track balance of bets
        if(bet == uint8(Result.UNDER)){
            _marketData[marketId].poolUnder += msg.value;

        }

        // update market pool
        _marketData[marketId].poolTotal += msg.value;

        emit UserAction(marketId, msg.sender, Action.BET, msg.value, Result(bet));

    }

    function marketClose(uint256 marketId) public{
        // need to know if market was already updated with oracle value
        // can check status or for closeTime != 0
        // require(_marketData[marketId].status == Status.BETON, "market is not active");
        require(_marketData[marketId].closeTime == 0              , "market already closed");
        require(_marketData[marketId].payoutTime > 0              , "market does not exist" );
        require(block.timestamp > _marketData[marketId].payoutTime, "market cannot be closed yet");

        // close to payout status
        if(block.timestamp <= _marketData[marketId].refundTime){
            // since only 1 oracle with 2 possible results this does not need to be complicated
            (int256 oracleValue, uint256 oracleTimestamp) = oracleCall(_marketData[marketId].oracleId);

            require(oracleTimestamp > _marketData[marketId].payoutTime, "market oracle(s) not updated yet");

            if(oracleValue < _marketData[marketId].value){
                _marketData[marketId].result = Result.UNDER;
            }else{
                // ties goes to over
                _marketData[marketId].result = Result.OVER;
            }

            _marketData[marketId].oracleValue = oracleValue;
            _marketData[marketId].oracleTime = uint40(oracleTimestamp);
            _marketData[marketId].status = Status.PAYOUT;

        // close to refund/void status
        } else {
            _marketData[marketId].status = Status.VOID;

        }

        _marketData[marketId].closeTime = uint40(block.timestamp);
        _marketData[marketId].poolClaim = _marketData[marketId].poolTotal;

        // avoid 2nd tx for user that closes market
        // check if they hold tokens first?
        // will revert if closer has no winning tokens
        marketClaim(marketId);

    }

    // searches for winning tokens, burns them, returns winnings
    // losing tokens can just be manually burned
    // rethink this design
    function marketClaim(uint256 marketId) public {

        // tokens to payout will always be 1:1 in v1, v2 should use a DEX-like system per market
        if(_marketData[marketId].status == Status.PAYOUT){
            // winners split entire pool

            uint256 tokenId = marketId * 10 + uint256(_marketData[marketId].result);

            uint256 balance = balanceOf(msg.sender, tokenId);

            // cant throw an error here
            // would have to add check in the close function
            //require(balance > 0, "no winning tokens found for this market");
            if(balance == 0){
                return;
            }

            // need to know total amount of winning tokens left and what percent user controls
            uint256 payout = (balance/totalSupply(tokenId)) * _marketData[marketId].poolClaim;

            // not sure if this check is needed *TEST THIS*
            // prevent underflow
            // using percentages may cause a rounding error
            // a check like this would be beneficial as it can set END status on last claim... but worth the gas each tx?
            if (payout > _marketData[marketId].poolClaim){
                payout = _marketData[marketId].poolClaim;
                // _marketData[marketId].status == Status.END;

            }

            payable(msg.sender).transfer(payout);

            _burn(msg.sender, tokenId, balance);

            _marketData[marketId].poolClaim = _marketData[marketId].poolClaim - payout;

            emit UserAction(marketId, msg.sender, Action.CLAIM, payout, _marketData[marketId].result);

        } else if(_marketData[marketId].status == Status.VOID) {
            // users get full refund (always 1:1)
            // can move refund to its own function if it gets complicated

            // probably better to have seperate claims for each token/contract
            uint256 underBalance = balanceOf(msg.sender, marketId * 10 + uint256(Result.UNDER));
            uint256 overBalance  = balanceOf(msg.sender, marketId * 10 + uint256(Result.OVER));

            require(underBalance + overBalance > 0, "no tokens to refund"); // give user feedback

            uint256 refund;

            if(underBalance > 0){
                refund = underBalance;
                _burn(msg.sender, marketId * 10 + uint256(Result.UNDER), underBalance);
            }

            if(overBalance > 0){
                refund = refund + overBalance;
                _burn(msg.sender, marketId * 10 + uint256(Result.OVER), overBalance);
            }

            payable(msg.sender).transfer(refund);

            _marketData[marketId].poolClaim = _marketData[marketId].poolClaim - refund;

            emit UserAction(marketId, msg.sender, Action.REFUND, refund, Result.NONE);

        }else{
            require(_marketData[marketId].startTime > 0, "market does not exist");
            require(_marketData[marketId].closeTime > 0, "market not closed");
            revert("market ended"); // market drained by creator

        }

    }

}