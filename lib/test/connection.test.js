/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var stream_1 = require("stream");
var util_1 = require("util");
var messages_1 = require("../messages");
var cancellation_1 = require("../cancellation");
var hostConnection = require("../main");
var TestDuplex = function () {
    function TestDuplex(name, dbg) {
        if (name === void 0) { name = 'ds1'; }
        if (dbg === void 0) { dbg = false; }
        stream_1.Duplex.call(this);
        this.name = name;
        this.dbg = dbg;
    }
    util_1.inherits(TestDuplex, stream_1.Duplex);
    TestDuplex.prototype._write = function (chunk, _encoding, done) {
        var _this = this;
        if (this.dbg)
            console.log(this.name + ': write: ' + chunk.toString());
        setImmediate(function () {
            _this.emit('data', chunk);
        });
        done();
    };
    TestDuplex.prototype._read = function (_size) {
    };
    return TestDuplex;
}();
describe('Connection', function () {
    it('Test Duplex Stream', function (done) {
        var stream = new TestDuplex('ds1');
        stream.on('data', function (chunk) {
            assert.strictEqual('Hello World', chunk.toString());
            done();
        });
        stream.write('Hello World');
    });
    it('Test Duplex Stream Connection', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var connection = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        connection.listen();
        var counter = 0;
        var content = "";
        duplexStream2.on('data', function (chunk) {
            content += chunk.toString();
            if (++counter === 2) {
                assert.strictEqual(content.indexOf("Content-Length: 75"), 0);
                done();
            }
        });
        connection.sendRequest(type, 'foo');
    });
    it('Handle Single Request', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, _token) {
            assert.strictEqual(p1, 'foo');
            return p1;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 'foo').then(function (result) {
            assert.strictEqual(result, 'foo');
            done();
        });
    });
    it('Handle Multiple Requests', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, _token) {
            return p1;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        var promises = [];
        promises.push(client.sendRequest(type, 'foo'));
        promises.push(client.sendRequest(type, 'bar'));
        Promise.all(promises).then(function (values) {
            assert.strictEqual(values.length, 2);
            assert.strictEqual(values[0], 'foo');
            assert.strictEqual(values[1], 'bar');
            done();
        });
    });
    it('Unhandled Request', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 'foo').then(function (_result) {
        }, function (error) {
            assert.strictEqual(error.code, messages_1.ErrorCodes.MethodNotFound);
            done();
        });
    });
    it('Receives undefined param as null', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (param) {
            assert.strictEqual(param, null);
            return '';
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, undefined).then(function (_result) {
            done();
        });
    });
    it('Receives null as null', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (param) {
            assert.strictEqual(param, null);
            return null;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, null).then(function (result) {
            assert.deepEqual(result, null);
            done();
        });
    });
    it('Receives 0 as 0', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (param) {
            assert.strictEqual(param, 0);
            return 0;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 0).then(function (result) {
            assert.deepEqual(result, 0);
            done();
        });
    });
    var testNotification = new messages_1.NotificationType("testNotification");
    it('Send and Receive Notification', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onNotification(testNotification, function (param) {
            assert.strictEqual(param.value, true);
            done();
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendNotification(testNotification, { value: true });
    });
    it('Unhandled notification event', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onUnhandledNotification(function (message) {
            assert.strictEqual(message.method, testNotification.method);
            done();
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendNotification(testNotification, { value: true });
    });
    it('Dispose connection', function (done) {
        var type = new messages_1.RequestType('test/handleSingleRequest');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (_param) {
            client.dispose();
            return '';
        });
        server.listen();
        client.listen();
        client.sendRequest(type, '').then(function (_result) {
            assert(false);
        }, function () {
            done();
        });
    });
    it('Disposed connection throws', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.dispose();
        try {
            client.sendNotification(testNotification);
            assert(false);
        }
        catch (error) {
            done();
        }
    });
    it('Two listen throw', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        try {
            client.listen();
            assert(false);
        }
        catch (error) {
            done();
        }
    });
    it('Notify on connection dispose', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.onDispose(function () {
            done();
        });
        client.dispose();
    });
    it('N params in notifications', function (done) {
        var type = new messages_1.NotificationType2('test');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onNotification(type, function (p1, p2) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 'vscode');
            done();
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendNotification(type, 10, 'vscode');
    });
    it('N params in request / response', function (done) {
        var type = new messages_1.RequestType3('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, p2, p3) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 20);
            assert.strictEqual(p3, 30);
            return p1 + p2 + p3;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 10, 20, 30).then(function (result) {
            assert.strictEqual(result, 60);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('N params in request / response with token', function (done) {
        var type = new messages_1.RequestType3('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, p2, p3, _token) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 20);
            assert.strictEqual(p3, 30);
            return p1 + p2 + p3;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        var token = new cancellation_1.CancellationTokenSource().token;
        client.listen();
        client.sendRequest(type, 10, 20, 30, token).then(function (result) {
            assert.strictEqual(result, 60);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('One Param as array in request', function (done) {
        var type = new messages_1.RequestType('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1) {
            assert(Array.isArray(p1));
            assert.strictEqual(p1[0], 10);
            assert.strictEqual(p1[1], 20);
            assert.strictEqual(p1[2], 30);
            return 60;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        var token = new cancellation_1.CancellationTokenSource().token;
        client.listen();
        client.sendRequest(type, [10, 20, 30], token).then(function (result) {
            assert.strictEqual(result, 60);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('One Param as array in notification', function (done) {
        var type = new messages_1.NotificationType('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onNotification(type, function (p1) {
            assert(Array.isArray(p1));
            assert.strictEqual(p1[0], 10);
            assert.strictEqual(p1[1], 20);
            assert.strictEqual(p1[2], 30);
            done();
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendNotification(type, [10, 20, 30]);
    });
    it('Untyped request / response', function (done) {
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest('test', function (p1, p2, p3, _token) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 20);
            assert.strictEqual(p3, 30);
            return p1 + p2 + p3;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        var token = new cancellation_1.CancellationTokenSource().token;
        client.listen();
        client.sendRequest('test', 10, 20, 30, token).then(function (result) {
            assert.strictEqual(result, 60);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('Cancellation token is undefined', function (done) {
        var type = new messages_1.RequestType3('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, p2, p3, _token) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 20);
            assert.strictEqual(p3, 30);
            return p1 + p2 + p3;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 10, 20, 30, undefined).then(function (result) {
            assert.strictEqual(result, 60);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('Missing params in request', function (done) {
        var type = new messages_1.RequestType3('add');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onRequest(type, function (p1, p2, p3, _token) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, 20);
            assert.strictEqual(p3, null);
            return p1 + p2;
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendRequest(type, 10, 20).then(function (result) {
            assert.strictEqual(result, 30);
            done();
        }, function () {
            assert(false);
            done();
        });
    });
    it('Missing params in notifications', function (done) {
        var type = new messages_1.NotificationType2('test');
        var duplexStream1 = new TestDuplex('ds1');
        var duplexStream2 = new TestDuplex('ds2');
        var server = hostConnection.createMessageConnection(duplexStream2, duplexStream1, hostConnection.NullLogger);
        server.onNotification(type, function (p1, p2) {
            assert.strictEqual(p1, 10);
            assert.strictEqual(p2, null);
            done();
        });
        server.listen();
        var client = hostConnection.createMessageConnection(duplexStream1, duplexStream2, hostConnection.NullLogger);
        client.listen();
        client.sendNotification(type, 10);
    });
});
