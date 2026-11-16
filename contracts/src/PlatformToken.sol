// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title PlatformToken
 * @notice The launchpad's platform token: 1,000,000,000 minted once, no owner, no further minting.
 * Staking it earns a share of every trading fee (see ZropadStaking). Name and ticker are set at deploy.
 */
contract PlatformToken is ERC20, ERC20Burnable {
    constructor(string memory name_, string memory symbol_, address to) ERC20(name_, symbol_) {
        _mint(to, 1_000_000_000e18);
    }
}
