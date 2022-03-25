// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
* used to simulate Oracle Factory contract for testing on goerli
*
*/


contract OracleFactorySim is Ownable {
    // Data storage
    struct TimedRawValue {
        bytes value;
        uint256 date;
    }

    mapping(bytes32 => TimedRawValue) public values;

    // Event
    event ValueUpdated(
        bytes32 indexed id,
        uint256 date,
        bytes value
    );

    constructor(){
        // sample data

        // 1000.01
        // 0x0000000000000000000000000000000000000000000000000000000000000001
        values[bytes32(abi.encode(1))].date = 1600000000;
        values[bytes32(abi.encode(1))].value = abi.encode(1000010000000000000000);

        // 999.99
        // 0x0000000000000000000000000000000000000000000000000000000000000002
        values[bytes32(abi.encode(2))].date = 1600000000;
        values[bytes32(abi.encode(2))].value = abi.encode(999990000000000000000);

        // 1000
        // 0x0000000000000000000000000000000000000000000000000000000000000003
        // 0x0000000000000000000000000000000000000000000000000000000000000000
        values[bytes32(abi.encode(3))].date = 1600000000;
        values[bytes32(abi.encode(3))].value = abi.encode(1000000000000000000);

    }
    function receiveResult(bytes32 id, uint date, bytes memory value) external onlyOwner {
        // oracle factory int return has 18 decimal places like tokens
        // decimal:
        //  1000.99
        // int256:
        //  1000990000000000000000
        // bytes:
        //  0x0000000000000000000000000000000000000000000000364386dd8716430000

        values[id].date = date;
        values[id].value = value;

        emit ValueUpdated(id, date, value);
    }

    function getString(bytes32 _oracleId)
        public
        view
        returns (string memory stringValue, uint256 date)
    {
        bytes memory value = values[_oracleId].value;
        return (abi.decode(value, (string)), values[_oracleId].date);
    }

    function getRaw(bytes32 _oracleId)
        public
        view
        returns (bytes memory bytesValue, uint256 date)
    {
        bytes memory value = values[_oracleId].value;
        return (value, values[_oracleId].date);
    }

    function getInt(bytes32 _oracleId)
        public
        view
        returns (int256 intValue, uint256 date)
    {
        bytes memory value = values[_oracleId].value;
        return (abi.decode(value, (int256)), values[_oracleId].date);
    }

    function getBool(bytes32 _oracleId)
        public
        view
        returns (bool boolValue, uint256 date)
    {
        bytes memory value = values[_oracleId].value;
        return (abi.decode(value, (bool)), values[_oracleId].date);
    }

    function int2Bytes(int256 input) public pure returns (bytes memory){
        return abi.encode(input);
    }

    function bytes2Int(bytes memory input) public pure returns (int256){
        return abi.decode(input, (int256));
    }

}