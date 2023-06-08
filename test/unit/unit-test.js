const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("fundme", () => {
          let deployer
          let fundme
          let Mock
          const sendValue = ethers.utils.parseEther("0.01")
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              const [owner, otherdeployer1, otherdeployer2] =
                  await ethers.getSigners()

            //   console.log(`default signers(deployer):${owner.address}`)
            //   console.log(`deployer:${deployer}`)
            //   console.log(`其他deployer1:${otherdeployer1.address}`)
            //   console.log(`其他deployer2:${otherdeployer2.address}`)

              await deployments.fixture(["all"])
              fundme = await ethers.getContract("FundMe")
              const deployerbalance = await fundme.provider.getBalance(deployer)
              //console.log(`hardhat default deployer余额:${deployerbalance}`)
              //   await fundme.connect(otherdeployer1)
              //   const deployerbalance1 = await fundme.provider.getBalance(deployer)
              //   console.log(`hardhat default deployer1余额:${deployerbalance1}`)

              Mock = await ethers.getContract("MockV3Aggregator")

            //   console.log(`fundme合约地址:${fundme.address}`)
            //   console.log(`Mock当前价格:${await Mock.latestRoundData()}`)
          })
          describe("constructor", function () {
              it("aggregator设置正确", async () => {
                  const reponse = await fundme.getPriceFeed()
                  assert.equal(reponse, Mock.address)
              })
          })
          describe("fundme", function () {
              it("没有发送足够的ETH", async () => {
                  await expect(fundme.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("更新fund数据", async () => {
                  await fundme.fund({ value: sendValue })
                  const reponse = await fundme.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(reponse.toString(), sendValue.toString())
              })
              it("把funder添加到数组", async () => {
                  await fundme.fund({ value: sendValue })
                  const reponse = await fundme.getFunder(0)
                  assert.equal(reponse, deployer)
              })
          })
          describe("withdraw", function () {
              beforeEach(async () => {
                  await fundme.fund({ value: sendValue })
              })
              it("只有owner才能withdraw", async () => {
                  const accounts = await ethers.getSigners()
                  const address1 = await fundme.connect(accounts[1])
                  expect(address1.withdraw()).to.be.revertedWith(
                      "FundMe__NotOwner"
                  )
              })
              it("只有一个funder, owner取钱", async () => {
                  const fundmestartingbalance =
                      await fundme.provider.getBalance(fundme.address)
                  const deployerstartingbalance =
                      await fundme.provider.getBalance(deployer)

                  const txresponse = await fundme.withdraw()
                  const txreciept = await txresponse.wait()
                  const { gasUsed, effectiveGasPrice } = txreciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const fundmeendingbalance = await fundme.provider.getBalance(
                      fundme.address
                  )
                  const deployerending = await fundme.provider.getBalance(
                      deployer
                  )

                  assert.equal(fundmeendingbalance, 0)
                  assert.equal(
                      deployerstartingbalance
                          .add(fundmestartingbalance)
                          .toString(),
                      deployerending.add(gasCost).toString()
                  )
              })
              it("收到好多funders的fund,owner取钱 ", async () => {
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 6; i++) {
                      const newContract = await fundme.connect(accounts[i])
                      await newContract.fund({ value: sendValue })
                  }

                  const fundmestartingbalance =
                      await fundme.provider.getBalance(fundme.address)
                  const deployerstartingbalance =
                      await fundme.provider.getBalance(deployer)

                  const txresponse = await fundme.withdraw()
                  const txreciept = await txresponse.wait()
                  const { gasUsed, effectiveGasPrice } = txreciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const fundmeendingbalance = await fundme.provider.getBalance(
                      fundme.address
                  )
                  const deployerending = await fundme.provider.getBalance(
                      deployer
                  )

                  assert.equal(fundmeendingbalance, 0)
                  assert.equal(
                      deployerstartingbalance
                          .add(fundmestartingbalance)
                          .toString(),
                      deployerending.add(gasCost).toString()
                  )
                  expect(fundme.getFunder()).to.be.reverted
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundme.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
          })
      })
