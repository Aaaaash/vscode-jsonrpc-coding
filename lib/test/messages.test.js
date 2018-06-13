/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var stream_1 = require("stream");
var util_1 = require("util");
var messageWriter_1 = require("../messageWriter");
var messageReader_1 = require("../messageReader");
var TestWritable = function () {
    function TestWritable() {
        stream_1.Writable.call(this);
        this.data = '';
    }
    util_1.inherits(TestWritable, stream_1.Writable);
    TestWritable.prototype._write = function (chunk, _encoding, done) {
        this.data += chunk.toString();
        done();
    };
    return TestWritable;
}();
describe('Messages', function () {
    var data = 'Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}';
    it('Writing', function () {
        var writable = new TestWritable();
        var writer = new messageWriter_1.StreamMessageWriter(writable, 'ascii');
        var request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'example'
        };
        writer.write(request);
        writable.end();
        assert.equal(writable.data, data);
    });
    it('Reading', function (done) {
        var readable = new stream_1.Readable();
        new messageReader_1.StreamMessageReader(readable).listen(function (message) {
            assert.equal(message.id, 1);
            assert.equal(message.method, 'example');
            done();
        });
        readable.push(data);
        readable.push(null);
    });
    it('Read partial', function (done) {
        var readable = new stream_1.Readable();
        var reader = new messageReader_1.StreamMessageReader(readable);
        reader.partialMessageTimeout = 100;
        var partOne = 'Content-Length: 43\r\n\r\n';
        var partTwo = '{"jsonrpc":"2.0","id":1,"method":"example"}';
        reader.listen(function (message) {
            assert.equal(message.id, 1);
            assert.equal(message.method, 'example');
            setTimeout(function () {
                done();
            }, 200);
        });
        reader.onPartialMessage(function (_info) {
            setTimeout(function () {
                readable.push(partTwo);
                readable.push(null);
            }, 20);
        });
        readable.push(partOne);
    });
});
