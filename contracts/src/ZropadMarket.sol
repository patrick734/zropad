// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IZropadHub {
    function onTrade(address token, address trader, bool isBuy, uint256 nativeNet, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax)
        external
        payable;
}

/**
 * @title ZropadMarket
 * @notice Where one Zropad coin trades, for its whole life. One market per coin.
 *
 *  1. Curve. The coin starts on a bonding curve with virtual reserves (constant product). Buyers
 *     pay in the native coin; the curve sells until CURVE_SUPPLY coins are gone.
 *  2. Graduation. When the curve sells out, the native raised and the remaining coins become a
 *     constant-product pool in this same contract, at the same price. The pool has no LP tokens and
 *     no way to remove liquidity: it is locked for good.
 *
 * Every buy and sell, on the curve and in the pool, pays:
 *  - the protocol fee (1%), and
 *  - the creator fee the creator chose at launch (0 to 50%), fixed for good.
 * For the first SNIPER_WINDOW seconds after launch the total is 99% (the sniper tax); the extra
 * goes to the coin's jackpot. The creator's own buy in the launch transaction is exempt.
 * Fees are taken in the native coin: from what's paid in on buys, from what's paid out on sells.
 */
contract ZropadMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;
    uint256 public constant PROTOCOL_FEE_BPS = 100;
    uint256 public constant SNIPER_FEE_BPS = 9_900;
    uint256 public constant SNIPER_WINDOW = 2;

    address public hub;
    address public token;
    address public creator;
    uint16 public creatorFeeBps;
    uint64 public launchTime;
    bool public graduated;

    /// @notice Curve: virtual reserves now (native, coins) and their product.
    uint256 public virtualNative;
    uint256 public virtualToken;
    /// @notice Coins the curve sells in all, and can still sell before graduating.
    uint256 public curveSupply;
    uint256 public curveLeft;
    /// @notice Native actually held for the curve (paid in, less what sellers took out).
    uint256 public realNative;

    /// @notice Pool (after graduation): real reserves.
    uint256 public reserveNative;
    uint256 public reserveToken;

    event Trade(
        address indexed trader,
        bool isBuy,
        uint256 nativeAmount,
        uint256 tokenAmount,
        uint256 protocolFee,
        uint256 creatorFee,
        uint256 sniperTax,
        uint256 priceNative,
        uint256 priceToken
    );
    event Graduated(uint256 reserveNative, uint256 reserveToken);

    error AlreadyInitialized();
    error OnlyHub();
    error Expired();
    error Slippage();
    error ZeroAmount();
    error NotEnoughLiquidity();

    modifier onlyHub() {
        if (msg.sender != hub) revert OnlyHub();
        _;
    }

    modifier live(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    /// @dev Called once by the hub, right after cloning. The coin's whole supply is already here.
    function initialize(address token_, address creator_, uint16 creatorFeeBps_, uint256 virtualNative_, uint256 virtualToken_, uint256 curveSupply_)
        external
    {
        if (hub != address(0)) revert AlreadyInitialized();
        hub = msg.sender;
        token = token_;
        creator = creator_;
        creatorFeeBps = creatorFeeBps_;
        launchTime = uint64(block.timestamp);
        virtualNative = virtualNative_;
        virtualToken = virtualToken_;
        curveSupply = curveSupply_;
        curveLeft = curveSupply_;
    }

    // ------------------------------------------------------------------ trading

    /// @notice Buys coins with the native coin sent. On the curve, anything beyond what completes the
    /// curve is refunded.
    function buy(uint256 minTokensOut, uint256 deadline) external payable nonReentrant live(deadline) returns (uint256) {
        return _buy(msg.sender, minTokensOut, false);
    }

    /// @notice The creator's first buy, made by the hub inside the launch transaction: no sniper tax.
    function launchBuy(address buyer, uint256 minTokensOut) external payable nonReentrant onlyHub returns (uint256) {
        return _buy(buyer, minTokensOut, true);
    }

    /// @notice Sells coins for the native coin. No approval needed: the market takes the coins from
    /// the seller's own balance.
    function sell(uint256 tokensIn, uint256 minNativeOut, uint256 deadline) external nonReentrant live(deadline) returns (uint256 nativeOut) {
        if (tokensIn == 0) revert ZeroAmount();
        uint256 gross;
        if (!graduated) {
            uint256 k = virtualNative * virtualToken;
            uint256 newVT = virtualToken + tokensIn;
            uint256 newVN = Math.ceilDiv(k, newVT);
            gross = virtualNative - newVN;
            if (gross > realNative) revert NotEnoughLiquidity();
            virtualNative = newVN;
            virtualToken = newVT;
            curveLeft += tokensIn;
            realNative -= gross;
        } else {
            gross = (reserveNative * tokensIn) / (reserveToken + tokensIn);
            reserveNative -= gross;
            reserveToken += tokensIn;
        }
        (uint256 total, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax) = _fees(gross, false);
        nativeOut = gross - total;
        if (nativeOut < minNativeOut) revert Slippage();
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        _payHub(msg.sender, false, gross, protocolFee, creatorFee, sniperTax);
        _emitTrade(msg.sender, false, gross, tokensIn, protocolFee, creatorFee, sniperTax);
        Address.sendValue(payable(msg.sender), nativeOut);
    }

    function _buy(address buyer, uint256 minTokensOut, bool exempt) private returns (uint256 tokensOut) {
        uint256 paid = msg.value;
        if (paid == 0) revert ZeroAmount();
        uint256 feeBps = _feeBps(exempt);
        uint256 gross = paid;
        uint256 net = paid - (paid * feeBps) / BPS;
        bool graduates;
        if (!graduated) {
            uint256 k = virtualNative * virtualToken;
            uint256 newVN = virtualNative + net;
            uint256 newVT = Math.ceilDiv(k, newVN);
            tokensOut = virtualToken - newVT;
            if (tokensOut >= curveLeft) {
                // This buy completes the curve: take only what that costs, refund the rest.
                tokensOut = curveLeft;
                newVT = virtualToken - tokensOut;
                newVN = Math.ceilDiv(k, newVT);
                net = newVN - virtualNative;
                gross = Math.ceilDiv(net * BPS, BPS - feeBps);
                if (gross > paid) gross = paid;
                graduates = true;
            }
            virtualNative = newVN;
            virtualToken = newVT;
            curveLeft -= tokensOut;
            realNative += net;
        } else {
            tokensOut = (reserveToken * net) / (reserveNative + net);
            reserveNative += net;
            reserveToken -= tokensOut;
        }
        if (tokensOut == 0 || tokensOut < minTokensOut) revert Slippage();
        (, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax) = _feesWithBps(gross, feeBps);
        // Anything left over after the net and the fees is the refund (only when completing the curve).
        uint256 refund = paid - gross;
        // The net that reached the curve may differ from gross - fees by rounding: keep the books exact.
        uint256 dust = gross - net - protocolFee - creatorFee - sniperTax;
        protocolFee += dust;
        IERC20(token).safeTransfer(buyer, tokensOut);
        _payHub(buyer, true, net, protocolFee, creatorFee, sniperTax);
        _emitTrade(buyer, true, gross, tokensOut, protocolFee, creatorFee, sniperTax);
        if (graduates) _graduate();
        if (refund > 0) Address.sendValue(payable(buyer), refund);
    }

    function _graduate() private {
        graduated = true;
        reserveNative = realNative;
        reserveToken = IERC20(token).balanceOf(address(this));
        realNative = 0;
        emit Graduated(reserveNative, reserveToken);
    }

    // ------------------------------------------------------------------ fees

    function _feeBps(bool exempt) private view returns (uint256) {
        if (!exempt && block.timestamp < launchTime + SNIPER_WINDOW) return SNIPER_FEE_BPS;
        return PROTOCOL_FEE_BPS + creatorFeeBps;
    }

    function _fees(uint256 gross, bool exempt) private view returns (uint256, uint256, uint256, uint256) {
        return _feesWithBps(gross, _feeBps(exempt));
    }

    /// @dev Splits a fee of `feeBps` on `gross` into protocol, creator and sniper parts.
    function _feesWithBps(uint256 gross, uint256 feeBps) private view returns (uint256 total, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax) {
        total = (gross * feeBps) / BPS;
        protocolFee = (gross * PROTOCOL_FEE_BPS) / BPS;
        creatorFee = (gross * creatorFeeBps) / BPS;
        if (protocolFee + creatorFee > total) creatorFee = total - protocolFee;
        sniperTax = total - protocolFee - creatorFee;
    }

    function _payHub(address trader, bool isBuy, uint256 nativeNet, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax) private {
        IZropadHub(hub).onTrade{value: protocolFee + creatorFee + sniperTax}(token, trader, isBuy, nativeNet, protocolFee, creatorFee, sniperTax);
    }

    function _emitTrade(address trader, bool isBuy, uint256 nativeAmount, uint256 tokenAmount, uint256 protocolFee, uint256 creatorFee, uint256 sniperTax)
        private
    {
        (uint256 pn, uint256 pt) = graduated ? (reserveNative, reserveToken) : (virtualNative, virtualToken);
        emit Trade(trader, isBuy, nativeAmount, tokenAmount, protocolFee, creatorFee, sniperTax, pn, pt);
    }

    // ------------------------------------------------------------------ views

    /// @notice What a buy of `nativeIn` gets now: coins out, fees, and any refund.
    function quoteBuy(uint256 nativeIn) external view returns (uint256 tokensOut, uint256 fee, uint256 refund) {
        uint256 feeBps = _feeBps(false);
        uint256 net = nativeIn - (nativeIn * feeBps) / BPS;
        fee = nativeIn - net;
        if (!graduated) {
            uint256 k = virtualNative * virtualToken;
            uint256 newVT = Math.ceilDiv(k, virtualNative + net);
            tokensOut = virtualToken - newVT;
            if (tokensOut >= curveLeft) {
                tokensOut = curveLeft;
                uint256 needNet = Math.ceilDiv(k, virtualToken - tokensOut) - virtualNative;
                uint256 gross = Math.ceilDiv(needNet * BPS, BPS - feeBps);
                if (gross < nativeIn) refund = nativeIn - gross;
                fee = gross - needNet;
            }
        } else {
            tokensOut = (reserveToken * net) / (reserveNative + net);
        }
    }

    /// @notice What selling `tokensIn` pays now, after fees.
    function quoteSell(uint256 tokensIn) external view returns (uint256 nativeOut, uint256 fee) {
        uint256 gross;
        if (!graduated) {
            uint256 k = virtualNative * virtualToken;
            gross = virtualNative - Math.ceilDiv(k, virtualToken + tokensIn);
            if (gross > realNative) gross = realNative;
        } else {
            gross = (reserveNative * tokensIn) / (reserveToken + tokensIn);
        }
        fee = (gross * _feeBps(false)) / BPS;
        nativeOut = gross - fee;
    }

    /// @notice The fee a trade pays right now, in basis points (99% during the sniper window).
    function currentFeeBps() external view returns (uint256) {
        return _feeBps(false);
    }

    /// @notice Price of one whole coin (1e18 units) in native wei.
    function price() public view returns (uint256) {
        return graduated ? (reserveNative * 1e18) / reserveToken : (virtualNative * 1e18) / virtualToken;
    }

    /// @notice How far along the curve is, in basis points (10000 = graduated).
    function progressBps() external view returns (uint256) {
        if (graduated) return BPS;
        return ((curveSupply - curveLeft) * BPS) / curveSupply;
    }
}
