#!/usr/bin/env node

'use strict';

const fs = require("fs");
const url = require("url");
const mqtt = require("mqtt");
const http = require("http");
const https = require("https");
//const mosca = require("mosca");
const crypt = require("crypto");
//const sql = require("sql.js");
//const mongo = require("mongodb");
const sqlite = require("sqlite3");
//const express = require("express");
const session = require("node-session");

//const cdata = require("/root/mqtt/example.json");
const NR_CLIENTS = 64;

const _target = {
	"secret": "this is a real good secret",
	"users": "user",
	"table": "data",
	"host": "n0pe.me",
	"port": 1883,
};

String.prototype.splice = (function(key, count) {
	let result = [];
	let splitted = this.split(key);
	for(let i=0; i<count && i<splitted.length; i++) {
		result.push(splitted.shift());
		continue;
	}
	result.push(splitted.join(key));
	return result;
});

Array.prototype.includes = (function(key) {
	for(let i=0; i<this.length; i++) {
		if(key === this[i]) {
			return true;
		}
		continue;
	}
	return false;
});

function sync(args) {
	console.log("[ ok ] sync complete");
	return;
};

function rand() {
	return {
		"id": "0"+parseInt(Math.random()*90+10) + "/0" + parseInt(Math.random()*90+10),
		"data": {
			"DV":parseInt(999*Math.random()),
			"DA":parseInt(90*Math.random()),
			"DW":parseInt(63500*Math.random()),
			"AV":parseInt(390*Math.random()),
			"AA":parseInt(80*Math.random()),
			"AW":parseInt(59000*Math.random()),
			"G":parseInt(47500*Math.random()),
			"GG":parseInt(46000*Math.random()),
			"GH":parseInt(300000*Math.random()),
			"GA":parseInt(1430000*Math.random()),
			"GY":parseInt(17270000*Math.random()),
			"SS":parseInt(85*Math.random()),
			"SC":parseInt(65*Math.random()),
			"SA":parseInt(35*Math.random()),
			"ST":parseInt(1499*Math.random())
		}
	};
};

function sine() {
	return {
		"id": "000/000",
		"data": {
			"DV": Date.now() % 12000,
			"DA": Date.now() % 14000,
			"DW": Date.now() % 16000,
			"AV": Date.now() % 18000,
			"AA": Date.now() % 22000,
			"AW": Date.now() % 24000,
			"G": Date.now() % 128000,
			"GG": Date.now() % 26000,
			"GA": Date.now() % 28000,
			"GY": Date.now() % 32000,
			"SS": Date.now() % 34000,
			"SC": Date.now() % 36000,
			"SA": Date.now() % 38000,
			"ST": Date.now() % 42000
		}
	};
}

if(require.main === module) {
	if(process.argv.length < 1) {
		console.log("[fail] parsing cli arguments");
		return;
	}
	process.on("beforeExit", function(e) {
		console.log("[info] syncing");
		if(this.db) {
			db.close(function(err) {
				if(err) {
					console.log("[fail] syncing database:", err);
				} else {
					console.log("[ ok ] database synced");
				}
				return;
			});
		}
		sync(process.argv);
		return;
	});
	process.on("exit", function(e) {
		console.log("[ ok ] exiting...");
		return;
	});
	console.log("[info] init");
	let db = new sqlite.Database("store.db", sqlite.OPEN_READWRITE|sqlite.OPEN_CREATE, function(err) {
		if(err) {
			console.log("[fail] error opening db:", err);
		} else {
			this.db = db;
			console.log("[info] db opened...");
			db.exec("CREATE TABLE IF NOT EXISTS \"" + _target.table + "\" ("
				+ "id integer primary key,"
				+ "time integer not null,"
				+ "path text not null,"
				+ "data text not null,"
				+ "flags int"
				+ ");"
			);
			db.exec("CREATE TABLE IF NOT EXISTS \"" + _target.users + "\" ("
				+ "id integer primary key,"
				+ "time integer not null,"
				+ "name text not null unique,"
				+ "pass text not null,"
				+ "session text,"
				+ "level int"
				+ ");"
			);
			db.get("SELECT id FROM \"" + _target.users + "\" WHERE id = 0;", function(error, row) {
				if(row === undefined) {
					db.run("INSERT INTO \"" + _target.users + "\" "
					+ "VALUES (:id, :time, :name, :pass, :session, :level);", {
						":id": "0",
						":time": Date.now(),
						":name": "admin",
						":pass": crypt.createHmac("sha256", _target.secret)
							.update("adminpassword").digest("hex"),
					});
					console.log("[info] admin account created");
				}
				return;
			});
		}
		return;
	});
	/*
	let mqttBroker = mosca.Server({
		"port": 1883,
//		"persistence": true,
		"allowNonSecure": true,
		"backend": {
			"mqtt": mqtt,
			"port": 1883,
			"json": false,
			"type": "mongo", //"mqtt",
			"host": "localhost",
			"url": "mongodb://localhost:27017/mqtt",
			"pubsubCollection": "ascoltatori",
			"mongo": {},
		},
	});
	*/
	let mqttConnection = mqtt.connect("mqtt://" + _target.host + ":" + _target.port);
	mqttConnection.on("message", function(topic, message) {
		db.run("INSERT INTO \"" + _target.table + "\" "
			+ "VALUES ( null, :time, :path, :data, :flag );", {
			":time": Date.now(),
			":path": topic.toString(),
			":data": message.toString(),
			":flag": 0
		});
		return;
	});
	mqttConnection.on("connect", function() {
		console.log("[info] mqtt connected");
		mqttConnection.subscribe("#");
		return;
	});
		let sess = new session({
		"secret": _target.secret,
		"lifetime": 3600000,
		"expireOnClose": false,
		"cookie": "ns",
		"domain": null,
		"path": "/",
		"encrypt": false,
	});
	let httpServer = http.createServer(function(request, result) {
		sess.startSession(request, result, function(e) {
			db.get("SELECT * FROM \"" + _target.users + "\" WHERE session = ?;", [
				request.session.__id,
			], function(err, user) {
				result.setHeader("content-type", "application/json");
				result.setHeader("Access-Control-Allow-Origin", "*");
				result.setHeader("Access-Control-Allow-Credentials", true);
				let reqURL = url.parse(request.url, true);
				if(!user && ![ "/", "/auth", ].includes(reqURL.pathname)) {
					result.setHeader("location", "/");
					result.end(JSON.stringify({
						"result": "error",
						"message": "auth required",
					}, null, 4));
					console.log("[info] unauthorized request:", request);
					return;
				}
				//result.setHeader("refresh", "30");
				switch(reqURL.pathname.split("/")[1]) {
					case "auth":
						let body = [];
						request.on("data", function(chunk) {
							body.push(chunk);
							return;
						}).on("end", function() {
							let data = Buffer.concat(body).toString().split("\r\n");
							let form = {};
							data.forEach(function(e, i, o) {
								form[e.splice("=", 1)[0]] = e.splice("=", 1)[1];
								return;
							});
							//result.setHeader("content-type", "text/plain");
							result.writeHead(200);
							//return result.end(JSON.stringify(form, null, 4));
							if(data.length < 2) {
								result.end(null);
								return;
							}
							let pass = crypt.createHmac("sha256", _target.secret)
								.update(form.pass).digest("hex");
							db.get("SELECT * FROM \"" + _target.users + "\" WHERE name = :name;", {
								":name": form.user,
							}, function(error, row) {
								request.session.flush();
								if(row === undefined) {
									result.end(JSON.stringify({
										"result": "error",
										"message": "user not found",
									}, null, 4));
									console.log("[fail] auth id:", form.user);
								} else if(row.pass !== pass) {
									result.end(JSON.stringify({
										"result": "error",
										"message": "password did not match",
									}, null, 4));
									console.log("[fail] auth pwd:", form.user);
								} else {
									db.run("UPDATE \"" + _target.users + "\""
										+ " SET session = '" + request.session.__id + "'"
										+ " WHERE id = '" + row.id + "';");
									result.end(JSON.stringify({
										"result": true,
										"session": request.session.__id,
									}, null, 4));
									console.log("[ ok ] auth:", form.user);
								}
								return;
							});
							return;
						});
						break;
					case "flag":
						let obj = {
							"id": reqURL.query.id?reqURL.query.id:"%",
						};
						db.run("UPDATE ");
						break;
					case "self":
						result.setHeader("content-type", "text/plain");
						result.end(fs.readFileSync(process.argv[1]));
						break;
					case "find":
						// TODO: make pagination within SQL side for speed
						let params = {
							"start": parseInt(reqURL.query.start),
							"end": parseInt(reqURL.query.end),
							"count": parseInt(reqURL.query.count),
						};
						db.all("SELECT * FROM \"" + _target.table + "\" WHERE "
							+ " path LIKE :path AND "
							+ " time > :start AND "
							+ " time < :end AND "
							+ " 1=1 ORDER BY id DESC;", {
								":path": reqURL.query.path ? reqURL.query.path : "%",
								":start": params.start?params.start:Date.now() - (1000 * 60 * 60 * 24),
								":end": params.end?params.end:Date.now(),
							},
							function(error, rows) {
								if(error) {
									result.end(JSON.stringify({
										"error": error,
									}, null, 4));
									return;
								}
								let push = "";
								if(parseInt(reqURL.query.count) && reqURL.query.count < rows.length) {
									let newrows = [];
									for(let i=0; i<reqURL.query.count; i++) {
										newrows.push(rows.pop());
										continue;
									}
									push = JSON.stringify(newrows, null, 4);
								} else {
									push = JSON.stringify(rows, null, 4);
								}
								result.end(push);
								return;
							}
						);
						break;
					case 'const':
						result.end(
							JSON.stringify(
								cdata[
									parseInt(
										Math.random()*cdata.length
									)
								], null, 4
							)
						);
						break;
					case 'rand':
						result.end(JSON.stringify(rand(), null, 4));
						break;
					case 'sine':
						result.end(JSON.stringify(sine(), null, 4));
						break;
					default:
						let reqFile = (reqURL.pathname === "/")?
							("default.htm"):(reqURL.pathname.substring(1));
						if(!fs.existsSync(reqFile)) {
							result.statusCode = 404;
							result.end(JSON.stringify({
								"error": "file not found",
								"code": 404,
							}, null, 4));
							return;
						}
						result.setHeader("content-type", "text/html");
						result.end(
							/*JSON.stringify(
								{
									"type": "error",
									"message": (
										"please use one of these urls\n"
										+ "/find\n"
										+ "/rand\n"
										+ "/sine\n"
										+ "/const\n"
									)
								}, null, 4
							)*/
							fs.readFileSync(reqFile)
						);
						break;
				}
				return;
			});
		});
		return;
	});
	httpServer.on("clientError", function(error, socket) {
		if(error) {
			console.log("[fail] error:", error);
		}
		if(socket) {
			socket.end("HTTP/1.1 400 Bad Req\r\n\r\n\r\n");
		}
		return;
	});
	httpServer.listen(8000, "0.0.0.0", NR_CLIENTS, function(e) {
		console.log("[ ok ] server is listening...");
		return;
	});
	return;
}
