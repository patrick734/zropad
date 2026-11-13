// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ZropadToken} from "./ZropadToken.sol";
import {ZropadMarket} from "./ZropadMarket.sol";

interface IZropadStaking {
    function notifyReward() external payable;
}

/**
 * @title Zropad
 * @notice The Zropad launchpad: launches coins, routes every trading fee, and runs each coin's
 * countdown jackpot.
 *
 * Launch: one transaction creates the coin (1,000,000,000, all to its market) and its market, and
 * can include the creator's first buy (free of the sniper tax).
 *
 * Fees (paid by the markets on every trade, in the native coin):
 *  - creator fee: credited to the coin's creator, claimable any time;
 *  - protocol fee (1%): split between the treasury, $ZRPD stakers and the coin's jackpot;
 *  - sniper tax (first 2 seconds after launch): all to the coin's jackpot.
 *
 * Jackpot (per coin): a pot and a countdown. Each buy of at least `jackpotMinBuy` makes the buyer
 * the last buyer and adds `jackpotExtend` seconds (never more than `jackpotMax` from now). When the
 * countdown runs out, the last buyer wins the pot, less a seed that starts the next round.
 *
 * Winnings, creator fees and treasury fees are credited and claimed (pull payments).
 * The owner can tune settings for the launchpad but can't touch markets, coins or anyone's balance.
 */
contract Zropad is Ownable2Step, ReentrancyGuard {
    uint256 private constant BPS = 10_000;
    uint256 public constant SUPPLY = 1_000_000_000e18;
    uint16 public constant MAX_CREATOR_FEE_BPS = 5_000;

    address public immutable tokenImpl;
    address public immutable marketImpl;

    struct Config {
        uint128 launchFee;
        /// Curve shape for new launches (see ZropadMarket): virtual reserves and coins sold on the curve.
        uint128 virtualNative;
        uint128 virtualToken;
        uint128 curveSupply;
        /// Shares of the protocol fee, in bps of it (sum 10000).
        uint16 treasuryShareBps;
        uint16 stakersShareBps;
        uint16 jackpotShareBps;
        /// Jackpot: first countdown, time added per qualifying buy, longest countdown, smallest qualifying
        /// buy (native, after fees), share of the pot kept to seed the next round.
        uint32 jackpotStart;
        uint32 jackpotExtend;
        uint32 jackpotMax;
        uint128 jackpotMinBuy;
        uint16 jackpotSeedBps;
    }

    struct Jackpot {
        uint128 pot;
        uint64 deadline;
        uint32 round;
        address lastBuyer;
    }

    Config public config;
    address public treasury;
    address public staking;
    bool public launchesPaused;

    address[] public coins;
    mapping(address coin => address) public marketOf;
    mapping(address market => address) public coinOf;
    mapping(address coin => Jackpot) public jackpots;
    /// @notice Native owed to each account: creator fees, jackpot wins, treasury fees.
    mapping(address => uint256) public owed;

    event Launched(
        address indexed coin,
        address indexed market,
        address indexed creator,
        uint256 id,
        string name,
        string symbol,
        string uri,
        uint16 creatorFeeBps
    );
    event Fees(address indexed coin, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax, uint256 toTreasury, uint256 toStakers, uint256 toJackpot);
    event JackpotBuy(address indexed coin, uint32 round, address indexed buyer, uint64 deadline, uint128 pot);
    event JackpotWon(address indexed coin, uint32 round, address indexed winner, uint256 amount, uint256 seed);
    event Claimed(address indexed account, uint256 amount);
    event ConfigSet(Config config);
    event TreasurySet(address treasury);
    event StakingSet(address staking);
    event LaunchesPaused(bool paused);

    error BadConfig();
    error BadFee();
    error Paused();
    error LaunchFee();
    error OnlyMarket();
    error NotOver();
    error Nothing();
    error BadName();

    constructor(address owner_, address treasury_, Config memory config_) Ownable(owner_) {
        if (treasury_ == address(0)) revert BadConfig();
        tokenImpl = address(new ZropadToken());
        marketImpl = address(new ZropadMarket());
        treasury = treasury_;
        _setConfig(config_);
    }

    // ------------------------------------------------------------------ launch

    /**
     * @notice Launches a coin. Send the launch fee, plus anything to spend on the first buy.
     * @param creatorFeeBps the creator's fee on every trade, 0 to 5000 (50%), fixed for good.
     * @param minTokensOut the least coins the first buy must get (if there is one).
     */
    function launch(string calldata name, string calldata symbol, string calldata uri, uint16 creatorFeeBps, uint256 minTokensOut)
        external
        payable
        nonReentrant
        returns (address coin, address market)
    {
        if (launchesPaused) revert Paused();
        if (creatorFeeBps > MAX_CREATOR_FEE_BPS) revert BadFee();
        if (bytes(name).length == 0 || bytes(name).length > 32 || bytes(symbol).length == 0 || bytes(symbol).length > 10) revert BadName();
        Config memory c = config;
        if (msg.value < c.launchFee) revert LaunchFee();
        owed[treasury] += c.launchFee;

        coin = Clones.clone(tokenImpl);
        market = Clones.clone(marketImpl);
        coinOf[market] = coin;
        marketOf[coin] = market;
        coins.push(coin);
        ZropadToken(coin).initialize(name, symbol, uri, market, msg.sender, SUPPLY);
        ZropadMarket(market).initialize(coin, msg.sender, creatorFeeBps, c.virtualNative, c.virtualToken, c.curveSupply);
        jackpots[coin] = Jackpot({pot: 0, deadline: uint64(block.timestamp + c.jackpotStart), round: 1, lastBuyer: address(0)});
        emit Launched(coin, market, msg.sender, coins.length - 1, name, symbol, uri, creatorFeeBps);

        uint256 firstBuy = msg.value - c.launchFee;
        if (firstBuy > 0) ZropadMarket(market).launchBuy{value: firstBuy}(msg.sender, minTokensOut);
    }

    // ------------------------------------------------------------------ fees and the jackpot

    /// @dev Called by a market on every trade, with the fees attached.
    function onTrade(address coin, address trader, bool isBuy, uint256 nativeNet, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax)
        external
        payable
    {
        if (coinOf[msg.sender] != coin || coin == address(0)) revert OnlyMarket();
        Config memory c = config;
        Jackpot storage j = jackpots[coin];
        // A countdown that ran out pays its winner before this trade counts towards the next round.
        if (block.timestamp >= j.deadline) _settle(coin, j, c);

        if (creatorFee > 0) owed[ZropadMarket(msg.sender).creator()] += creatorFee;
        uint256 toStakers = (protocolFee * c.stakersShareBps) / BPS;
        uint256 toJackpot = (protocolFee * c.jackpotShareBps) / BPS + sniperTax;
        uint256 toTreasury = protocolFee - (protocolFee * c.stakersShareBps) / BPS - (protocolFee * c.jackpotShareBps) / BPS;
        bool toStaking = toStakers > 0 && staking != address(0);
        if (toStaking) {
            // A staking contract that won't take it never blocks trading: the treasury gets it instead.
            try IZropadStaking(staking).notifyReward{value: toStakers}() {}
            catch {
                toStaking = false;
            }
        }
        if (!toStaking) toTreasury += toStakers;
        owed[treasury] += toTreasury;
        j.pot += uint128(toJackpot);
        emit Fees(coin, protocolFee, creatorFee, sniperTax, toTreasury, toStaking ? toStakers : 0, toJackpot);

        if (isBuy && nativeNet >= c.jackpotMinBuy) {
            uint256 next = (j.deadline > block.timestamp ? j.deadline : block.timestamp) + c.jackpotExtend;
            uint256 cap = block.timestamp + c.jackpotMax;
            j.deadline = uint64(next > cap ? cap : next);
            j.lastBuyer = trader;
            emit JackpotBuy(coin, j.round, trader, j.deadline, j.pot);
        }
    }

    /// @notice Ends a coin's jackpot round whose countdown has run out: the last buyer wins.
    function settle(address coin) external {
        Jackpot storage j = jackpots[coin];
        if (j.round == 0 || block.timestamp < j.deadline) revert NotOver();
        _settle(coin, j, config);
    }

    function _settle(address coin, Jackpot storage j, Config memory c) private {
        address winner = j.lastBuyer;
        uint256 pot = j.pot;
        if (winner != address(0) && pot > 0) {
            uint256 seed = (pot * c.jackpotSeedBps) / BPS;
            uint256 prize = pot - seed;
            owed[winner] += prize;
            j.pot = uint128(seed);
            emit JackpotWon(coin, j.round, winner, prize, seed);
        }
        // With no qualifying buy, the pot rolls into the next round.
        j.round += 1;
        j.lastBuyer = address(0);
        j.deadline = uint64(block.timestamp + c.jackpotStart);
    }

    /// @notice Pays out everything owed to the caller (creator fees, jackpot wins, treasury fees).
    function claim() external nonReentrant returns (uint256 amount) {
        amount = owed[msg.sender];
        if (amount == 0) revert Nothing();
        owed[msg.sender] = 0;
        emit Claimed(msg.sender, amount);
        Address.sendValue(payable(msg.sender), amount);
    }

    // ------------------------------------------------------------------ views

    function coinCount() external view returns (uint256) {
        return coins.length;
    }

    /// @notice A coin's jackpot now: pot, countdown end, round, last buyer, and whether it's over.
    function jackpotOf(address coin) external view returns (uint256 pot, uint256 deadline, uint256 round, address lastBuyer, bool over) {
        Jackpot memory j = jackpots[coin];
        return (j.pot, j.deadline, j.round, j.lastBuyer, block.timestamp >= j.deadline);
    }

    // ------------------------------------------------------------------ owner

    function setConfig(Config calldata c) external onlyOwner {
        _setConfig(c);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert BadConfig();
        // Fees already earned stay claimable by the old treasury.
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setStaking(address staking_) external onlyOwner {
        staking = staking_;
        emit StakingSet(staking_);
    }

    function pauseLaunches(bool paused) external onlyOwner {
        launchesPaused = paused;
        emit LaunchesPaused(paused);
    }

    function _setConfig(Config memory c) private {
        if (
            uint256(c.treasuryShareBps) + c.stakersShareBps + c.jackpotShareBps != BPS || c.virtualNative == 0 || c.curveSupply == 0
                || c.curveSupply >= SUPPLY || c.virtualToken <= c.curveSupply || c.launchFee > 1 ether || c.jackpotSeedBps > 5_000
                || c.jackpotMax < c.jackpotStart || c.jackpotStart == 0
        ) revert BadConfig();
        config = c;
        emit ConfigSet(c);
    }
}
