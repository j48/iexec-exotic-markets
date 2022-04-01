// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

    /**
    * @dev
    * iExec oracle factory interface
    *
    */
interface OracleCall{
    function getInt(bytes32) view external returns (int256, uint256);

}

    /**
    * @dev
    * this contract allows for the creation of decentralized exotic prediction markets where users can predict
    * whether a certain on-chain oracle value will be over or under a predefined value after the completion time
    * this contract leverages the iExec Oracle Factory for oracle results
    * this contract is basically acts as the market creator and escrow to hold collateral for each market
    * when a user makes a prediction they are issued tokens tied to that specific market and outcome
    * after a market closes and the oracle value is verified
    * the user can swap their winning tokens for the appropriate percentage of the total market pool
    *
    * a refund time and drain time was incorporated to deal with unclaimed funds and old unclosed markets
    * game theory should solve most time issues
    *
    * contract was coded with the sole intention of only using events to display data in the frontend
    * thegraph will be incoroporated in any future updates
    *
    * contract was coded without researching any other prediction smart contracts for ideas
    * other (possibly better) solutions may be incoroprated in the future
    *
    */

contract ExoticMarkets is Ownable, ERC1155Supply
{

    enum Status {
        NONE,
        BETON,
        BETOFF,
        PAYOUT,
        VOID,
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

    /**
    * @dev
    *
    * storing ALL data in struct (v1) for readability and easy market lookup (it's dirty and beefy)
    * gas savings will come at a cost and may require separate database to track market data
    * full market name format should always be read as:
    * __name__ will be Over/Under __value__ after __stopTime__
    * storing all times is essential or can have constant time offsets set by owner
    * design decisions are currently 100% for user experience while not using database
    *
    */

    struct Market {
        bytes32 oracleId;
        bytes32 oracleUri;
        uint40  startTime;
        uint40  stopTime;
        uint40  payoutTime;
        uint40  refundTime;
        uint40  drainTime;
        uint40  closeTime;
        Status  status;
        Result  result;
        uint40  oracleTime;
        address creator;
        int256  value;
        int256  oracleValue;
        uint256 poolTotal;
        uint256 poolClaim;
        uint256 poolOver;
        string  name;

    }

    uint256 _refundTimeOffset =   86400; // 1 day
    uint256 _marketTimeOffset = 2592000; // 1 month
    uint256 _drainTimeOffset  = 5184000; // 2 months

    uint256 _markets;

    OracleCall public Oracle;

    mapping(uint256 => Market) private _marketData;

	event MarketCreated(
        uint256 indexed marketId,
        address indexed user,
        string  name,
        int256  value,
        uint256 stopTime,
        uint256 payoutTime,
        uint256 refundTime,
        uint256 drainTime
    );

    event UserAction(
        uint256 indexed marketId,
        address indexed user,
        Action  indexed action,
        uint256 amount,
        Result  result
    );

    constructor(address oracleFactoryAddr, string memory uri) ERC1155(uri){
        Oracle = OracleCall(oracleFactoryAddr);
    }

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

    /**
    * @dev
    * only creates market if the oracle has been updated before
    * will catch non-int oracles and revert
    *
    */

    function marketCreate(
        bytes32 oracleId,
        bytes32 oracleUri,
        int256  value,
        uint40  stopTime,
        uint40  payoutTime,
        string  memory name
    ) public {

        require(block.timestamp <  stopTime,                            "invalid stop time");
        require(stopTime        <= payoutTime,                          "payout time not after stop time");
        require(payoutTime      <  block.timestamp + _marketTimeOffset, "payout time too far in future");
        require(bytes(name).length <= 32                              , "market name too long");
        require(bytes(name).length > 1                                , "market name too short");

        int256 oracleValue;
        uint256 oracleTime;

        try Oracle.getInt(oracleId) returns (int256 _oV, uint256 _oT) {
            oracleValue = _oV;
            oracleTime = _oT;
        } catch {
            revert("oracleId does not return number");
        }

        require(oracleTime > 0, "oracle never been updated");

        Market storage newMarket = _marketData[++_markets];

        newMarket.oracleId   = oracleId;
        newMarket.oracleUri  = oracleUri;
        newMarket.startTime  = uint40(block.timestamp);
        newMarket.stopTime   = stopTime;
        newMarket.payoutTime = payoutTime;
        newMarket.refundTime = uint40(payoutTime + _refundTimeOffset);
        newMarket.drainTime  = uint40(payoutTime + _refundTimeOffset + _drainTimeOffset);
        newMarket.status     = Status.BETON;
        newMarket.creator    = msg.sender;
        newMarket.value      = value;
        newMarket.name       = name;

        emit MarketCreated(
            _markets,
            msg.sender,
            name,
            value,
            stopTime,
            payoutTime,
            payoutTime + _refundTimeOffset,
            payoutTime + _refundTimeOffset + _drainTimeOffset
        );

    }

    /**
    * @dev
    *
    * problem is if a user accidently sends to contract theres no way to drain without knowing if its associated with a market
    * would have to fully trust owner OR lose funds forever...
    * possible solution: only allow drain all if no active markets (keep a count)
    * owner could pause the creation of all new markets and/or wait for all markets to end, then drain
    *
    */

    function marketDrain(uint256 marketId) external {
        require(_marketData[marketId].closeTime != 0             , "market not closed");
        require(block.timestamp > _marketData[marketId].drainTime, "market cannot be drained yet");

        if(_marketData[marketId].poolClaim > 0){
            payable(_marketData[marketId].creator).transfer(_marketData[marketId].poolClaim);
            _marketData[marketId].poolClaim = 0;
        }

        _marketData[marketId].status == Status.END;

    }

    /**
    * @dev
    *
    * coded for only over or under value
    * mints tokens 1:1 with wei amount
    * tokenId is just market plus the bet over/under enum value
    * tracks under pool amount so user can get the total over/under bet amounts
    *
    * for multi-value markets in future just use
    * keccak256(abi.encode(marketId, bet)) for tokenId
    *
    */

    function marketBet(uint256 marketId, uint8 bet) payable public {

        require(block.timestamp < _marketData[marketId].stopTime       , "market not accepting bets");
        require(msg.value > 0                                          , "no wager was sent");
        require(bet == uint8(Result.UNDER) || bet == uint8(Result.OVER), "bet is not valid");

        _mint(msg.sender, marketId * 10 + bet, msg.value, "");

        if(bet == uint8(Result.OVER)){
            _marketData[marketId].poolOver += msg.value;

        }

        _marketData[marketId].poolTotal += msg.value;

        emit UserAction(marketId, msg.sender, Action.BET, msg.value, Result(bet));

    }

    /**
    * @dev
    *
    * verifies market can be closed then gets oracle value
    * if within payout time verifies a proper oracle value then determines if over/under else voids market
    * when done, detemines if user has any winning tokens then runs claim function
    * if voided market, user has to claim after
    *
    * a tie goes to over
    *
    */

    function marketClose(uint256 marketId) public{

        require(_marketData[marketId].closeTime == 0              , "market already closed");
        require(_marketData[marketId].payoutTime > 0              , "invalid market" );
        require(block.timestamp > _marketData[marketId].payoutTime, "market cannot be closed yet");

        if(block.timestamp <= _marketData[marketId].refundTime){
            (int256 oracleValue, uint256 oracleTime) = Oracle.getInt(_marketData[marketId].oracleId);

            require(oracleTime > _marketData[marketId].payoutTime, "market oracle(s) not updated yet");

            if(oracleValue < _marketData[marketId].value){
                _marketData[marketId].result = Result.UNDER;
            }else{
                _marketData[marketId].result = Result.OVER;
            }

            _marketData[marketId].oracleValue = oracleValue;
            _marketData[marketId].oracleTime = uint40(oracleTime);
            _marketData[marketId].status = Status.PAYOUT;

        } else {
            _marketData[marketId].status = Status.VOID;

        }

        _marketData[marketId].closeTime = uint40(block.timestamp);
        _marketData[marketId].poolClaim = _marketData[marketId].poolTotal;

        if(balanceOf(msg.sender, marketId * 10 + uint8(_marketData[marketId].result)) > 0){
            marketClaim(marketId);
        }

    }

    /**
    * @dev
    *
    * searches for winning tokens, burns them, returns payout
    * losing tokens can just be manually burned
    * tokens to payout will always be 1:1 in this version, future could use a DEX-like system per market
    *
    * need to test the porportion calculation since there are decimals
    * can round up and last claim will always get less
    *
    * dont have to check for winning supply > 0 since user wont have any winning tokens anyways
    *
    * might make sense to have separate refund function
    *
    */

    function marketClaim(uint256 marketId) public {

        if(_marketData[marketId].status == Status.PAYOUT){

            uint256 tokenId = marketId * 10 + uint256(_marketData[marketId].result);
            uint256 balance = balanceOf(msg.sender, tokenId);

            require(balance > 0, "no winning tokens");

            uint256 payout = (balance * _marketData[marketId].poolClaim / totalSupply(tokenId) * 10 + 5) / 10;

            if (payout > _marketData[marketId].poolClaim){
                payout = _marketData[marketId].poolClaim;

            }

            payable(msg.sender).transfer(payout);

            _burn(msg.sender, tokenId, balance);

            _marketData[marketId].poolClaim = _marketData[marketId].poolClaim - payout;

            emit UserAction(marketId, msg.sender, Action.CLAIM, payout, _marketData[marketId].result);

        } else if(_marketData[marketId].status == Status.VOID) {

            uint256 underBalance = balanceOf(msg.sender, marketId * 10 + uint256(Result.UNDER));
            uint256 overBalance  = balanceOf(msg.sender, marketId * 10 + uint256(Result.OVER));

            require(underBalance + overBalance > 0, "no market tokens");

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
            // require(_marketData[marketId].startTime > 0, "invalid market");
            require(_marketData[marketId].closeTime > 0, "market not closed");
            // revert("market ended"); // market drained by creator

        }

    }

}