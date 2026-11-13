// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title ZropadToken
 * @notice A coin launched on Zropad: a plain ERC-20 with a fixed supply minted once to its market.
 * No owner, no mint after launch, no pause, no blacklist, no transfer tax.
 *
 * Deployed as a minimal clone and set up once by the Zropad hub. Its market can move coins out of
 * the seller's own balance when they sell, so selling needs no separate approval.
 */
contract ZropadToken is IERC20Metadata {
    string private _name;
    string private _symbol;
    /// @notice The coin's image / metadata link.
    string public uri;
    /// @notice The market the whole supply was minted to; it trades the coin.
    address public market;
    /// @notice Who launched it.
    address public creator;

    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    error AlreadyInitialized();
    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();

    /// @dev Called once by the hub, right after cloning.
    function initialize(string calldata name_, string calldata symbol_, string calldata uri_, address market_, address creator_, uint256 supply)
        external
    {
        if (market != address(0)) revert AlreadyInitialized();
        if (market_ == address(0)) revert ZeroAddress();
        _name = name_;
        _symbol = symbol_;
        uri = uri_;
        market = market_;
        creator = creator_;
        totalSupply = supply;
        balanceOf[market_] = supply;
        emit Transfer(address(0), market_, supply);
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function decimals() external pure override returns (uint8) {
        return 18;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        // The market only ever takes coins from the account that is selling to it (see ZropadMarket.sell).
        if (msg.sender != market) {
            uint256 allowed = allowance[from][msg.sender];
            if (allowed != type(uint256).max) {
                if (allowed < amount) revert InsufficientAllowance();
                unchecked {
                    allowance[from][msg.sender] = allowed - amount;
                }
            }
        }
        _move(from, to, amount);
        return true;
    }

    /// @notice Burns the caller's coins.
    function burn(uint256 amount) external {
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[msg.sender] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
    }

    function _move(address from, address to, uint256 amount) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
