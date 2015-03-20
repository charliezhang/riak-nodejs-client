/*
 * Copyright 2015 Basho Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var StoreValue = require('../../lib/commands/kv/storevalue');
var RiakObject = require('../../lib/commands/kv/riakobject');
var RpbPutResp = require('../../lib/protobuf/riakprotobuf').getProtoFor('RpbPutResp');
var RpbContent = require('../../lib/protobuf/riakprotobuf').getProtoFor('RpbContent');
var RpbPair = require('../../lib/protobuf/riakprotobuf').getProtoFor('RpbPair');
var RpbErrorResp = require('../../lib/protobuf/riakprotobuf').getProtoFor('RpbErrorResp');

var assert = require('assert');

describe('StoreValue', function() {
    describe('Build', function() {
        it('should build a RpbPutReq correctly', function(done) {
            
            var value = 'this is a value';
            var riakObject = new RiakObject();
            riakObject.setUserMeta([{key: 'metaKey1', value: 'metaValue1'}]);
            riakObject.addToIndex('email_bin','roach@basho.com');
            riakObject.setContentType('application/json');
            riakObject.setValue('this is a value');
            
            var vclock = new Buffer(0);
            var storeCommand = new StoreValue.Builder()
               .withBucketType('bucket_type')
               .withBucket('bucket_name')
               .withKey('key')
               .withW(3)
               .withPw(1)
               .withDw(2)
               .withVClock(vclock)
               .withReturnHead(true)
               .withReturnBody(true)
               .withIfNotModified(true)
               .withIfNoneMatch(true)
               .withTimeout(20000)
               .withContent(riakObject)
               .withCallback(function(){})
               .build();
       
            var protobuf = storeCommand.constructPbRequest();
            
            assert.equal(protobuf.getType().toString('utf8'), 'bucket_type');
            assert.equal(protobuf.getBucket().toString('utf8'), 'bucket_name');
            assert.equal(protobuf.getKey().toString('utf8'), 'key');
            assert.equal(protobuf.getW(), 3);
            assert.equal(protobuf.getPw(), 1);
            assert.equal(protobuf.getDw(), 2);
            assert(protobuf.getVclock() !== null);
            assert.equal(protobuf.getReturnHead(), true);
            assert.equal(protobuf.getIfNotModified(), true);
            assert.equal(protobuf.getIfNoneMatch(), true);
            assert.equal(protobuf.getContent().getValue().toString('utf8'), value);
            assert.equal(protobuf.getContent().getContentType().toString('utf8'), 'application/json');
            assert(protobuf.getContent().getIndexes().length === 1);
            assert.equal(protobuf.getContent().getIndexes()[0].key.toString('utf8'), 'email_bin');
            assert.equal(protobuf.getContent().getIndexes()[0].value.toString('utf8'), 'roach@basho.com');
            assert(protobuf.getContent().getUsermeta().length === 1);
            assert.equal(protobuf.getContent().getUsermeta()[0].key.toString('utf8'), 'metaKey1');
            assert.equal(protobuf.getContent().getUsermeta()[0].value.toString('utf8'), 'metaValue1');
            assert.equal(protobuf.getTimeout(), 20000);
            done();
            
        });
        
        it('should take a RpbPutResp and call the users callback with the response', function(done) {
            
            var rpbContent = new RpbContent();
            rpbContent.setValue(new Buffer('this is a value'));
            rpbContent.setContentType(new Buffer('application/json'));
            
            var pair = new RpbPair();
            pair.setKey(new Buffer('email_bin'));
            pair.setValue(new Buffer('roach@basho.com'));
            rpbContent.indexes.push(pair);
            
            pair = new RpbPair();
            pair.setKey(new Buffer('metaKey1'));
            pair.setValue(new Buffer('metaValue1'));
            rpbContent.usermeta.push(pair);
            
            var rpbPutResp = new RpbPutResp();
            rpbPutResp.setContent(rpbContent);
            rpbPutResp.setVclock(new Buffer('1234'));
            
            var callback = function(err, response) {
                if (response) {
                    assert.equal(response.getRiakObjects().length, 1);
                    var riakObject = response.getRiakObjects()[0];
                    assert.equal(riakObject.getBucketType(), 'bucket_type');
                    assert.equal(riakObject.getBucket(), 'bucket_name');
                    assert.equal(riakObject.getKey(), 'key');
                    assert.equal(riakObject.getContentType(), 'application/json');
                    assert.equal(riakObject.hasIndexes(), true);
                    assert.equal(riakObject.getIndex('email_bin')[0], 'roach@basho.com');
                    assert.equal(riakObject.hasUserMeta(), true);
                    assert.equal(riakObject.getUserMeta()[0].key, 'metaKey1');
                    assert.equal(riakObject.getUserMeta()[0].value, 'metaValue1');
                    assert.equal(riakObject.getVClock().toString('utf8'), '1234');
                    done();
                }
            };
            
            var storeCommand = new StoreValue.Builder()
               .withBucketType('bucket_type')
               .withBucket('bucket_name')
               .withKey('key')
               .withContent('dummy')
               .withCallback(callback)
               .build();
       
            storeCommand.onSuccess(rpbPutResp);
            
        });
        
        it ('should take a RpbErrorResp and call the users callback with the error message', function(done) {
           var rpbErrorResp = new RpbErrorResp();
           rpbErrorResp.setErrmsg(new Buffer('this is an error'));
           
           var callback = function(err, response) {
               if (err) {
                   assert.equal(err,'this is an error');
                   done();
               }
           };
           
           var storeCommand = new StoreValue.Builder()
               .withBucketType('bucket_type')
               .withBucket('bucket_name')
               .withKey('key')
               .withContent('dummy')
               .withCallback(callback)
               .build();
       
            storeCommand.onRiakError(rpbErrorResp);
           
           
        });
        
    });
});
