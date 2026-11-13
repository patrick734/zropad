// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title ZRPD
 * @notice Zropad's token: 1,000,000,000 minted once, no owner, no further minting. Staking it earns
 * a share of every trading fee on Zropad (see ZropadStaking).
 */
contract ZRPD is ERC20, ERC20Burnable {
    constructor(address to) ERC20("Zropad", "ZRPD") {
        _mint(to, 1_000_000_000e18);
    }
}
