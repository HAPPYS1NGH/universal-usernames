// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OffchainResolver} from "../src/OffchainResolver.sol";

/// @notice Deploys OffchainResolver. The broadcasting account becomes its owner.
/// @dev Sign with a Foundry keystore account, never a raw private key:
///
///   forge script script/Deploy.s.sol --rpc-url $MAINNET_RPC_URL --account deployer --broadcast
contract Deploy is Script {
    function run() external returns (OffchainResolver resolver) {
        string memory gatewayUrl = vm.envString("GATEWAY_URL");
        address signer = vm.envAddress("SIGNER_ADDRESS");

        // A URL without the EIP-3668 placeholders deploys fine and then never resolves.
        require(
            vm.contains(gatewayUrl, "{sender}") && vm.contains(gatewayUrl, "{data}"),
            "GATEWAY_URL must look like https://<host>/{sender}/{data}.json"
        );

        address[] memory signers = new address[](1);
        signers[0] = signer;

        vm.startBroadcast();
        resolver = new OffchainResolver(gatewayUrl, signers);
        vm.stopBroadcast();

        console.log("OffchainResolver:", address(resolver));
        console.log("Owner:           ", resolver.owner());
        console.log("Signer:          ", signer);
        console.log("Gateway URL:     ", gatewayUrl);
    }
}
