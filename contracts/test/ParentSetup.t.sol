// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {
    ParentSetup,
    IENSv1,
    IENSRegistry,
    INameWrapper,
    IETHRegistry,
    ENS_REGISTRY,
    NAME_WRAPPER,
    ETH_REGISTRY,
    AVAILABLE,
    REGISTERED,
    ROLE_SET_RESOLVER,
    CANNOT_SET_RESOLVER
} from "../script/ParentSetup.sol";

/// @dev Calls setParentResolver as `wallet`, the way the deploy script's broadcast does.
contract ParentSetupHarness is ParentSetup {
    function setAs(address wallet, string memory name, address resolver) external returns (string memory registry) {
        vm.startPrank(wallet);
        registry = setParentResolver(name, resolver, wallet);
        vm.stopPrank();
    }
}

/// @notice The ENS contracts are mocked: each test sets only the answers its path reads.
contract ParentSetupTest is Test {
    uint8 constant RESERVED = 1;
    uint256 constant TRADEPIT = uint256(keccak256("tradepit"));
    bytes32 immutable NODE = vm.ensNamehash("tradepit.eth");

    ParentSetupHarness harness;
    address wallet = makeAddr("wallet");
    address owner = makeAddr("owner");
    address resolver = makeAddr("resolver");

    function setUp() public {
        harness = new ParentSetupHarness();
        // INVALID opcode: a call that no test mocked reverts instead of returning nothing.
        vm.etch(address(ENS_REGISTRY), hex"fe");
        vm.etch(address(NAME_WRAPPER), hex"fe");
        vm.etch(address(ETH_REGISTRY), hex"fe");
    }

    // --- ENSv2 ---

    function test_ENSv2_SetsResolverOnETHRegistry() public {
        _registeredInV2(wallet);
        _hasSetResolverRole(wallet, true);
        _expectSetResolver(address(ETH_REGISTRY), abi.encodeCall(IETHRegistry.setResolver, (TRADEPIT, resolver)));

        assertEq(harness.setAs(wallet, "tradepit.eth", resolver), "ENSv2 ETHRegistry");
    }

    function test_ENSv2_RevertsWithoutRole() public {
        _registeredInV2(owner);
        _hasSetResolverRole(wallet, false);

        vm.expectRevert(
            bytes(
                string.concat(
                    vm.toString(wallet),
                    " can't set the resolver of tradepit.eth: it lacks ROLE_SET_RESOLVER in the ENSv2 ETHRegistry.",
                    " Sign with the owner, ",
                    vm.toString(owner)
                )
            )
        );
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    function test_ENSv2_RevertsWhenNotRegistered() public {
        _v2Status(AVAILABLE);

        vm.expectRevert(bytes("tradepit.eth is not registered"));
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    function test_ENSv2_RevertsForSubnameOfENSv2Name() public {
        _v2Status(REGISTERED);

        vm.expectRevert(
            bytes(
                "tradepit.eth lives in ENSv2, so set the resolver of team.tradepit.eth in the ENS app (app.ens.domains)"
            )
        );
        harness.setAs(wallet, "team.tradepit.eth", resolver);
    }

    // --- ENSv1, unwrapped ---

    function test_ENSv1_SetsResolverOnRegistry() public {
        _v2Status(RESERVED);
        _v1Owner(wallet);
        _expectSetResolver(address(ENS_REGISTRY), abi.encodeCall(IENSv1.setResolver, (NODE, resolver)));

        assertEq(harness.setAs(wallet, "tradepit.eth", resolver), "ENSv1 Registry");
    }

    function test_ENSv1_AcceptsApprovedOperator() public {
        _v2Status(RESERVED);
        _v1Owner(owner);
        _approved(address(ENS_REGISTRY), true);
        _expectSetResolver(address(ENS_REGISTRY), abi.encodeCall(IENSv1.setResolver, (NODE, resolver)));

        assertEq(harness.setAs(wallet, "tradepit.eth", resolver), "ENSv1 Registry");
    }

    function test_ENSv1_RevertsForStranger() public {
        _v2Status(RESERVED);
        _v1Owner(owner);
        _approved(address(ENS_REGISTRY), false);

        vm.expectRevert(
            bytes(
                string.concat(
                    vm.toString(wallet),
                    " can't set the resolver of tradepit.eth: it is not the owner or an approved operator in the",
                    " ENSv1 Registry. Sign with the owner, ",
                    vm.toString(owner)
                )
            )
        );
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    function test_ENSv1_RevertsWithoutOwner() public {
        _v2Status(RESERVED);
        _v1Owner(address(0));

        vm.expectRevert(bytes("tradepit.eth has no owner in ENSv1"));
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    function test_ENSv1_NonEthNameSkipsENSv2() public {
        bytes32 node = vm.ensNamehash("tradepit.xyz");
        vm.mockCall(address(ENS_REGISTRY), abi.encodeCall(IENSRegistry.owner, (node)), abi.encode(wallet));
        _expectSetResolver(address(ENS_REGISTRY), abi.encodeCall(IENSv1.setResolver, (node, resolver)));
        vm.expectCall(address(ETH_REGISTRY), "", 0);

        assertEq(harness.setAs(wallet, "tradepit.xyz", resolver), "ENSv1 Registry");
    }

    // --- ENSv1, wrapped ---

    function test_ENSv1Wrapped_SetsResolverOnNameWrapper() public {
        _v2Status(RESERVED);
        _v1Owner(address(NAME_WRAPPER));
        _wrappedData(wallet, 0);
        _expectSetResolver(address(NAME_WRAPPER), abi.encodeCall(IENSv1.setResolver, (NODE, resolver)));

        assertEq(harness.setAs(wallet, "tradepit.eth", resolver), "ENSv1 NameWrapper");
    }

    function test_ENSv1Wrapped_RevertsForStranger() public {
        _v2Status(RESERVED);
        _v1Owner(address(NAME_WRAPPER));
        _wrappedData(owner, 0);
        _approved(address(NAME_WRAPPER), false);

        vm.expectRevert(
            bytes(
                string.concat(
                    vm.toString(wallet),
                    " can't set the resolver of tradepit.eth: it is not the owner or an approved operator in the",
                    " ENSv1 NameWrapper. Sign with the owner, ",
                    vm.toString(owner)
                )
            )
        );
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    function test_ENSv1Wrapped_RevertsWhenFuseBurned() public {
        _v2Status(RESERVED);
        _v1Owner(address(NAME_WRAPPER));
        _wrappedData(wallet, CANNOT_SET_RESOLVER);

        vm.expectRevert(
            bytes("tradepit.eth is wrapped with the CANNOT_SET_RESOLVER fuse burned: its resolver can never change")
        );
        harness.setAs(wallet, "tradepit.eth", resolver);
    }

    // --- helpers ---

    function _v2Status(uint8 status) internal {
        vm.mockCall(address(ETH_REGISTRY), abi.encodeCall(IETHRegistry.getStatus, (TRADEPIT)), abi.encode(status));
    }

    function _registeredInV2(address v2Owner) internal {
        _v2Status(REGISTERED);
        vm.mockCall(address(ETH_REGISTRY), abi.encodeCall(IETHRegistry.getOwner, (TRADEPIT)), abi.encode(v2Owner));
    }

    function _hasSetResolverRole(address account, bool has) internal {
        vm.mockCall(
            address(ETH_REGISTRY),
            abi.encodeCall(IETHRegistry.hasRoles, (TRADEPIT, ROLE_SET_RESOLVER, account)),
            abi.encode(has)
        );
    }

    function _v1Owner(address v1Owner) internal {
        vm.mockCall(address(ENS_REGISTRY), abi.encodeCall(IENSRegistry.owner, (NODE)), abi.encode(v1Owner));
    }

    function _wrappedData(address wrappedOwner, uint32 fuses) internal {
        vm.mockCall(
            address(NAME_WRAPPER),
            abi.encodeCall(INameWrapper.getData, (uint256(NODE))),
            abi.encode(wrappedOwner, fuses, uint64(block.timestamp + 365 days))
        );
    }

    function _approved(address registry, bool approved) internal {
        vm.mockCall(registry, abi.encodeCall(IENSv1.isApprovedForAll, (owner, wallet)), abi.encode(approved));
    }

    /// @dev The mock accepts only this exact call, and the test fails unless it happens.
    function _expectSetResolver(address registry, bytes memory call) internal {
        vm.mockCall(registry, call, "");
        vm.expectCall(registry, call);
    }
}

interface IBaseRegistrar {
    function ownerOf(uint256 id) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
}

interface INameWrapperWrap {
    // The NameWrapper's own function name, so the ABI matches.
    // forge-lint: disable-next-line(mixed-case-function)
    function wrapETH2LD(string calldata label, address wrappedOwner, uint16 ownerControlledFuses, address resolver)
        external
        returns (uint64 expiry);
}

interface IResolverReads {
    function getResolver(string calldata label) external view returns (address); // ENSv2 ETHRegistry
    function resolver(bytes32 node) external view returns (address); // ENSv1 Registry
}

/// @notice The same checks against the real mainnet contracts. Skipped unless MAINNET_RPC_URL is set,
///         and tied to mainnet state: tradepit.eth is in ENSv2, vitalik.eth hasn't migrated.
contract ParentSetupForkTest is Test {
    IBaseRegistrar constant BASE_REGISTRAR = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);

    ParentSetupHarness harness;
    address resolver = makeAddr("resolver");

    function setUp() public {
        string memory rpcUrl = vm.envOr("MAINNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            vm.skip(true, "set MAINNET_RPC_URL to run the mainnet fork tests");
            return;
        }
        vm.createSelectFork(rpcUrl);
        harness = new ParentSetupHarness();
    }

    function test_Fork_ENSv2_TradepitEth() public {
        address owner = ETH_REGISTRY.getOwner(uint256(keccak256("tradepit")));

        assertEq(harness.setAs(owner, "tradepit.eth", resolver), "ENSv2 ETHRegistry");
        assertEq(IResolverReads(address(ETH_REGISTRY)).getResolver("tradepit"), resolver);
    }

    function test_Fork_ENSv1_VitalikEth() public {
        bytes32 node = vm.ensNamehash("vitalik.eth");
        address owner = ENS_REGISTRY.owner(node);

        assertEq(harness.setAs(owner, "vitalik.eth", resolver), "ENSv1 Registry");
        assertEq(IResolverReads(address(ENS_REGISTRY)).resolver(node), resolver);
    }

    function test_Fork_ENSv1Wrapped_VitalikEth() public {
        bytes32 node = vm.ensNamehash("vitalik.eth");
        address owner = ENS_REGISTRY.owner(node);
        address registrant = BASE_REGISTRAR.ownerOf(uint256(keccak256("vitalik")));
        vm.startPrank(registrant);
        BASE_REGISTRAR.setApprovalForAll(address(NAME_WRAPPER), true);
        INameWrapperWrap(address(NAME_WRAPPER)).wrapETH2LD("vitalik", owner, 0, address(0));
        vm.stopPrank();

        assertEq(harness.setAs(owner, "vitalik.eth", resolver), "ENSv1 NameWrapper");
        assertEq(IResolverReads(address(ENS_REGISTRY)).resolver(node), resolver);
    }

    function test_Fork_RevertsForStranger() public {
        address stranger = makeAddr("stranger");
        address owner = ETH_REGISTRY.getOwner(uint256(keccak256("tradepit")));

        vm.expectRevert(
            bytes(
                string.concat(
                    vm.toString(stranger),
                    " can't set the resolver of tradepit.eth: it lacks ROLE_SET_RESOLVER in the ENSv2 ETHRegistry.",
                    " Sign with the owner, ",
                    vm.toString(owner)
                )
            )
        );
        harness.setAs(stranger, "tradepit.eth", resolver);
    }
}
