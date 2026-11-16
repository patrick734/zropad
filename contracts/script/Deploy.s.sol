// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Zropad} from "../src/Zropad.sol";
import {PlatformToken} from "../src/PlatformToken.sol";
import {ZropadStaking} from "../src/ZropadStaking.sol";

/**
 * Deploys the launchpad: the hub (with the coin and market templates), the platform token and its staking.
 *
 *   OWNER=0x... TREASURY=0x... forge script script/Deploy.s.sol --rpc-url $RPC --account <keystore> --broadcast
 *
 * Optional: GRADUATION (native raised at graduation, default 4.2e18), LAUNCH_FEE (default 0.0005e18),
 * JACKPOT_MIN_BUY (default 0.005e18), TOKEN_NAME and TOKEN_SYMBOL (the platform token; default
 * "Elypad Zero" / "ZRPD"). The platform token's whole supply goes to TREASURY.
 */
contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("OWNER");
        address treasury = vm.envAddress("TREASURY");
        uint256 graduation = vm.envOr("GRADUATION", uint256(4.2 ether));
        Zropad.Config memory c = curveFor(graduation);
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
        PlatformToken zrpd = new PlatformToken(vm.envOr("TOKEN_NAME", string("Elypad Zero")), vm.envOr("TOKEN_SYMBOL", string("ZRPD")), treasury);
        ZropadStaking staking = new ZropadStaking(zrpd);
        hub.setStaking(address(staking));
        if (owner != deployer) hub.transferOwnership(owner); // the owner accepts with acceptOwnership()
        vm.stopBroadcast();

        console2.log("ZROPAD=%s", address(hub));
        console2.log("TOKEN=%s", address(zrpd));
        console2.log("TOKEN_SYMBOL=%s", zrpd.symbol());
        console2.log("STAKING=%s", address(staking));
    }

    /**
     * Curve that sells 800M coins and raises `graduation` native, then opens a pool with the other
     * 200M at the curve's last price: with S = 800M, L = 200M, the final virtual coins x = L*S/(S-L),
     * virtualToken = S + x and virtualNative = graduation * x / S.
     */
    function curveFor(uint256 graduation) internal pure returns (Zropad.Config memory c) {
        uint256 s = 800_000_000e18;
        uint256 l = 200_000_000e18;
        uint256 x = (l * s) / (s - l);
        c.curveSupply = uint128(s);
        c.virtualToken = uint128(s + x);
        c.virtualNative = uint128((graduation * x) / s);
    }
}
