// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice ENSIP-10: a resolver that can answer for names it was not set on directly (wildcards).
interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/// @title OffchainResolver
/// @notice Resolves every `<username>.<parent>` by asking a CCIP-Read gateway (EIP-3668) and
///         accepting the answer only if a trusted signer signed it.
/// @dev Based on ensdomains/offchain-resolver (MIT): https://github.com/ensdomains/offchain-resolver
///      It uses the same request and signature format, so gateways built for it work here too.
///      Changes: no dependencies, an owner who can change the gateway URL and signers without
///      redeploying, and custom errors.
contract OffchainResolver is IExtendedResolver, IERC165 {
    /// @notice EIP-3668: "fetch one of `urls`, then call `callbackFunction(response, extraData)` on `sender`".
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);
    error SignatureExpired();
    error InvalidSignature();
    error NotOwner();
    error ZeroAddress();

    event UrlChanged(string url);
    event SignerChanged(address indexed signer, bool trusted);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @dev Half the secp256k1 curve order. Signatures with a larger `s` are rejected (EIP-2).
    uint256 private constant MAX_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    address public owner;
    /// @notice Gateway URL template, e.g. https://gateway.example/{sender}/{data}.json
    string public url;
    mapping(address signer => bool trusted) public signers;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(string memory url_, address[] memory signers_) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        _setUrl(url_);
        _setSigners(signers_, true);
    }

    /// @notice ENSIP-10 entry point. It never answers onchain: it always sends the client to the gateway.
    /// @param name DNS-encoded name, e.g. 0x05"happy" 0x08"tradepit" 0x03"eth" 0x00
    /// @param data The record call, e.g. addr(node) or text(node, "avatar")
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        bytes memory callData = abi.encodeCall(IExtendedResolver.resolve, (name, data));
        string[] memory urls = new string[](1);
        urls[0] = url;
        // extraData carries the request to the callback, which checks that the signature covers it.
        revert OffchainLookup(address(this), urls, callData, this.resolveWithProof.selector, callData);
    }

    /// @notice EIP-3668 callback: checks the gateway's answer and returns the result.
    /// @param response The gateway's answer: abi.encode(bytes result, uint64 expires, bytes signature)
    /// @param extraData The callData from OffchainLookup, i.e. the request the gateway answered
    /// @return The record, ABI-encoded as the original record function returns it
    function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory) {
        (bytes memory result, uint64 expires, bytes memory signature) = abi.decode(response, (bytes, uint64, bytes));
        if (expires < block.timestamp) revert SignatureExpired();

        address signer = _recover(makeSignatureHash(address(this), expires, extraData, result), signature);
        if (signer == address(0) || !signers[signer]) revert InvalidSignature();
        return result;
    }

    /// @notice The hash the gateway signs. Same as SignatureVerifier.makeSignatureHash upstream.
    /// @dev 0x19 0x00 is EIP-191 version 0, "data with intended validator". Including the resolver
    ///      address means an answer signed for one resolver is rejected by every other one.
    function makeSignatureHash(address target, uint64 expires, bytes memory request, bytes memory result)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(hex"1900", target, expires, keccak256(request), keccak256(result)));
    }

    /// @dev IExtendedResolver tells ENS clients and the Universal Resolver to use wildcard resolution.
    ///      ERC-7996 (resolver features) is deliberately not advertised: with it, the Universal Resolver
    ///      calls this resolver directly and wallets see the Universal Resolver as the EIP-3668 `sender`,
    ///      so the gateway would sign for the wrong address. Without it, lookups go through the batch
    ///      gateway, which keeps this contract as `sender`.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IExtendedResolver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /// @notice Point the resolver at a new gateway, e.g. after moving hosts.
    function setUrl(string calldata url_) external onlyOwner {
        _setUrl(url_);
    }

    /// @notice Trust or stop trusting signer keys. To rotate a key: trust the new key, switch the
    ///         gateway to it, then stop trusting the old key.
    function setSigners(address[] calldata signers_, bool trusted) external onlyOwner {
        _setSigners(signers_, trusted);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _setUrl(string memory url_) private {
        url = url_;
        emit UrlChanged(url_);
    }

    function _setSigners(address[] memory signers_, bool trusted) private {
        for (uint256 i; i < signers_.length; ++i) {
            if (signers_[i] == address(0)) revert ZeroAddress();
            signers[signers_[i]] = trusted;
            emit SignerChanged(signers_[i], trusted);
        }
    }

    /// @dev ecrecover plus the checks it lacks. Returns address(0) for any invalid signature.
    function _recover(bytes32 hash, bytes memory signature) private pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Every signature has a twin (s' = n - s, flipped v) that recovers the same address.
        // Accepting only the low-s form makes each signature unique.
        if (uint256(s) > MAX_S) return address(0);
        if (v != 27 && v != 28) return address(0);
        return ecrecover(hash, v, r, s); // address(0) if recovery fails
    }
}
