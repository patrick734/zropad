// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Zropad} from "../src/Zropad.sol";
import {PlatformToken} from "../src/PlatformToken.sol";
import {ZropadStaking} from "../src/ZropadStaking.sol";
import {Curve} from "./Curve.sol";

/**
 * Deploys the launchpad: the hub (with the coin and market templates), the platform token and its staking.
 *
 *   OWNER=0x... TREASURY=0x... forge script script/Deploy.s.sol --rpc-url $RPC --account <keystore> --broadcast
 *
 * Optional: START_MC (a new coin's starting market cap in the native coin; graduation is 16x it) or
 * GRADUATION (native raised at graduation, default 4.2e18, starting market cap 5/16 of it), LAUNCH_FEE (default 0.0005e18),
 * JACKPOT_MIN_BUY (default 0.005e18), TOKEN_NAME and TOKEN_SYMBOL (the platform token; default
 * "Elypad Zero" / "ELYZ"). The platform token's whole supply goes to TREASURY.
 */
contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("OWNER");
        address treasury = vm.envAddress("TREASURY");
        uint256 graduation = Curve.graduationFrom(vm.envOr("START_MC", uint256(0)), vm.envOr("GRADUATION", uint256(4.2 ether)));
        Zropad.Config memory c;
        (c.virtualNative, c.virtualToken, c.curveSupply) = Curve.forGraduation(graduation);
        c.launchFee = uint128(vm.envOr("LAUNCH_FEE", uint256(0.0005 ether)));
        c.treasuryShareBps = 5_000;
        c.stakersShareBps = 3_000;
        c.jackpotShareBps = 2_000;
        c.jackpotStart = 1 hours;
        c.jackpotExtend = 30;
        c.jackpotMax = 24 hours;
        c.jackpotMinBuy = uint128(vm.envOr("JACKPOT_MIN_BUY", uint256(0.005 ether)));
        c.jackpotSeedBps = 1_000;

        vm.startBroadcast();
        address deployer = msg.sender;
        Zropad hub = new Zropad(deployer, treasury, c);
        PlatformToken zrpd = new PlatformToken(vm.envOr("TOKEN_NAME", string("Elypad Zero")), vm.envOr("TOKEN_SYMBOL", string("ELYZ")), treasury);
        ZropadStaking staking = new ZropadStaking(zrpd);
        hub.setStaking(address(staking));
        if (owner != deployer) hub.transferOwnership(owner); // the owner accepts with acceptOwnership()
        vm.stopBroadcast();

        console2.log("ZROPAD=%s", address(hub));
        console2.log("TOKEN=%s", address(zrpd));
        console2.log("TOKEN_SYMBOL=%s", zrpd.symbol());
        console2.log("STAKING=%s", address(staking));
        console2.log("GRADUATION=%s", graduation);
        console2.log("START_MC=%s", (graduation * 5) / 16);
    }
}
