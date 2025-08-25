// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract SimpleStorage {
    uint256 public value;
    
    event ValueChanged(uint256 newValue);
    
    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }
}

contract DeployScript is Script {
    function run() external {
        // This will be signed by Turnkey via the RPC proxy
        vm.startBroadcast();
        
        console.log("Deploying SimpleStorage contract...");
        console.log("Deployer address:", msg.sender);
        
        SimpleStorage simpleStorage = new SimpleStorage();
        
        console.log("SimpleStorage deployed to:", address(simpleStorage));
        
        // Set initial value
        simpleStorage.setValue(42);
        console.log("Initial value set to:", simpleStorage.value());
        
        vm.stopBroadcast();
    }
}