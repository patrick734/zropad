// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Zropad} from "../src/Zropad.sol";

/**
 * The bonding curve for a graduation amount. 800M coins sell on the curve and raise `graduation`
 * native; the other 200M open a pool at the curve's last price. With S = 800M and L = 200M, the final
 * virtual coins x = L*S/(S-L), virtualToken = S + x and virtualNative = graduation * x / S.
 *
 * A coin's starting market cap is then exactly 5/16 of `graduation` (0.3125x), and it graduates at
 * 16x its starting market cap. So for a starting market cap M, graduation = M * 16 / 5.
 */
library Curve {
    uint256 internal constant S = 800_000_000e18;
    uint256 internal constant L = 200_000_000e18;

    function forGraduation(uint256 graduation) internal pure returns (uint128 virtualNative, uint128 virtualToken, uint128 curveSupply) {
        uint256 x = (L * S) / (S - L);
        curveSupply = uint128(S);
        virtualToken = uint128(S + x);
        virtualNative = uint128((graduation * x) / S);
    }

    /// START_MC (native, in wei) when set, else GRADUATION, else 4.2.
    function graduationFrom(uint256 startMc, uint256 graduation) internal pure returns (uint256) {
        return startMc > 0 ? (startMc * 16) / 5 : graduation;
    }
}
