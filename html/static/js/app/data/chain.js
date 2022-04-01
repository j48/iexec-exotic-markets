import { exoticABI } from "./abi/exoticABI.js";

export const exoticAddress = "0x60f13BD221dA52d2ab2d2812D38dA930b561B78b";
export const oracleAddress = "0x8ecEDdd1377E52d23A46E2bd3dF0aFE35B526D5F";

export const chainData = {
    netId: 133,
    chainId: "0x85",
    rpcUrls: ["https://viviani.iex.ec"],
    chainName: "iExec Sidechain",
    nativeCurrency: {
    name: "vRLC",
    symbol: "vRLC",
    decimals: 18
    }
}

export const exoticContract = {
    address: exoticAddress,
    abi: exoticABI
};
