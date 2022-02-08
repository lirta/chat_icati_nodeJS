module.exports = function (io, db, util, fs, baseurl) {
    io.on('connection', function (userSocket) {

        console.log("connected to message");

        chatRoomID = userSocket.handshake.query.chatRoomID
        personID = userSocket.handshake.query.personID
        userSocket.join(chatRoomID)
        userSocket.join(personID)
        console.log("Chat Room ID ", chatRoomID)
        console.log("person ID ", personID)


        userSocket.on('disconnect', () => {
            userSocket.leave(chatRoomID)
        })


        // DELETE MESSAGE
        userSocket.on("delete_message_req", (data) => {
            console.log("delete_message_req data ", data);

            db.query("DELETE FROM member_chat WHERE mChatId = ? ", [data['mChatId']], async function (error, result) {
                if (!error) {

                    await deleteFile(data['mChatId']);

                    io.in(data['mChatRoomId']).emit("delete_message_res", { "mChatId": data['mChatId'], "mChatRoomId": data['mChatRoomId'] })

                } else {
                    var fail = { status: false, errorMessage: 'Gagal menghapus data' };
                    userSocket.broadcast.emit("fail", fail)
                }
            });

            function deleteFile(chatId, roomId) {
                return new Promise(resolve => {
                    db.query("DELETE FROM member_chat_file WHERE mChatId = ? ", [chatId], function (error, result) {
                        if (!error) {
                            var data = Object.values(JSON.parse(JSON.stringify(result)))
                            resolve();
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }
        })


        //SEND MESSAGE
        userSocket.on("send_msg", async (data) => {
            console.log("send_msg", data);

            const mid = [];
            var mChatRoomId = data['mChatRoomId']
            mid.push(data['mSenderId']);
            mid.push(data['mRecipientId']);

            let chId = await insertChatHistory(data);

            let latestdata = await getlatestdata(chId, mid);

            console.log("receive_msg", latestdata);
            var success = { status: true, mChatRoomId: mChatRoomId, message: [latestdata] };
            io.in(mChatRoomId).in(data['mRecipientId']).emit("receive_msg", success)

            function insertChatHistory(data) {
                return new Promise(resolve => {
                    console.log("sender ", data['mSenderId']);
                    console.log("recipient ", data['mRecipientId']);

                    var newdata = { mChatParentId: data['mChatParentId'], mSenderId: data['mSenderId'], mRecipientId: data['mRecipientId'], mChatData: data['mChatData'], mChatType: data['mChatType'], mChatColor: data['mChatColor'], mChatRead: 'n', mChatTimestamp: Math.floor(Date.now() / 1000) };
                    db.query("INSERT INTO member_chat SET ? ", newdata, function (error, result) {
                        if (!error) {

                            console.log("member_chat inserted", result.insertId);
                            resolve(result.insertId);
                        } else {
                            console.log(error);
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

            // function insertMemberChat(mid, chId){
            //     return new Promise (resolve => {
            //         console.log("id rel ", mid);
            //         console.log("chat id ", chId);
            //         for(var i = 0; i < mid.length; i++) {
            //             console.log("index ", i);
            //             var newdata = {mId: mid[i], mChatId: chId};
            //             db.query("INSERT INTO member_chat_rel SET ? ", newdata, function (error, result) {
            //                 if (!error) {
            //                     console.log("member chat inserted", result.insertId);
            //                     resolve(result.insertId);
            //                 } else {
            //                     var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
            //                     userSocket.broadcast.emit("fail", fail)
            //                 }
            //             });
            //         }
            //     });
            // }

            function getlatestdata(chId, mid) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat WHERE mChatId = ? AND mSenderId IN (?) AND mRecipientId IN (?)", [chId, mid, mid], async function (error, result) {
                        if (!error) {
                            var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
                            let sendata = await getMemberData(lastmsg[0]['mSenderId']);
                            if (lastmsg[0]['mChatParentId'] !== 0) {
                                var dataparent = await getdataparent(lastmsg[0]['mChatParentId']);
                            }
                            const data = {
                                "mChatId": lastmsg[0]['mChatId'],
                                "mChatParentId": lastmsg[0]['mChatParentId'],
                                "mName": sendata[0]['mName'],
                                "mSenderId": lastmsg[0]['mSenderId'],
                                "mRecipientId": lastmsg[0]['mRecipientId'],
                                "mChatData": lastmsg[0]['mChatData'],
                                "mChatType": lastmsg[0]['mChatType'],
                                "mChatTimestamp": lastmsg[0]['mChatTimestamp'],
                                "mChatColor": lastmsg[0]['mChatColor'],
                                "parentData": dataparent,
                                "file": [],
                            }
                            console.log("latest message", data);
                            resolve(data);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

            function getdataparent(chatParentId) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat as a join member as b ON a.mSenderId=b.mId WHERE mChatId = ?", [chatParentId], function (error, messages) {
                        if (!error) {
                            var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
                            var datap = [];
                            for (var i = 0; i < dataparent.length; i++) {
                                const data = {
                                    "mChatId": dataparent[i]['mChatId'],
                                    "mSenderId": dataparent[i]['mSenderId'],
                                    "mName": dataparent[i]['mName'],
                                    "mChatData": dataparent[i]['mChatData'],
                                    "mChatType": dataparent[i]['mChatType'],
                                    "mChatTimestamp": dataparent[i]['mChatTimestamp'],
                                    "mChatColor": dataparent[i]['mChatColor'],
                                    "mPic": dataparent[i]['urlSource'] + dataparent[i]['mDir'] + "/" + dataparent[i]['mPic'],
                                }
                                datap.push(data);
                            }
                            console.log("data parent ", datap);
                            resolve(datap);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("error", fail)
                        }
                    });
                });
            }

            function getMemberData(mid) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member WHERE mId = ? ", [mid], function (error, result) {
                        if (!error) {
                            var sendata = Object.values(JSON.parse(JSON.stringify(result)))
                            resolve(sendata);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("error", fail)
                        }
                    });
                });
            }

            // function sendPushNotif(ldata, recdata){
            //     return new Promise(resolve => {

            //         var sendNotification = function(data) {
            //             var headers = {
            //               "Content-Type": "application/json; charset=utf-8"
            //             };

            //             var options = {
            //               host: "onesignal.com",
            //               port: 443,
            //               path: "/api/v1/notifications",
            //               method: "POST",
            //               headers: headers
            //             };

            //             var https = require('https');
            //             var req = https.request(options, function(res) {  
            //               res.on('data', function(data) {
            //                 console.log("Response:");
            //                 console.log(JSON.parse(data));
            //               });
            //             });

            //             req.on('error', function(e) {
            //               console.log("ERROR:");
            //               console.log(e);
            //             });

            //             req.write(JSON.stringify(data));
            //             req.end();
            //         };

            //         var message = { 
            //             app_id: "c96cbf2d-7559-4b27-9288-88a751e04f45",
            //             contents: {"en": ldata['chatData']},
            //             headings: {"en": ldata['senderName']},
            //             include_player_ids: [recdata[0]['mPlayerId']]
            //         };
            //         console.log("rec name ", ldata['senderName']);
            //         sendNotification(message);
            //         resolve();
            //     });
            // }

        })

        //UPDATE CHAT READ 
        userSocket.on("chat_read_req", (data) => {
            console.log("chat_read_req data ", data);

            const ids = [];
            ids.push(data['mSenderId']);
            ids.push(data['mRecipientId']);

            db.query("UPDATE member_chat SET mChatRead = ? WHERE mChatId = ? ", ['y', data['mChatId']], async function (error, messages) {
                if (!error) {

                    let latestdata = await getlatestdata(ids);

                    console.log("chat_read_response", latestdata);
                    var success = { status: true, mChatRoomId: data['mChatRoomId'], message: [latestdata] };
                    io.in(data['mChatRoomId']).emit("chat_read_res", success)

                } else {
                    var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                    userSocket.emit("error", fail)
                }
            });

            function getlatestdata(ids) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat WHERE mSenderId IN (?) AND mRecipientId IN (?) ORDER BY DESC LIMIT 1", [ids, ids], async function (error, result) {
                        if (!error) {
                            var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
                            let sendata = await getMemberData(lastmsg[0]['mSenderId']);
                            if (lastmsg[0]['mChatParentId'] !== 0) {
                                dataparent = await getdataparent(lastmsg[0]['mChatParentId']);
                            }
                            const data = {
                                "mChatId": lastmsg[0]['mChatId'],
                                "mChatParentId": lastmsg[0]['mChatParentId'],
                                "mName": sendata[0]['mName'],
                                "mSenderId": lastmsg[0]['mSenderId'],
                                "mRecipientId": lastmsg[0]['mRecipientId'],
                                "mChatData": lastmsg[0]['mChatData'],
                                "mChatType": lastmsg[0]['mChatType'],
                                "mChatTimestamp": lastmsg[0]['mChatTimestamp'],
                                "mChatColor": lastmsg[0]['mChatColor'],
                                "parentData": dataparent,
                                "file": [],
                            }
                            console.log("latest message", data);
                            resolve(data);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

            function getMemberData(mid) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member WHERE mId = ? ", [mid], function (error, result) {
                        if (!error) {
                            var sendata = Object.values(JSON.parse(JSON.stringify(result)))
                            resolve(sendata);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("error", fail)
                        }
                    });
                });
            }

            function getdataparent(chatParentId) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat as a join member as b ON a.mSenderId=b.mId WHERE mChatId = ?", [chatParentId], function (error, messages) {
                        if (!error) {
                            var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
                            var datap = [];
                            for (var i = 0; i < dataparent.length; i++) {
                                const data = {
                                    "mChatId": dataparent[i]['mChatId'],
                                    "mSenderId": dataparent[i]['senderId'],
                                    "mName": dataparent[i]['mName'],
                                    "mChatData": dataparent[i]['mChatData'],
                                    "mChatType": dataparent[i]['mChatType'],
                                    "mChatTimestamp": dataparent[i]['mChatTimestamp'],
                                    "mChatColor": dataparent[i]['mChatColor'],
                                    "mPic": dataparent[i]['urlSource'] + dataparent[i]['mDir'] + "/" + dataparent[i]['mPic'],
                                }
                                datap.push(data);
                            }
                            console.log("data parent ", datap);
                            resolve(datap);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("error", fail)
                        }
                    });
                });
            }
        })

        //UPDATE MESSAGE
        userSocket.on("update_msg_req", (data) => {
            console.log("update_msg_req data ", data);

            var id = data['mChatId'].toString();
            var chat = data['mChatData'].toString();
            var room = data['mChatRoomId'].toString();

            db.query("UPDATE member_chat SET mChatData = ? WHERE mChatId = ? ", [chat, id], async function (error, result) {

                if (!error) {

                    let updated = await getUpdatedData(id, room);
                    var success = { status: true, mChatRoomId: room, message: updated };

                    io.in(room).emit("update_msg_res", success)

                    console.log("update_msg_res", success);
                } else {
                    var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                    userSocket.broadcast.emit("fail", fail)
                }
            });

            function getUpdatedData(id, room) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat WHERE mChatId = ? ", [id], function (error, result) {
                        if (!error) {
                            var data = Object.values(JSON.parse(JSON.stringify(result)))
                            resolve(data);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }
        })

        //UPLOAD FILE PSMTI
        userSocket.on("mupload_req", (data) => {
            // console.log("upload_request data ", data);

            var chatParentId = data['mChatParentId'];
            var senderId = data['mSenderId'];
            var recipientId = data['mRecipientId'];
            var roomId = data['mChatRoomId'];
            var chatData = data['mChatData'];
            var chatType = data['mChatType'];
            var chatFileType = data['mChatFileType'];
            var chatRead = 'n';
            var chatTimestamp = Math.floor(Date.now() / 1000);
            var chatColor = data['mChatColor'];
            var chatFile = JSON.parse(data['mChatFile'])
            var chatFilename = JSON.parse(data['mChatFileName'])

            console.log("file ", chatFile);
            console.log("name ", chatFilename);

            var newdata = { mChatParentId: chatParentId, mSenderId: senderId, mRecipientId: recipientId, mChatData: chatData, mChatType: chatType, mChatRead: chatRead, mChatTimestamp: chatTimestamp, mChatColor: chatColor };
            db.query("INSERT INTO member_chat SET ? ", [newdata], async function (error, result) {
                if (!error) {

                    var currentdate = new Date();
                    var newdir = currentdate.getDate() + "" + (currentdate.getMonth() + 1) + "" + currentdate.getFullYear();
                    console.log("dir time ", newdir);
                    mid = [];
                    mid.push(data['mSenderId']);
                    mid.push(data['mRecipientId']);

                    if (!fs.existsSync('./upload/' + newdir)) {
                        fs.mkdirSync('./upload/' + newdir);
                    }

                    for (var i = 0; i < chatFile.length; i++) {
                        await uploadFile(result.insertId, chatFile[i], chatFilename[i], newdir);
                    }

                    let lastData = await getLastData(result.insertId, mid);

                    console.log("upload_receive ");
                    console.log(util.inspect(lastData, { showHidden: false, depth: null, colors: true }))

                    var success = { status: true, mChatRoomId: roomId, message: [lastData] };

                    io.in(roomId).emit("mupload_res", success)

                } else {
                    console.log("fail upload ", error);
                    var fail = { status: false, errorMessage: 'Gagal menyimpan data' };
                    userSocket.broadcast.emit("fail", fail)
                }
            });

            // function insertMemberChat(mid, chId){
            //     return new Promise (resolve => {
            //         console.log("id rel ", mid);
            //         console.log("chat id ", chId);
            //         for(var i = 0; i < mid.length; i++) {
            //             console.log("index ", i);
            //             var newdata = {mId: mid[i], mChatId: chId};
            //             db.query("INSERT INTO member_chat_rel SET ? ", newdata, function (error, result) {
            //                 if (!error) {
            //                     console.log("member chat inserted", result.insertId);
            //                     resolve(result.insertId);
            //                 } else {
            //                     var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
            //                     userSocket.broadcast.emit("fail", fail)
            //                 }
            //             });
            //         }
            //     });
            // }

            function getLastData(chId, mid) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat WHERE mChatId = ? AND mSenderId IN (?) AND mRecipientId IN (?)", [chId, mid, mid], async function (error, result) {
                        if (!error) {
                            var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
                            console.log("senddata ", lastmsg);
                            let sendata = await getMemberData(lastmsg[0]['mSenderId']);
                            let dataparent;
                            if (lastmsg[0]['mChatParentId'] !== 0) {
                                dataparent = await getdataparent(lastmsg[0]['mChatParentId']);
                            }
                            let datafile = await getFile(chId);
                            const data = {
                                "mChatId": lastmsg[0]['mChatId'],
                                "mChatParentId": lastmsg[0]['mChatParentId'],
                                "mName": sendata[0]['mName'],
                                "mSenderId": lastmsg[0]['mSenderId'],
                                "mRecipientId": lastmsg[0]['mRecipientId'],
                                "mChatData": lastmsg[0]['mChatData'],
                                "mChatType": lastmsg[0]['mChatType'],
                                "mChatTimestamp": lastmsg[0]['mChatTimestamp'],
                                "mChatColor": lastmsg[0]['mChatColor'],
                                "parentData": dataparent,
                                "file": datafile,
                            }
                            console.log("latest message", data);
                            resolve(data);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

            function getdataparent(chatParentId) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member_chat as a join member as b ON a.mSenderId=b.mId WHERE mChatId = ?", [chatParentId], function (error, messages) {
                        if (!error) {
                            var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
                            var datap = [];
                            for (var i = 0; i < dataparent.length; i++) {
                                const data = {
                                    "mChatId": dataparent[i]['mChatId'],
                                    "mSenderId": dataparent[i]['senderId'],
                                    "mName": dataparent[i]['mName'],
                                    "mChatData": dataparent[i]['mChatData'],
                                    "mChatType": dataparent[i]['mChatType'],
                                    "mChatTimestamp": dataparent[i]['mChatTimestamp'],
                                    "mChatColor": dataparent[i]['mChatColor'],
                                    "mPic": dataparent[i]['urlSource'] + dataparent[i]['mDir'] + "/" + dataparent[i]['mPic'],
                                }
                                datap.push(data);
                            }
                            console.log("data parent ", datap);
                            resolve(datap);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("error", fail)
                        }
                    });
                });
            }

            function uploadFile(chatId, chatFile, chatFilename, newdir) {
                return new Promise(resolve => {

                    var realFile = Buffer.from(chatFile, "base64");

                    fs.writeFileSync('./upload/' + newdir + '/' + chatFilename, realFile, "utf8")
                    console.log("uploaded " + chatFilename)

                    var newdata = { mChatId: chatId, mChatFileDir: newdir, mChatFileName: chatFilename, mChatFileType: chatFileType };
                    db.query("INSERT INTO member_chat_file SET ? ", [newdata], function (error, result) {
                        if (!error) {
                            console.log("file " + chatId, result.insertId);
                            resolve();
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal menyimpan file' };
                            userSocket.broadcast.emit("fail", fail)
                        }
                    });
                });
            }

            function getMemberData(mid) {
                return new Promise(resolve => {
                    db.query("SELECT * FROM member WHERE mId = ? ", [mid], function (error, result) {
                        if (!error) {
                            var sendata = Object.values(JSON.parse(JSON.stringify(result)))
                            resolve(sendata);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

            function getFile(chatId) {
                return new Promise(resolve => {
                    var query = "SELECT * FROM member_chat_file WHERE mChatId = ? ";
                    db.query(query, [chatId], function (error, result) {
                        if (!error) {
                            var datafile = Object.values(JSON.parse(JSON.stringify(result)))
                            var file = [];
                            for (var i = 0; i < datafile.length; i++) {
                                const data = {
                                    "mChatFileId": datafile[i]['mChatFileId'],
                                    "mChatId": datafile[i]['mChatId'],
                                    "mChatFileType": datafile[i]['mChatFileType'],
                                    "mChatFileDir": datafile[i]['mChatFileDir'],
                                    "mChatFileName": datafile[i]['mChatFileName'],
                                    //"fileUrl": "http://phpstack-91227-2158059.cloudwaysapps.com:3000/upload/"+datafile[i]['chatFileDir']+"/"+datafile[i]['chatFileName'],
                                    "mFileUrl": "http://" + baseurl + "/upload/" + datafile[i]['mChatFileDir'] + "/" + datafile[i]['mChatFileName'],
                                }
                                file.push(data);
                            }
                            console.log("file ", file);
                            resolve(file);
                        } else {
                            var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                            userSocket.emit("fail", fail)
                        }
                    });
                });
            }

        })

    });
}