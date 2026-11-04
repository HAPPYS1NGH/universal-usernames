// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";
import {ParentSetup} from "./ParentSetup.sol";

/// @notice Deploys OffchainResolver, owned by the wallet that signs. If PARENT_NAME is set, it also
///         sets it as that name's resolver, so the wallet must be allowed to change it.
/// @dev Sign in MetaMask or another browser wallet (Foundry 1.7 or later), never with a raw private key:
///
///   forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --browser --slow
///
///   Or with a Foundry keystore: replace `--browser --slow` with `--account <name>`.
contract Deploy is Script, ParentSetup {
    function run() external returns (OffchainResolver resolver) {
        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        address signer = vm.envAddress("SIGNER_ADDRESS");
        string memory parentName = vm.envOr("PARENT_NAME", string("")); // empty: deploy only

        // A URL without the EIP-3668 placeholders deploys fine and then never resolves.
        require(
            vm.contains(gatewayUrl, "{sender}") && vm.contains(gatewayUrl, "{data}"),
            "GATEWAY_URL must look like https://<host>/{sender}/{data}.json"
        );

        address[] memory signers = new address[](1);
        signers[0] = signer;

        vm.startBroadcast();
        resolver = new OffchainResolver(gatewayUrl, signers);
        string memory registry;
        if (bytes(parentName).length != 0) {
            // The resolver's owner is the wallet signing these transactions. msg.sender may not be:
            // with --account, Foundry before 1.7 runs the script as its default sender.
            registry = setParentResolver(parentName, address(resolver), resolver.owner());
        }
        vm.stopBroadcast();

        console.log("OffchainResolver:", address(resolver));
        console.log("Owner:           ", resolver.owner());
        console.log("Signer:          ", signer);
        console.log("Gateway URL:     ", gatewayUrl);
        if (bytes(parentName).length != 0) {
            console.log("Parent name:     ", parentName);
            console.log("Resolver set on: ", registry);
        }
    }
}
