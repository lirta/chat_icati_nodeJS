var path = require('path');
const fs = require('fs-extra');
const express = require('express');
const app = express().use(express.static(__dirname));
const http = require('http').createServer(app)
const mysql = require('mysql');
const io = require('socket.io')(http)
const util = require('util')
//participants = [];

app.get('/', (req, res) => {
    res.send("ICATI NODE JS")
});

//MySQL npm install socket.io mysql
var db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'icati',
    charset: 'utf8mb4',
});

// Log any errors connected to the db
db.getConnection(function (err) {
    if (err) console.log("db err :" + err);
    else console.log('db connected');
});

var baseurl = "192.168.1.36:3000";

require('./chatlist.js')(io, db, baseurl);
require('./chatroom.js')(io, db, util, baseurl);
require('./sendmessage.js')(io, db, util, fs, baseurl);
require('./m_chatlist.js')(io, db, util, fs, baseurl);
require('./m_chatroom.js')(io, db, util, fs, baseurl);
require('./m_message.js')(io, db, util, fs, baseurl);

var server_port = process.env.PORT || 3000;
http.listen(server_port, () => console.log("server is listening on port 3000"));