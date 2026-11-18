// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Zropad} from "../src/Zropad.sol";
import {PlatformToken} from "../src/PlatformToken.sol";
import {ZropadStaking} from "../src/ZropadStaking.sol";

/**
 * Deploys a new platform token and its staking for an existing hub, and points the hub's staker
 * share at it. Run by the hub's owner.
 *
 *   HUB=0x... TREASURY=0x... forge script script/DeployToken.s.sol --rpc-url $RPC --account <keystore> --broadcast
 *
 * Optional: TOKEN_NAME and TOKEN_SYMBOL (default "Elypad Zero" / "ELYZ"). The whole supply goes to TREASURY.
 */
contract DeployToken is Script {
    function run() external {
        Zropad hub = Zropad(payable(vm.envAddress("HUB")));
        address treasury = vm.envAddress("TREASURY");
        vm.startBroadcast();
        PlatformToken token = new PlatformToken(vm.envOr("TOKEN_NAME", string("Elypad Zero")), vm.envOr("TOKEN_SYMBOL", string("ELYZ")), treasury);
        ZropadStaking staking = new ZropadStaking(token);
        hub.setStaking(address(staking));
        vm.stopBroadcast();
        console2.log("TOKEN=%s", address(token));
        console2.log("TOKEN_SYMBOL=%s", token.symbol());
        console2.log("STAKING=%s", address(staking));
    }
}
