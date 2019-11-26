/*******************************************************************************
 * This file is part of the Incubed project.
 * Sources: https://github.com/slockit/in3-server
 * 
 * Copyright (C) 2018-2019 slock.it GmbH, Blockchains LLC
 * 
 * 
 * COMMERCIAL LICENSE USAGE
 * 
 * Licensees holding a valid commercial license may use this file in accordance 
 * with the commercial license agreement provided with the Software or, alternatively, 
 * in accordance with the terms contained in a written agreement between you and 
 * slock.it GmbH/Blockchains LLC. For licensing terms and conditions or further 
 * information please contact slock.it at in3@slock.it.
 * 	
 * Alternatively, this file may be used under the AGPL license as follows:
 *    
 * AGPL LICENSE USAGE
 * 
 * This program is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software 
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY 
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A 
 * PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 * [Permissions of this strong copyleft license are conditioned on making available 
 * complete source code of licensed works and modifications, which include larger 
 * works using a licensed work, under the same license. Copyright and license notices 
 * must be preserved. Contributors provide an express grant of patent rights.]
 * You should have received a copy of the GNU Affero General Public License along 
 * with this program. If not, see <https://www.gnu.org/licenses/>.
 *******************************************************************************/


import { assert } from 'chai'
import 'mocha'
import { util, BlockData, serialize } from 'in3-common'
import { Signature, RPCRequest, RPCResponse } from '../../src/types/types'
import { encodeObject } from '../../src/util/binjson'


describe('useBinary', () => {

    it('simple Object', () => {
        assert.equal(encodeObject({ a: 1 }).toString('hex'), 'c2610061a1')
        assert.equal(encodeObject({ a: 1, abcdef: true }).toString('hex'), 'c3620061a1f38781')
    })
    it('simple Array', () => {
        assert.equal(encodeObject([]).toString('hex'), 'c140')
        assert.equal(encodeObject(['123', '0x123', 1, true]).toString('hex'), 'c5442331323300bd0123a181')
    })
    it('simple integer', () => {
        assert.equal(encodeObject(0xffffff).toString('hex'), 'c1beffffff')
        assert.equal(encodeObject(0xffffffff).toString('hex'), 'c104ffffffff')
        assert.equal(encodeObject(0x1).toString('hex'), 'c1a1')
    })
    it('complex json', () => {
        const hexData = encodeObject({ "jsonrpc": "2.0", "result": { "blockHash": "0x2dbbac3abe47a1d0a7843d378fe3b8701ca7892f530fd1d2b13a46b202af4297", "blockNumber": "0x79fab6", "chainId": "0x1", "condition": null, "creates": null, "from": "0x2c5811cb45ba9387f2e7c227193ad10014960bfc", "gas": "0x186a0", "gasPrice": "0x4a817c800", "hash": "0xf84cfb78971ebd940d7e4375b077244e93db2c3f88443bb93c561812cfed055c", "input": "0xa9059cbb000000000000000000000000290648fc6f2cb27a2a81dc35a429090872991b92000000000000000000000000000000000000000000000015af1d78b58c400000", "nonce": "0xa8", "publicKey": "0x6b30c392dda89d58866bf2c1bedf8229d12c6ae3589d82d0f52ae588838a475aacda64775b7a1b376935d732bb8022630a01c4926e71171eeda938b644d83365", "r": "0x4666976b528fc7802edd9330b935c7d48fce0144ce97ade8236da29878c1aa96", "raw": "0xf8ab81a88504a817c800830186a094d3ebdaea9aeac98de723f640bce4aa07e2e4419280b844a9059cbb000000000000000000000000290648fc6f2cb27a2a81dc35a429090872991b92000000000000000000000000000000000000000000000015af1d78b58c40000025a04666976b528fc7802edd9330b935c7d48fce0144ce97ade8236da29878c1aa96a05089dca7ecf7b061bec3cca7726aab1fcb4c8beb51517886f91c9b0ca710b09d", "s": "0x5089dca7ecf7b061bec3cca7726aab1fcb4c8beb51517886f91c9b0ca710b09d", "standardV": "0x0", "to": "0xd3ebdaea9aeac98de723f640bce4aa07e2e44192", "transactionIndex": "0x3e", "v": "0x25", "value": ":13" }, "id": 2, "in3": { "lastValidatorChange": 0, "execTime": 2117, "rpcTime": 2117, "rpcCount": 1, "currentBlock": 1, "lastNodeList": 8026154 } }).toString('hex')
        assert.equal(hexData, 'dc1f64b6f923322e3000b689749a5b1c202dbbac3abe47a1d0a7843d378fe3b8701ca7892f530fd1d2b13a46b202af429764cabe79fab62440a10873c0bb77c00496142c5811cb45ba9387f2e7c227193ad10014960bfcf0f5be0186a042b80504a817c8004d921c20f84cfb78971ebd940d7e4375b077244e93db2c3f88443bb93c561812cfed055c8df61c44a9059cbb000000000000000000000000290648fc6f2cb27a2a81dc35a429090872991b92000000000000000000000000000000000000000000000015af1d78b58c4000004669bca8cfd61c406b30c392dda89d58866bf2c1bedf8229d12c6ae3589d82d0f52ae588838a475aacda64775b7a1b376935d732bb8022630a01c4926e71171eeda938b644d8336500721c204666976b528fc7802edd9330b935c7d48fce0144ce97ade8236da29878c1aa96b0e41cadf8ab81a88504a817c800830186a094d3ebdaea9aeac98de723f640bce4aa07e2e4419280b844a9059cbb000000000000000000000000290648fc6f2cb27a2a81dc35a429090872991b92000000000000000000000000000000000000000000000015af1d78b58c40000025a04666976b528fc7802edd9330b935c7d48fce0144ce97ade8236da29878c1aa96a05089dca7ecf7b061bec3cca7726aab1fcb4c8beb51517886f91c9b0ca710b09d00731c205089dca7ecf7b061bec3cca7726aab1fcb4c8beb51517886f91c9b0ca710b09d8fcda03a1b14d3ebdaea9aeac98de723f640bce4aa07e2e4419204babc3e0076bc254a6b233a313300348da27734666b72a01caebd0845e4d4bd08450822a187a0a14508be7a782a')
    })
})
