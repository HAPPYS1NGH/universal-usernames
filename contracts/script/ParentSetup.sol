// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CommonBase} from "forge-std/Base.sol";

/// @dev What the ENSv1 Registry and the NameWrapper have in common.
interface IENSv1 {
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function setResolver(bytes32 node, address resolver) external;
}

interface IENSRegistry is IENSv1 {
    function owner(bytes32 node) external view returns (address);
}

interface INameWrapper is IENSv1 {
    function getData(uint256 id) external view returns (address owner, uint32 fuses, uint64 expiry);
}

/// @dev The ENSv2 registry for .eth names. `anyId` takes the labelhash.
interface IETHRegistry {
    function getStatus(uint256 anyId) external view returns (uint8);
    function getOwner(uint256 anyId) external view returns (address);
    function hasRoles(uint256 anyId, uint256 roleBitmap, address account) external view returns (bool);
    function setResolver(uint256 anyId, address resolver) external;
}

// Ethereum mainnet. Addresses from https://docs.ens.domains/learn/deployments
IENSRegistry constant ENS_REGISTRY = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e); // ENSv1
INameWrapper constant NAME_WRAPPER = INameWrapper(0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401); // ENSv1
IETHRegistry constant ETH_REGISTRY = IETHRegistry(0xf60aba43E1f7F3DAB1186Ff03B561401C9Df85E2); // ENSv2

uint8 constant AVAILABLE = 0; // ENSv2 status. 1 is RESERVED: the name hasn't migrated from ENSv1.
uint8 constant REGISTERED = 2;
uint256 constant ROLE_SET_RESOLVER = 1 << 24; // ENSv2 role
uint32 constant CANNOT_SET_RESOLVER = 8; // NameWrapper fuse

/// @notice gateway/scripts/parent-setup.ts in Solidity: finds the contract that holds a parent name's
///         resolver, checks that `wallet` may change it, and sets it.
abstract contract ParentSetup is CommonBase {
    /// @dev Call it while broadcasting from `wallet`. Each failed check reverts with the reason, and
    ///      forge runs the whole script before it sends anything, so nothing is sent.
    /// @param name A normalized name, e.g. tradepit.eth
    /// @return registry Which contract now holds the resolver, for the logs
    function setParentResolver(string memory name, address resolver, address wallet)
        internal
        returns (string memory registry)
    {
        string[] memory labels = vm.split(name, ".");

        // 1. ENSv2 first: a .eth name REGISTERED in the ETHRegistry, migrated or registered there,
        //    has no ENSv1 resolver anymore. RESERVED means it hasn't migrated, so ENSv1 still decides.
        if (labels.length >= 2 && keccak256(bytes(labels[labels.length - 1])) == keccak256("eth")) {
            string memory label = labels[labels.length - 2];
            uint256 id = uint256(keccak256(bytes(label)));
            uint8 status = ETH_REGISTRY.getStatus(id);
            require(status != AVAILABLE, string.concat(label, ".eth is not registered"));

            if (status == REGISTERED) {
                require(
                    labels.length == 2,
                    string.concat(
                        label, ".eth lives in ENSv2, so set the resolver of ", name, " in the ENS app (app.ens.domains)"
                    )
                );
                address v2Owner = ETH_REGISTRY.getOwner(id);
                require(
                    ETH_REGISTRY.hasRoles(id, ROLE_SET_RESOLVER, wallet),
                    _cannotSet(wallet, name, "lacks ROLE_SET_RESOLVER in the ENSv2 ETHRegistry", v2Owner)
                );
                ETH_REGISTRY.setResolver(id, resolver);
                return "ENSv2 ETHRegistry";
            }
        }

        // 2. ENSv1: the registry owner tells wrapped from unwrapped.
        bytes32 node = vm.ensNamehash(name);
        address owner = ENS_REGISTRY.owner(node);
        require(owner != address(0), string.concat(name, " has no owner in ENSv1"));

        IENSv1 target = ENS_REGISTRY;
        registry = "ENSv1 Registry";
        if (owner == address(NAME_WRAPPER)) {
            uint32 fuses;
            (owner, fuses,) = NAME_WRAPPER.getData(uint256(node));
            require(
                fuses & CANNOT_SET_RESOLVER == 0,
                string.concat(
                    name, " is wrapped with the CANNOT_SET_RESOLVER fuse burned: its resolver can never change"
                )
            );
            target = NAME_WRAPPER;
            registry = "ENSv1 NameWrapper";
        }

        require(
            owner == wallet || target.isApprovedForAll(owner, wallet),
            _cannotSet(wallet, name, string.concat("is not the owner or an approved operator in the ", registry), owner)
        );
        target.setResolver(node, resolver);
    }

    function _cannotSet(address wallet, string memory name, string memory reason, address owner)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            vm.toString(wallet),
            " can't set the resolver of ",
            name,
            ": it ",
            reason,
            ". Sign with the owner, ",
            vm.toString(owner)
        );
    }
}
