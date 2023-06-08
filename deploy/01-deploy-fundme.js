const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let ethUSAggregatorAddress

    if (chainId == 31337) {
        const ethUSAggregator = await deployments.get("MockV3Aggregator")
        ethUSAggregatorAddress = ethUSAggregator.address
    } else {
        ethUSAggregatorAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    log("等待部署。。")

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUSAggregatorAddress],
        log: true,
        gasPrice: 2500000000,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`是谁部署的:${deployer}`)
    log(`部署地址:${fundMe.address}`)
    if (!developmentChains.includes(network.name)) {
        await verify(fundMe.address, [ethUSAggregatorAddress])
    }
}

module.exports.tags = ["all", "fundme"]
