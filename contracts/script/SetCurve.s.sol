// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Zropad} from "../src/Zropad.sol";
import {Curve} from "./Curve.sol";

/**
 * Changes the bonding curve for new launches on an existing hub (coins already launched keep theirs).
 * Run by the hub's owner. Every other setting stays as it is.
 *
 *   HUB=0x... START_MC=1600000000000000000 forge script script/SetCurve.s.sol --rpc-url $RPC --account <keystore> --broadcast
 *
 * START_MC is the starting market cap in the native coin (wei); or give GRADUATION instead.
 */
contract SetCurve is Script {
    function run() external {
        Zropad hub = Zropad(payable(vm.envAddress("HUB")));
        uint256 graduation = Curve.graduationFrom(vm.envOr("START_MC", uint256(0)), vm.envOr("GRADUATION", uint256(0)));
        require(graduation > 0, "set START_MC or GRADUATION");

        Zropad.Config memory c;
        (
            c.launchFee,
            ,
            ,
            ,
            c.treasuryShareBps,
            c.stakersShareBps,
            c.jackpotShareBps,
            c.jackpotStart,
            c.jackpotExtend,
            c.jackpotMax,
            c.jackpotMinBuy,
            c.jackpotSeedBps
        ) = hub.config();
        (c.virtualNative, c.virtualToken, c.curveSupply) = Curve.forGraduation(graduation);

        vm.startBroadcast();
        hub.setConfig(c);
        vm.stopBroadcast();

        console2.log("GRADUATION=%s", graduation);
        console2.log("START_MC=%s", (graduation * 5) / 16);
    }
}
