// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OffchainResolver, IExtendedResolver, IERC165} from "../src/OffchainResolver.sol";

contract OffchainResolverTest is Test {
    string constant URL = "https://gateway.example/{sender}/{data}.json";
    // DNS-encoded "happy.tradepit.eth"
    bytes constant NAME = hex"0568617070790874726164657069740365746800";
    address constant HAPPY = 0x779981590E7Ccc0CFAe8040Ce7151324747cDb97;
    uint256 constant SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    OffchainResolver resolver;
    address signer;
    uint256 signerKey;

    bytes request;
    bytes result;
    uint64 expires;

    function setUp() public {
        (signer, signerKey) = makeAddrAndKey("gateway-signer");
        resolver = new OffchainResolver(URL, _list(signer));

        bytes memory addrCall = abi.encodeWithSignature("addr(bytes32)", vm.ensNamehash("happy.tradepit.eth"));
        request = abi.encodeCall(IExtendedResolver.resolve, (NAME, addrCall));
        result = abi.encode(HAPPY);
        expires = uint64(block.timestamp + 300);
    }

    // --- resolve ---

    function test_Resolve_RevertsOffchainLookup() public {
        bytes memory addrCall = abi.encodeWithSignature("addr(bytes32)", vm.ensNamehash("happy.tradepit.eth"));
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

    // --- resolveWithProof ---

    function test_ResolveWithProof_ReturnsSignedResult() public view {
        bytes memory response = _response(signerKey, address(resolver), expires, request, result);

        bytes memory answer = resolver.resolveWithProof(response, request);

        assertEq(answer, result);
        assertEq(abi.decode(answer, (address)), HAPPY);
    }

    function test_ResolveWithProof_AcceptsUntilExpiry() public {
        bytes memory response = _response(signerKey, address(resolver), expires, request, result);

        vm.warp(expires);
        assertEq(resolver.resolveWithProof(response, request), result);

        vm.warp(uint256(expires) + 1);
        vm.expectRevert(OffchainResolver.SignatureExpired.selector);
        resolver.resolveWithProof(response, request);
    }

    function test_ResolveWithProof_RejectsWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        bytes memory response = _response(strangerKey, address(resolver), expires, request, result);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, request);
    }

    function test_ResolveWithProof_RejectsTamperedResult() public {
        bytes memory signature = _sign(signerKey, address(resolver), expires, request, result);
        bytes memory response = abi.encode(abi.encode(address(0xBAD)), expires, signature);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, request);
    }

    function test_ResolveWithProof_RejectsTamperedRequest() public {
        bytes memory response = _response(signerKey, address(resolver), expires, request, result);
        bytes memory otherRequest = abi.encodeCall(
            IExtendedResolver.resolve,
            (NAME, abi.encodeWithSignature("addr(bytes32)", vm.ensNamehash("someone.tradepit.eth")))
        );

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, otherRequest);
    }

    function test_ResolveWithProof_RejectsTamperedExpiry() public {
        bytes memory signature = _sign(signerKey, address(resolver), expires, request, result);
        bytes memory response = abi.encode(result, expires + 1 days, signature);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, request);
    }

    function test_ResolveWithProof_RejectsAnswerSignedForAnotherResolver() public {
        bytes memory response = _response(signerKey, address(0xBEEF), expires, request, result);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, request);
    }

    function test_ResolveWithProof_RejectsHighSTwin() public {
        bytes32 hash = resolver.makeSignatureHash(address(resolver), expires, request, result);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, hash);
        // Same signer, mirrored signature: ecrecover alone would accept it.
        bytes memory twin = abi.encodePacked(r, bytes32(SECP256K1_N - uint256(s)), v == 27 ? uint8(28) : uint8(27));
        assertEq(ecrecover(hash, v == 27 ? 28 : 27, r, bytes32(SECP256K1_N - uint256(s))), signer);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(abi.encode(result, expires, twin), request);
    }

    function test_ResolveWithProof_RejectsMalformedSignatures() public {
        bytes memory valid = _sign(signerKey, address(resolver), expires, request, result);
        bytes memory badV = bytes.concat(_slice(valid, 64), bytes1(uint8(29)));

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(abi.encode(result, expires, _slice(valid, 64)), request);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(abi.encode(result, expires, badV), request);

        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(abi.encode(result, expires, new bytes(65)), request);
    }

    // --- supportsInterface ---

    function test_SupportsInterface() public view {
        assertTrue(resolver.supportsInterface(0x9061b923)); // IExtendedResolver
        assertTrue(resolver.supportsInterface(type(IExtendedResolver).interfaceId));
        assertTrue(resolver.supportsInterface(type(IERC165).interfaceId));
        assertFalse(resolver.supportsInterface(0xffffffff));
        // ERC-7996 stays off so the Universal Resolver keeps this contract as the EIP-3668 sender.
        assertFalse(resolver.supportsInterface(bytes4(keccak256("supportsFeature(bytes4)"))));
    }

    // --- owner ---

    function test_Owner_IsDeployer() public view {
        assertEq(resolver.owner(), address(this));
        assertEq(resolver.url(), URL);
        assertTrue(resolver.signers(signer));
    }

    function test_SetUrl() public {
        string memory newUrl = "https://new-host.example/{sender}/{data}.json";

        vm.expectEmit(address(resolver));
        emit OffchainResolver.UrlChanged(newUrl);
        resolver.setUrl(newUrl);

        assertEq(resolver.url(), newUrl);
    }

    function test_SetSigners_RotatesKey() public {
        (address newSigner, uint256 newKey) = makeAddrAndKey("new-signer");
        bytes memory oldAnswer = _response(signerKey, address(resolver), expires, request, result);
        bytes memory newAnswer = _response(newKey, address(resolver), expires, request, result);

        resolver.setSigners(_list(newSigner), true);
        resolver.setSigners(_list(signer), false);

        assertEq(resolver.resolveWithProof(newAnswer, request), result);
        vm.expectRevert(OffchainResolver.InvalidSignature.selector);
        resolver.resolveWithProof(oldAnswer, request);
    }

    function test_SetSigners_RejectsZeroAddress() public {
        vm.expectRevert(OffchainResolver.ZeroAddress.selector);
        resolver.setSigners(_list(address(0)), true);
    }

    function test_TransferOwnership() public {
        address newOwner = makeAddr("new-owner");
        resolver.transferOwnership(newOwner);
        assertEq(resolver.owner(), newOwner);

        vm.expectRevert(OffchainResolver.NotOwner.selector);
        resolver.setUrl("https://old-owner.example/{sender}/{data}.json");

        vm.expectRevert(OffchainResolver.ZeroAddress.selector);
        vm.prank(newOwner);
        resolver.transferOwnership(address(0));
    }

    function test_OnlyOwner() public {
        vm.startPrank(makeAddr("stranger"));

        vm.expectRevert(OffchainResolver.NotOwner.selector);
        resolver.setUrl("https://evil.example/{sender}/{data}.json");

        vm.expectRevert(OffchainResolver.NotOwner.selector);
        resolver.setSigners(_list(makeAddr("evil-signer")), true);

        vm.expectRevert(OffchainResolver.NotOwner.selector);
        resolver.transferOwnership(makeAddr("stranger"));
    }

    // --- helpers ---

    function _sign(uint256 key, address target, uint64 expiry, bytes memory req, bytes memory res)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, resolver.makeSignatureHash(target, expiry, req, res));
        return abi.encodePacked(r, s, v);
    }

    function _response(uint256 key, address target, uint64 expiry, bytes memory req, bytes memory res)
        internal
        view
        returns (bytes memory)
    {
        return abi.encode(res, expiry, _sign(key, target, expiry, req, res));
    }

    function _list(address account) internal pure returns (address[] memory accounts) {
        accounts = new address[](1);
        accounts[0] = account;
    }

    function _slice(bytes memory data, uint256 length) internal pure returns (bytes memory out) {
        out = new bytes(length);
        for (uint256 i; i < length; ++i) {
            out[i] = data[i];
        }
    }
}
