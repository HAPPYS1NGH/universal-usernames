// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OffchainResolver, IExtendedResolver} from "../src/OffchainResolver.sol";

/// @notice Feeds answers produced by the real gateway code (gateway/scripts/export-fixture.ts)
///         to the resolver, proving both sides agree on the request, encoding and signature.
contract GatewayFixtureTest is Test {
    string constant URL = "https://gateway.example/{sender}/{data}.json";
    // DNS-encoded "happy.tradepit.eth"
    bytes constant NAME = hex"0568617070790874726164657069740365746800";

    string fixture;
    OffchainResolver resolver;

    function setUp() public {
        // Reads the committed gateway fixture. fs_permissions in foundry.toml limits reads to test/fixtures.
        // forge-lint: disable-next-line(unsafe-cheatcode)
        fixture = vm.readFile("test/fixtures/gateway-response.json");

        address[] memory signers = new address[](1);
        signers[0] = vm.parseJsonAddress(fixture, ".signer");

        // The gateway signed for this exact resolver address, so deploy there.
        address at = vm.parseJsonAddress(fixture, ".resolver");
        deployCodeTo("OffchainResolver.sol:OffchainResolver", abi.encode(URL, signers), at);
        resolver = OffchainResolver(at);

        vm.warp(vm.parseJsonUint(fixture, ".expires") - 60);
    }

    function test_ResolverSendsTheRequestTheGatewayAnswered() public {
        bytes memory addrCall = abi.encodeWithSignature("addr(bytes32)", vm.ensNamehash("happy.tradepit.eth"));
        bytes memory request = vm.parseJsonBytes(fixture, ".addr.request");
        assertEq(abi.encodeCall(IExtendedResolver.resolve, (NAME, addrCall)), request);

        string[] memory urls = new string[](1);
        urls[0] = URL;
        vm.expectRevert(
            abi.encodeWithSelector(
                OffchainResolver.OffchainLookup.selector,
                address(resolver),
                urls,
                request,
                OffchainResolver.resolveWithProof.selector,
                request
            )
        );
        resolver.resolve(NAME, addrCall);
    }

    function test_VerifiesGatewayAddrAnswer() public view {
        bytes memory result = resolver.resolveWithProof(
            vm.parseJsonBytes(fixture, ".addr.response"), vm.parseJsonBytes(fixture, ".addr.request")
        );

        assertEq(abi.decode(result, (address)), vm.parseJsonAddress(fixture, ".addr.expected"));
    }

    function test_VerifiesGatewayTextAnswer() public view {
        bytes memory result = resolver.resolveWithProof(
            vm.parseJsonBytes(fixture, ".text.response"), vm.parseJsonBytes(fixture, ".text.request")
        );

        assertEq(abi.decode(result, (string)), vm.parseJsonString(fixture, ".text.expected"));
    }

    function test_RejectsGatewayAnswerForAnotherRequest() public {
        // The addr answer replayed as if it answered the text request.
        bytes memory addrResponse = vm.parseJsonBytes(fixture, ".addr.response");
        bytes memory textRequest = vm.parseJsonBytes(fixture, ".text.request");

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(addrResponse, textRequest);
    }

    function test_RejectsGatewayAnswerAfterExpiry() public {
        vm.warp(vm.parseJsonUint(fixture, ".expires") + 1);

        vm.expectRevert(OffchainResolver.SignatureExpired.selector);
        resolver.resolveWithProof(
            vm.parseJsonBytes(fixture, ".addr.response"), vm.parseJsonBytes(fixture, ".addr.request")
        );
    }
}
