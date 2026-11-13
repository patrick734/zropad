// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ZropadStaking
 * @notice Stake $ZRPD, earn the stakers' share of every Zropad trading fee, paid in the native coin.
 * Rewards are shared in proportion to stake, from the moment they arrive. No lockup: unstake any time.
 * Rewards that arrive while nobody is staked wait for the first staker.
 */
contract ZropadStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant ACC = 1e36;

    IERC20 public immutable stakeToken;
    uint256 public totalStaked;
    /// @notice Native rewarded per staked unit so far, scaled by 1e36.
    uint256 public rewardPerToken;
    /// @notice Rewards that arrived while nothing was staked.
    uint256 public queued;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public paidPerToken;
    mapping(address => uint256) public earnedStored;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    error ZeroAmount();
    error TooMuch();

    constructor(IERC20 stakeToken_) {
        stakeToken = stakeToken_;
    }

    /// @notice Adds native rewards for stakers (the Zropad hub calls this on every trade).
    function notifyReward() external payable {
        uint256 amount = msg.value + queued;
        if (totalStaked == 0) {
            queued = amount;
            return;
        }
        queued = 0;
        rewardPerToken += (amount * ACC) / totalStaked;
        emit RewardAdded(amount);
    }

    function earned(address user) public view returns (uint256) {
        return earnedStored[user] + (staked[user] * (rewardPerToken - paidPerToken[user])) / ACC;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _checkpoint(msg.sender);
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
        // Hand anything waiting to the stakers now that there are some.
        if (queued > 0) {
            uint256 q = queued;
            queued = 0;
            rewardPerToken += (q * ACC) / totalStaked;
            emit RewardAdded(q);
        }
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (amount > staked[msg.sender]) revert TooMuch();
        _checkpoint(msg.sender);
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claim() external nonReentrant returns (uint256 amount) {
        _checkpoint(msg.sender);
        amount = earnedStored[msg.sender];
        if (amount == 0) revert ZeroAmount();
        earnedStored[msg.sender] = 0;
        emit RewardClaimed(msg.sender, amount);
        Address.sendValue(payable(msg.sender), amount);
    }

    function _checkpoint(address user) private {
        earnedStored[user] = earned(user);
        paidPerToken[user] = rewardPerToken;
    }
}
