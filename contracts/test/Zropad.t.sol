// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Zropad} from "../src/Zropad.sol";
import {ZropadMarket} from "../src/ZropadMarket.sol";
import {ZropadToken} from "../src/ZropadToken.sol";
import {ZropadStaking} from "../src/ZropadStaking.sol";
import {ZRPD} from "../src/ZRPD.sol";

contract ZropadTest is Test {
    Zropad hub;
    ZRPD zrpd;
    ZropadStaking staking;
    address owner = address(0xA11CE);
    address treasury = address(0x7EA5);
    address dev = address(0xDE7);
    address alice = address(0xA1);
    address bob = address(0xB0B);
    address carol = address(0xCA201);

    function defaults() internal pure returns (Zropad.Config memory c) {
        c.launchFee = 0.0005 ether;
        c.virtualNative = 1.4 ether;
        c.virtualToken = 1_066_666_666_666_666_666_666_666_667;
        c.curveSupply = 800_000_000e18;
        c.treasuryShareBps = 5_000;
        c.stakersShareBps = 3_000;
        c.jackpotShareBps = 2_000;
        c.jackpotStart = 1 hours;
        c.jackpotExtend = 30;
        c.jackpotMax = 24 hours;
        c.jackpotMinBuy = 0.005 ether;
        c.jackpotSeedBps = 1_000;
    }

    /// Test clock (block.timestamp is cached under via-ir, so time is tracked here).
    uint256 clock = 1_800_000_000;

    function later(uint256 secs) internal {
        clock += secs;
        vm.warp(clock);
    }

    function setUp() public {
        vm.warp(clock);
        hub = new Zropad(owner, treasury, defaults());
        zrpd = new ZRPD(owner);
        staking = new ZropadStaking(zrpd);
        vm.prank(owner);
        hub.setStaking(address(staking));
        for (uint256 i; i < 6; i++) vm.deal([dev, alice, bob, carol, owner, treasury][i], 1_000 ether);
    }

    function launch(uint16 creatorFeeBps, uint256 firstBuy) internal returns (ZropadToken t, ZropadMarket m) {
        vm.prank(dev);
        (address coin, address market) = hub.launch{value: 0.0005 ether + firstBuy}("Moon Cat", "MCAT", "ipfs://x", creatorFeeBps, 0);
        return (ZropadToken(coin), ZropadMarket(payable(market)));
    }

    function buy(ZropadMarket m, address who, uint256 amount) internal returns (uint256) {
        vm.prank(who);
        return m.buy{value: amount}(0, type(uint256).max);
    }

    function sell(ZropadMarket m, address who, uint256 amount) internal returns (uint256) {
        vm.prank(who);
        return m.sell(amount, 0, type(uint256).max);
    }

    /// The market always holds at least what it owes: the curve's native (or the pool's reserve).
    function assertSolvent(ZropadMarket m) internal view {
        uint256 owedNative = m.graduated() ? m.reserveNative() : m.realNative();
        assertGe(address(m).balance, owedNative, "market insolvent");
    }

    // ---------------------------------------------------------------- launch

    function test_launch_mintsSupplyToMarket_andTakesFee() public {
        (ZropadToken t, ZropadMarket m) = launch(2_500, 0);
        assertEq(t.totalSupply(), 1_000_000_000e18);
        assertEq(t.balanceOf(address(m)), 1_000_000_000e18);
        assertEq(t.name(), "Moon Cat");
        assertEq(t.symbol(), "MCAT");
        assertEq(t.creator(), dev);
        assertEq(m.creator(), dev);
        assertEq(m.creatorFeeBps(), 2_500);
        assertEq(hub.owed(treasury), 0.0005 ether);
        assertEq(hub.coinCount(), 1);
        assertEq(hub.marketOf(address(t)), address(m));
    }

    function test_launch_rejectsBadInput() public {
        vm.startPrank(dev);
        vm.expectRevert(Zropad.BadFee.selector);
        hub.launch{value: 0.0005 ether}("A", "A", "", 5_001, 0);
        vm.expectRevert(Zropad.LaunchFee.selector);
        hub.launch{value: 0.0004 ether}("A", "A", "", 0, 0);
        vm.expectRevert(Zropad.BadName.selector);
        hub.launch{value: 0.0005 ether}("", "A", "", 0, 0);
        vm.expectRevert(Zropad.BadName.selector);
        hub.launch{value: 0.0005 ether}("A", "ELEVENCHARS", "", 0, 0);
        vm.stopPrank();
    }

    function test_creatorFirstBuy_isNotSniperTaxed() public {
        (ZropadToken t, ZropadMarket m) = launch(0, 1 ether);
        uint256 got = t.balanceOf(dev);
        // 1% fee only: 0.99 native into a 1.4 / 1.0667B curve.
        uint256 expected = m.virtualToken(); // after the buy
        assertGt(got, 0);
        assertEq(got, 1_066_666_666_666_666_666_666_666_667 - expected);
        assertApproxEqRel(got, uint256(1_066_666_666_666_666_666_666_666_667) * 0.99 ether / (1.4 ether + 0.99 ether), 1e12);
    }

    // ---------------------------------------------------------------- sniper tax

    function test_sniperTax_99pct_forTwoSeconds() public {
        (, ZropadMarket m) = launch(1_000, 0);
        assertEq(m.currentFeeBps(), 9_900);
        uint256 treasuryBefore = hub.owed(treasury);
        (uint256 potBefore,,,,) = hub.jackpotOf(m.token());
        buy(m, alice, 1 ether);
        (uint256 potAfter,,,,) = hub.jackpotOf(m.token());
        // 99% taken: 1% protocol (0.5% treasury, 0.3% stakers, 0.2% jackpot), 10% creator, 88% sniper tax to the jackpot.
        assertEq(hub.owed(dev), 0.1 ether, "creator fee");
        assertEq(hub.owed(treasury) - treasuryBefore, 0.005 ether, "treasury");
        assertEq(potAfter - potBefore, 0.002 ether + 0.88 ether, "jackpot gets the sniper tax");
        assertEq(m.realNative(), 0.01 ether, "only 1% reached the curve");

        later(1);
        assertEq(m.currentFeeBps(), 9_900, "still sniping at +1s");
        later(1);
        assertEq(m.currentFeeBps(), 1_100, "1% + 10% after 2s");
    }

    // ---------------------------------------------------------------- fees

    function test_fees_protocol1pct_split_and_creatorFee() public {
        (, ZropadMarket m2) = launch(5_000, 0);
        later(2);
        uint256 t0 = hub.owed(treasury);
        uint256 creator0 = hub.owed(dev);
        (uint256 pot0,,,,) = hub.jackpotOf(m2.token());
        buy(m2, alice, 1 ether);
        assertEq(hub.owed(treasury) - t0, 0.005 ether, "0.5% treasury");
        assertEq(address(staking).balance >= 0.003 ether, true, "0.3% stakers (queued)");
        (uint256 pot1,,,,) = hub.jackpotOf(m2.token());
        assertEq(pot1 - pot0, 0.002 ether, "0.2% jackpot");
        assertEq(hub.owed(dev) - creator0, 0.5 ether, "50% creator fee");
        assertEq(m2.realNative(), 0.49 ether, "49% reached the curve");
    }

    function test_sell_paysFees_andReturnsNative() public {
        (ZropadToken t, ZropadMarket m) = launch(200, 0);
        later(2);
        uint256 got = buy(m, alice, 1 ether);
        uint256 before = alice.balance;
        uint256 out = sell(m, alice, got);
        assertEq(alice.balance - before, out);
        assertEq(t.balanceOf(alice), 0);
        // Bought with 0.97 net; selling it all back returns 0.97 less 3% fees.
        assertApproxEqRel(out, 0.97 ether * 97 / 100, 1e12);
        assertSolvent(m);
    }

    function test_sell_needsNoApproval() public {
        (ZropadToken t, ZropadMarket m) = launch(0, 0);
        later(2);
        uint256 got = buy(m, alice, 0.5 ether);
        assertEq(t.allowance(alice, address(m)), 0);
        sell(m, alice, got / 2);
        assertEq(t.balanceOf(alice), got - got / 2);
    }

    function test_marketCanOnlyPullFromSeller() public {
        (ZropadToken t, ZropadMarket m) = launch(0, 0);
        later(2);
        buy(m, alice, 0.5 ether);
        // Bob can't sell Alice's coins: the market pulls from the caller only.
        vm.prank(bob);
        vm.expectRevert();
        m.sell(1e18, 0, type(uint256).max);
        t;
    }

    // ---------------------------------------------------------------- graduation

    function test_graduation_atAbout4_2_andPoolTrading() public {
        (ZropadToken t, ZropadMarket m) = launch(0, 0);
        later(2);
        uint256 priceBefore;
        // Buy in steps until the curve completes.
        for (uint256 i; i < 10 && !m.graduated(); i++) {
            priceBefore = m.price();
            buy(m, alice, 1 ether);
        }
        assertTrue(m.graduated(), "graduated");
        assertEq(m.curveLeft(), 0);
        assertApproxEqRel(m.reserveNative(), 4.2 ether, 1e14, "raised ~4.2");
        assertEq(m.reserveToken(), 200_000_000e18, "200M coins in the pool");
        assertEq(t.balanceOf(alice), 800_000_000e18, "alice holds the curve's 800M");
        assertSolvent(m);
        // Pool trading: buys and sells move the price, fees still apply.
        uint256 p0 = m.price();
        buy(m, bob, 1 ether);
        assertGt(m.price(), p0);
        uint256 bobCoins = t.balanceOf(bob);
        sell(m, bob, bobCoins);
        assertSolvent(m);
        priceBefore;
    }

    function test_graduation_refundsOverpay_andPriceIsContinuous() public {
        (, ZropadMarket m) = launch(0, 0);
        later(2);
        buy(m, alice, 4 ether);
        uint256 lastCurvePrice = m.price();
        uint256 before = bob.balance;
        buy(m, bob, 50 ether);
        assertTrue(m.graduated());
        uint256 spent = before - bob.balance;
        assertLt(spent, 1 ether, "refunded all but what completed the curve");
        // The pool opens at the curve's final price.
        uint256 poolPrice = m.price();
        assertGt(poolPrice, lastCurvePrice);
        assertApproxEqRel(poolPrice, uint256(5.6 ether) * 1e18 / 266_666_666_666_666_666_666_666_667, 1e15);
        assertSolvent(m);
    }

    function test_liquidityLocked_noWayOut() public {
        (, ZropadMarket m) = launch(0, 0);
        later(2);
        buy(m, alice, 10 ether);
        assertTrue(m.graduated());
        // No function removes liquidity; the hub owner can't either.
        uint256 bal = address(m).balance;
        vm.prank(owner);
        (bool ok,) = address(m).call(abi.encodeWithSignature("withdraw()"));
        assertFalse(ok);
        assertEq(address(m).balance, bal);
    }

    // ---------------------------------------------------------------- jackpot

    function test_jackpot_lastBuyerWins_afterCountdown() public {
        (, ZropadMarket m) = launch(0, 0);
        address coin = m.token();
        later(2);
        buy(m, alice, 0.5 ether);
        buy(m, bob, 0.5 ether); // bob is the last qualifying buyer
        (uint256 pot, uint256 deadline,, address last,) = hub.jackpotOf(coin);
        assertEq(last, bob);
        assertGt(pot, 0);
        // A buy under the minimum doesn't take the lead.
        buy(m, carol, 0.004 ether);
        (pot,,, last,) = hub.jackpotOf(coin);
        assertEq(last, bob);

        clock = deadline;
        vm.warp(clock);
        hub.settle(coin);
        assertApproxEqAbs(hub.owed(bob), pot * 9 / 10, 1);
        (uint256 seed,, uint256 round, address last2,) = hub.jackpotOf(coin);
        assertEq(round, 2);
        assertEq(last2, address(0));
        assertApproxEqAbs(seed, pot / 10, 1, "10% seeds the next round");

        uint256 before = bob.balance;
        vm.prank(bob);
        hub.claim();
        assertApproxEqAbs(bob.balance - before, pot * 9 / 10, 1);
    }

    function test_jackpot_extendsAndCaps() public {
        (, ZropadMarket m) = launch(0, 0);
        address coin = m.token();
        later(2);
        (, uint256 d0,,,) = hub.jackpotOf(coin);
        buy(m, alice, 0.01 ether);
        (, uint256 d1,,,) = hub.jackpotOf(coin);
        assertEq(d1, d0 + 30, "+30s");
        for (uint256 i; i < 3000; i++) buy(m, alice, 0.006 ether);
        (, uint256 d2,,,) = hub.jackpotOf(coin);
        assertEq(d2, clock + 24 hours, "capped at 24h");
    }

    function test_jackpot_nextTradeSettlesExpiredRound() public {
        (, ZropadMarket m) = launch(0, 0);
        address coin = m.token();
        later(2);
        buy(m, alice, 1 ether);
        (uint256 pot, uint256 deadline,,,) = hub.jackpotOf(coin);
        clock = deadline + 5;
        vm.warp(clock);
        buy(m, bob, 1 ether); // settles round 1 for alice, then bob leads round 2
        assertApproxEqAbs(hub.owed(alice), pot * 9 / 10, 1);
        (,, uint256 round, address last,) = hub.jackpotOf(coin);
        assertEq(round, 2);
        assertEq(last, bob);
    }

    function test_jackpot_noBuyer_rollsOver() public {
        (, ZropadMarket m) = launch(0, 0);
        address coin = m.token();
        buy(m, alice, 1 ether); // sniper window: pot gets the tax, alice leads
        later(2);
        vm.prank(alice);
        uint256 coins_ = ZropadToken(coin).balanceOf(alice);
        sell(m, alice, coins_ / 2); // a sell never takes the lead
        (,,, address last,) = hub.jackpotOf(coin);
        assertEq(last, alice);
    }

    // ---------------------------------------------------------------- staking

    function test_staking_sharesFees() public {
        vm.startPrank(owner);
        zrpd.transfer(alice, 100e18);
        zrpd.transfer(bob, 300e18);
        vm.stopPrank();
        vm.startPrank(alice);
        zrpd.approve(address(staking), type(uint256).max);
        staking.stake(100e18);
        vm.stopPrank();
        vm.startPrank(bob);
        zrpd.approve(address(staking), type(uint256).max);
        staking.stake(300e18);
        vm.stopPrank();

        (, ZropadMarket m) = launch(0, 0);
        later(2);
        buy(m, carol, 1 ether); // 0.3% of 1 = 0.003 to stakers
        assertApproxEqAbs(staking.earned(alice), 0.00075 ether, 1);
        assertApproxEqAbs(staking.earned(bob), 0.00225 ether, 1);
        uint256 before = bob.balance;
        vm.prank(bob);
        staking.claim();
        assertApproxEqAbs(bob.balance - before, 0.00225 ether, 1);
    }

    function test_staking_queuesUntilFirstStaker() public {
        (, ZropadMarket m) = launch(0, 0);
        later(2);
        buy(m, carol, 1 ether);
        assertEq(staking.queued(), 0.003 ether);
        vm.prank(owner);
        zrpd.approve(address(staking), type(uint256).max);
        vm.prank(owner);
        staking.stake(1e18);
        assertApproxEqAbs(staking.earned(owner), 0.003 ether, 1);
    }

    function test_brokenStaking_neverBlocksTrading() public {
        vm.prank(owner);
        hub.setStaking(address(this)); // this test contract rejects native payments
        (, ZropadMarket m) = launch(0, 0);
        later(2);
        uint256 t0 = hub.owed(treasury);
        buy(m, carol, 1 ether);
        assertEq(hub.owed(treasury) - t0, 0.008 ether, "stakers' share goes to the treasury");
    }

    // ---------------------------------------------------------------- claims

    function test_creatorClaims() public {
        (, ZropadMarket m) = launch(1_000, 0);
        later(2);
        buy(m, alice, 1 ether);
        uint256 before = dev.balance;
        vm.prank(dev);
        hub.claim();
        assertEq(dev.balance - before, 0.1 ether);
        vm.prank(dev);
        vm.expectRevert(Zropad.Nothing.selector);
        hub.claim();
    }

    function test_onlyMarketsReportTrades() public {
        launch(0, 0);
        vm.expectRevert(Zropad.OnlyMarket.selector);
        hub.onTrade(address(1), alice, true, 1, 0, 0, 0);
    }

    function test_ownerCantChangeExistingCoinFees() public {
        (, ZropadMarket m) = launch(300, 0);
        Zropad.Config memory c = defaults();
        c.virtualNative = 2 ether;
        vm.prank(owner);
        hub.setConfig(c);
        assertEq(m.creatorFeeBps(), 300);
        assertEq(m.PROTOCOL_FEE_BPS(), 100);
    }

    // ---------------------------------------------------------------- fuzz: books always balance

    function testFuzz_randomTrading_staysSolvent(uint256 seed) public {
        (ZropadToken t, ZropadMarket m) = launch(uint16(seed % 5_001), 0);
        later(2);
        address[3] memory who = [alice, bob, carol];
        for (uint256 i; i < 40; i++) {
            seed = uint256(keccak256(abi.encode(seed, i)));
            address w = who[seed % 3];
            if (seed % 5 < 3) {
                buy(m, w, (seed >> 8) % 3 ether + 1);
            } else {
                uint256 bal = t.balanceOf(w);
                if (bal > 0) sell(m, w, ((seed >> 16) % bal) + 1);
            }
            assertSolvent(m);
        }
        // Everyone sells everything: the market can pay them all.
        for (uint256 i; i < 3; i++) {
            uint256 bal = t.balanceOf(who[i]);
            if (bal > 0) sell(m, who[i], bal);
            assertSolvent(m);
        }
    }

    receive() external payable {
        revert("no thanks");
    }
}
