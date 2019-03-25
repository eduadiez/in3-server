/***********************************************************
* This file is part of the Slock.it IoT Layer.             *
* The Slock.it IoT Layer contains:                         *
*   - USN (Universal Sharing Network)                      *
*   - INCUBED (Trustless INcentivized remote Node Network) *
************************************************************
* Copyright (C) 2016 - 2018 Slock.it GmbH                  *
* All Rights Reserved.                                     *
************************************************************
* You may use, distribute and modify this code under the   *
* terms of the license contract you have concluded with    *
* Slock.it GmbH.                                           *
* For information about liability, maintenance etc. also   *
* refer to the contract concluded with Slock.it GmbH.      *
************************************************************
* For more information, please refer to https://slock.it   *
* For questions, please contact info@slock.it              *
***********************************************************/

import { assert } from 'chai'
import 'mocha'
import { util, BlockData, serialize } from 'in3'
import * as tx from '../../src/util/tx'
import { TestTransport, LoggingAxiosTransport } from '../utils/transport'
import { deployBlockhashRegistry } from '../../src/util/registry'
import { Block } from 'in3/js/src/modules/eth/serialize';
import * as fs from 'fs'


const blockHeaderFile = JSON.parse(fs.readFileSync('test/blockheader/blockHeaders.json').toString('utf8'))

const toNumber = util.toNumber
const toHex = util.toHex

describe('Blockheader contract', () => {


    it('deploy blockheader contract', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey
        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        const blockNumber = toNumber(block.number)
        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)
        const contractBlockHash = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber]))[0].toString('hex')
        assert.equal(block.hash, contractBlockHash)

    })

    it('getParentAndBlockhash on privateChain', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey
        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const b = new Block(block)
        const serializedHeader = b.serializeHeader()


        const contractResult = await tx.callContract(test.url, blockHashRegAddress, 'getParentAndBlockhash(bytes):(bytes32,bytes32)', [serializedHeader])

        const parentHash = "0x" + contractResult[0].toString('hex')
        const blockHash = "0x" + contractResult[1].toString('hex')

        assert.equal(parentHash, ((await test.getFromServer('eth_getBlockByHash', block.parentHash, false)) as BlockData).hash)
        assert.equal(blockHash, block.hash)
    })

    it('getParentAndBlockhash with real blocks', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const chains = Object.keys(blockHeaderFile);
        for (let j = 0; j < chains.length; j++) {
            const allBlocks = blockHeaderFile[chains[j]];

            const numberBlocks = process.env.GITLAB_CI ? allBlocks.length : 10

            for (let i = 0; i < numberBlocks; i++) {

                const b = new Block(allBlocks[i])
                const s = new serialize.Block(allBlocks[i] as any).serializeHeader()

                const contractResult = await tx.callContract(test.url, blockHashRegAddress, 'getParentAndBlockhash(bytes):(bytes32,bytes32)', [s])

                const parentHash = "0x" + contractResult[0].toString('hex')
                const blockHash = "0x" + contractResult[1].toString('hex')

                assert.equal(parentHash, allBlocks[i].parentHash)
                assert.equal(blockHash, allBlocks[i].hash)
            }
        }
    })

    it('snapshot', async () => {

        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)
        const user1 = await test.createAccount()


        const txReceipt = (await tx.callContract(test.url, blockHashRegAddress, 'snapshot()', [], { privateKey: user1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 }))
        const blockNumber = (toHex(txReceipt.blockNumber) as any) - 1

        const blockhashRPC = ((await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber), false)) as BlockData).hash
        const blockHashContract = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber]))[0].toString('hex')

        assert.equal(blockhashRPC, blockHashContract)
    })

    it('saveBlockNumber', async () => {

        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)
        const user1 = await test.createAccount()

        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        const blockNumberToSave = toNumber(block.number) - 5

        const blockHashBefore = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumberToSave]))[0].toString('hex')

        assert.equal(blockHashBefore, '0x0000000000000000000000000000000000000000000000000000000000000000')
        await tx.callContract(test.url, blockHashRegAddress, 'saveBlockNumber(uint)', [blockNumberToSave], { privateKey: user1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 })

        const blockhashRPC = ((await test.getFromServer('eth_getBlockByNumber', toHex(blockNumberToSave), false)) as BlockData).hash
        const blockHashContract = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumberToSave]))[0].toString('hex')

        assert.equal(blockhashRPC, blockHashContract)
    })

    it('saveBlockNumber fail', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)
        const user1 = await test.createAccount()

        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        const blockNumberToSave = toNumber(block.number) + 300

        const blockHashBefore = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumberToSave]))[0].toString('hex')

        assert.equal(blockHashBefore, '0x0000000000000000000000000000000000000000000000000000000000000000')

        let failed = false
        try {
            await tx.callContract(test.url, blockHashRegAddress, 'saveBlockNumber(uint)', [blockNumberToSave], { privateKey: user1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 })
        } catch (e) {

            failed = true
            assert.equal(e.message, "The Transaction failed because it returned status=0")
        }

        assert.isTrue(failed)
    })

    it('calculateBlockheaders', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const chains = Object.keys(blockHeaderFile);
        for (let j = 0; j < chains.length; j++) {

            const allBlocks = process.env.GITLAB_CI ? blockHeaderFile[chains[j]] : blockHeaderFile[chains[j]].slice(0, 10)

            const firstBlock = allBlocks.shift();

            const startHash = allBlocks[allBlocks.length - 1].hash;

            let serialzedBlocks = [];


            for (const b of allBlocks) {
                const s = new serialize.Block(b as any).serializeHeader()
                serialzedBlocks.push(s);
            }

            serialzedBlocks = serialzedBlocks.reverse()

            const result = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'calculateBlockheaders(bytes[],bytes32):(bytes32)', [serialzedBlocks, startHash]))[0].toString('hex')

            assert.equal(result, firstBlock.hash)
            //  console.log(result)
        }
    })

    it('calculateBlockheaders fail', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const chains = Object.keys(blockHeaderFile);
        for (let j = 0; j < chains.length; j++) {
            const allBlocks = process.env.GITLAB_CI ? blockHeaderFile[chains[j]] : blockHeaderFile[chains[j]].slice(0, 10)

            const firstBlock = allBlocks.shift();
            const startHash = allBlocks[allBlocks.length - 1].hash;

            let serialzedBlocks = [];

            for (const b of allBlocks) {
                const s = new serialize.Block(b as any).serializeHeader()
                serialzedBlocks.push(s);
            }

            serialzedBlocks = serialzedBlocks.reverse()

            const temp = serialzedBlocks[2]
            serialzedBlocks[2] = serialzedBlocks[3]
            serialzedBlocks[3] = temp

            const result = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'calculateBlockheaders(bytes[],bytes32):(bytes32)', [serialzedBlocks, startHash]))[0].toString('hex')

            assert.equal(result, "0x0000000000000000000000000000000000000000000000000000000000000000")
        }
    })

    const headerLength = process.env.GITLAB_CI ? 150 : 10


    it(`create ${headerLength} blocks`, async () => {
        const test = await TestTransport.createWithRegisteredServers(2)

        for (let i = 0; i < headerLength; i++) {
            await test.createAccount()
        }
    })

    it('recreateBlockheaders', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        await tx.callContract(test.url, blockHashRegAddress, 'snapshot()', [], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 })

        const blockNumber = toNumber(block.number)

        const sstart = new serialize.Block(block as any);

        let blockheaderArray = [];
        blockheaderArray.push(sstart.serializeHeader());



        for (let i = 1; i < headerLength; i++) {
            const b = await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber - i), false) as BlockData
            const s = new serialize.Block(b as any);
            blockheaderArray.push(s.serializeHeader());

        }
        const targetBlock = ("0x" + (await tx.callContract(test.url, blockHashRegAddress, 'calculateBlockheaders(bytes[],bytes32):(bytes32)', [blockheaderArray, block.hash]))[0].toString('hex'))

        const blockHashBefore = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - headerLength]))[0].toString('hex')

        const result = await tx.callContract(test.url, blockHashRegAddress, 'recreateBlockheaders(uint,bytes[])', [blockNumber, blockheaderArray], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 8000000 })

        const blockResult = await test.getFromServer('eth_getBlockByHash', targetBlock, false) as BlockData
        const blockHashAfter = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - headerLength]))[0].toString('hex')

        const blockByNumber = await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber - headerLength), false)

        assert.equal(blockByNumber.hash, blockHashAfter)

        assert.equal(toNumber(blockResult.number), toNumber(result.logs[0].topics[1]))
        assert.equal(blockResult.hash, result.logs[0].topics[2])

        assert.equal(blockHashBefore, "0x0000000000000000000000000000000000000000000000000000000000000000")
        assert.equal(blockHashAfter, blockResult.hash)

        assert.equal((blockNumber - toNumber(blockResult.number)), headerLength)
    })

    it('recreateBlockheaders fail', async () => {
        const test = await TestTransport.createWithRegisteredServers(2)
        const pk1 = test.getHandlerConfig(0).privateKey

        const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

        const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

        await tx.callContract(test.url, blockHashRegAddress, 'snapshot()', [], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 })

        const blockNumber = toNumber(block.number)

        const sstart = new serialize.Block(block as any);

        let blockheaderArray = [];
        blockheaderArray.push(sstart.serializeHeader());

        for (let i = 1; i < headerLength; i++) {
            const b = await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber - i), false) as BlockData
            const s = new serialize.Block(b as any);
            blockheaderArray.push(s.serializeHeader());

        }

        const temp = blockheaderArray[2]
        blockheaderArray[2] = blockheaderArray[3]
        blockheaderArray[3] = temp

        const targetBlock = ("0x" + (await tx.callContract(test.url, blockHashRegAddress, 'calculateBlockheaders(bytes[],bytes32):(bytes32)', [blockheaderArray, block.hash]))[0].toString('hex'))

        const blockHashBefore = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - headerLength]))[0].toString('hex')

        let failed = false
        try {
            const result = await tx.callContract(test.url, blockHashRegAddress, 'recreateBlockheaders(uint,bytes[])', [blockNumber, blockheaderArray], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 8000000 })
        } catch (e) {
            failed = true
            assert.equal(e.message, "The Transaction failed because it returned status=0")
        }

        assert.isTrue(failed)
        const blockHashAfter = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - headerLength]))[0].toString('hex')

        assert.equal(blockHashBefore, "0x0000000000000000000000000000000000000000000000000000000000000000")
        assert.equal(blockHashAfter, "0x0000000000000000000000000000000000000000000000000000000000000000")

    })

    if (process.env.GITLAB_CI) {
        it('recreateBlockheaders gas costs', async () => {

            const test = await TestTransport.createWithRegisteredServers(2)
            const pk1 = test.getHandlerConfig(0).privateKey

            const blockHashRegAddress = await deployBlockhashRegistry(pk1, test.url)

            const block = await test.getFromServer('eth_getBlockByNumber', 'latest', false) as BlockData

            await tx.callContract(test.url, blockHashRegAddress, 'snapshot()', [], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 5000000 })

            const blockNumber = toNumber(block.number)

            const sstart = new serialize.Block(block as any);

            let blockheaderArray = [];

            for (let j = 175; j <= 275; j += 5) {
                blockheaderArray.push(sstart.serializeHeader());

                for (let i = 1; i < j; i++) {
                    const b = await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber - i), false) as BlockData
                    const s = new serialize.Block(b as any);
                    blockheaderArray.push(s.serializeHeader());

                }

                const targetBlock = ("0x" + (await tx.callContract(test.url, blockHashRegAddress, 'calculateBlockheaders(bytes[],bytes32):(bytes32)', [blockheaderArray, block.hash]))[0].toString('hex'))

                const blockHashBefore = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - j]))[0].toString('hex')

                const result = await tx.callContract(test.url, blockHashRegAddress, 'recreateBlockheaders(uint,bytes[])', [blockNumber, blockheaderArray], { privateKey: pk1, to: blockHashRegAddress, value: 0, confirm: true, gas: 8000000 })

                const blockResult = await test.getFromServer('eth_getBlockByHash', targetBlock, false) as BlockData
                const blockHashAfter = "0x" + (await tx.callContract(test.url, blockHashRegAddress, 'blockhashMapping(uint256):(bytes32)', [blockNumber - j]))[0].toString('hex')

                const blockByNumber = await test.getFromServer('eth_getBlockByNumber', toHex(blockNumber - j), false)

                assert.equal(blockByNumber.hash, blockHashAfter)

                assert.equal(toNumber(blockResult.number), toNumber(result.logs[0].topics[1]))
                assert.equal(blockResult.hash, result.logs[0].topics[2])

                assert.equal(blockHashBefore, "0x0000000000000000000000000000000000000000000000000000000000000000")
                assert.equal(blockHashAfter, blockResult.hash)

                assert.equal((blockNumber - toNumber(blockResult.number)), j)

                // console.log(result)
                console.log(`used ${toNumber(result.gasUsed)} gas for recreating ${j} blockheaders`)

                blockheaderArray = []
            }
        }).timeout(90000)

    }


})