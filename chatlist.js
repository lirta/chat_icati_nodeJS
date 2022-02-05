module.exports = (io, db, baseurl) => {
    var chatRoomID;

    io.on('connection', function (socket) {
        //Get the chatID of the user and join in a room of the same chatID
        chatRoomID = socket.handshake.query.chatRoomID
        socket.join(chatRoomID);
        console.log("chat Room ID ", chatRoomID);

        //Leave the room if the user closes the socket
        socket.on('disconnect', () => {
            socket.leave(chatRoomID)
        })

        //LOGIN USER
        socket.on('login_user', function (data) {
            var sqlCheckEmail = "SELECT * FROM member WHERE mEmail = ?";

            db.query(sqlCheckEmail, data.email, async (err, user) => {
                if (err) {
                    console.log(err);
                    socket.emit('login_user', { status: false, message: 'Sorry database is error' });
                    console.log("login fail", { status: false, message: 'Sorry database is error' });
                }
                if (user.length < 1) {
                    socket.emit('login_user', { status: false, message: 'Sorry this user is not exists' });
                    console.log("login fail", { status: false, message: 'Sorry this user is not exists' });
                }
                else {
                    if (user[0].mPassword != data.password) {
                        socket.emit('login_user', { status: false, message: 'Sorry your password is wrong' });
                        console.log("login fail", { status: false, message: 'Sorry your password is wrong' });
                    } else {
                        socket.emit('login_user', { status: true, message: user });
                    }
                }
            })
        });

        //HISTORY ROOM
        socket.on('list_room_request', async (data) => {
            let myRegion = await getMyRegion(data['mId']);
            console.log("data user room", myRegion);
            socket.emit("list_room_response", myRegion);
        });
    });

    //=================Function================================//

    //Function get kabupaten and provinsi of user
    function getMyRegion(mId) {
        return new Promise(resolve => {
            var sqlMyRegion = "SELECT mId, mName, provinsiId, kabupatenId FROM `member` WHERE mId = ?";
            db.query(sqlMyRegion, mId, async function (err, dataUserRegion) {
                if (err) {
                    resolve({ status: false, message: 'Sorry database is error' });
                    console.log(err);
                } else {
                    if (dataUserRegion.length > 0) {
                        let myRoomChat = await getRoomChat(mId, dataUserRegion[0]['provinsiId'], dataUserRegion[0]['kabupatenId']);
                        resolve(myRoomChat);
                    } else {
                        resolve({ status: false, message: 'No User Found' });
                    }
                }
            });
        });
    }

    //Function get room chat by provinsi and kabupaten
    function getRoomChat(mId, provinsiId, kabupatenId) {
        return new Promise(resolve => {
            var newdata = [];

            //get data provinsi
            var sqlRoomProvinsi = "SELECT * FROM organization";
            db.query(sqlRoomProvinsi,  async function (err, dataProvinsi) {
                if (err) {
                    resolve({ status: false, message: 'Sorry database is error' });
                    console.log(err);
                } else {
                    let lastMsg = await getLastMessage("0");
                        let totalMember = await getCountRoomProvinsi("0");
                        //let unreadTotal = await getTotalUnreadMessage(mId, dataProvinsi[0]['organizationId']);
                        let unreadTotal = await getTotalUnreadMsg("0", mId);

                        
                        const dataProv = {
                            "roomId": "0",
                            "roomName": "ICATI",
                            "roomLogo":'',
                            "chatId": lastMsg.length > 0 ? lastMsg[0]['chatId'] : "",
                            "senderId": lastMsg.length > 0 ? lastMsg[0]['senderId'] : "",
                            "senderName": lastMsg.length > 0 ? lastMsg[0]['mName'] : "",
                            "senderUsername": lastMsg.length > 0 ? lastMsg[0]['mEmail'] : "",
                            "chatData": lastMsg.length > 0 ? lastMsg[0]['chatData'] : "",
                            "chatType": lastMsg.length > 0 ? lastMsg[0]['chatType'] : "",
                            "chatTimestamp": lastMsg.length > 0 ? lastMsg[0]['chatTimestamp'] : "",
                            "totalMember": totalMember[0]['total'],
                            "totalUnreadMsg": unreadTotal
                        }

                        newdata.push(dataProv);


                    if (dataProvinsi.length > 0) {

                        for(var a =0; a< dataProvinsi.length; a++){
                            
                            let lastMsg = await getLastMessage(dataProvinsi[a]['organizationId']);
                            let totalMember = await getCountRoomProvinsi(dataProvinsi[a]['organizationId']);
                            //let unreadTotal = await getTotalUnreadMessage(mId, dataProvinsi[a]['organizationId']);
                            let unreadTotal = await getTotalUnreadMsg(dataProvinsi[a]['organizationId'], mId);
                            const dataProv = {
                                "roomId": dataProvinsi[a]['organizationId'],
                                "roomName": dataProvinsi[a]['organizationName'],
                                "roomLogo":dataProvinsi[a]['organizationFile'],
                                "chatId": lastMsg.length > 0 ? lastMsg[a]['chatId'] : "",
                                "senderId": lastMsg.length > 0 ? lastMsg[a]['senderId'] : "",
                                "senderName": lastMsg.length > 0 ? lastMsg[a]['mName'] : "",
                                "senderUsername": lastMsg.length > 0 ? lastMsg[a]['mEmail'] : "",
                                "chatData": lastMsg.length > 0 ? lastMsg[a]['chatData'] : "",
                                "chatType": lastMsg.length > 0 ? lastMsg[a]['chatType'] : "",
                                "chatTimestamp": lastMsg.length > 0 ? lastMsg[a]['chatTimestamp'] : "",
                                "totalMember": totalMember[0]['total'],
                                "totalUnreadMsg": unreadTotal
                            }
                            newdata.push(dataProv);
                        }
                        
                 resolve({ status: true, message: newdata });

                        // console.log(dataProv);
                    }

                    //get data kabupaten
                    // var sqlRoomKabupaten = "SELECT * FROM kabupaten WHERE kabupatenId = ?";
                    // db.query(sqlRoomKabupaten, kabupatenId, async function (err, dataKabupaten) {
                    //     if (err) {
                    //         resolve({ status: false, message: 'Sorry database is error' });
                    //         console.log(err);
                    //     } else {
                    //         if (dataKabupaten.length > 0) {
                    //             let lastMsg = await getLastMessage(dataKabupaten[0]['kabupatenId']);
                    //             let totalMember = await getCountRoomKabupaten(dataKabupaten[0]['kabupatenId']);
                    //             //let unreadTotal = await getTotalUnreadMessage(mId, dataKabupaten[0]['kabupatenId']);
                    //             let unreadTotal = await getTotalUnreadMsg(dataKabupaten[0]['kabupatenId'], mId);
                    //             const dataKab = {
                    //                 "roomId": dataKabupaten[0]['kabupatenId'],
                    //                 "roomName": dataKabupaten[0]['kabupatenName'],
                    //                 "chatId": lastMsg.length > 0 ? lastMsg[0]['chatId'] : "",
                    //                 "senderId": lastMsg.length > 0 ? lastMsg[0]['senderId'] : "",
                    //                 "senderName": lastMsg.length > 0 ? lastMsg[0]['mName'] : "",
                    //                 "senderUsername": lastMsg.length > 0 ? lastMsg[0]['mUsername'] : "",
                    //                 "chatData": lastMsg.length > 0 ? lastMsg[0]['chatData'] : "",
                    //                 "chatType": lastMsg.length > 0 ? lastMsg[0]['chatType'] : "",
                    //                 "chatTimestamp": lastMsg.length > 0 ? lastMsg[0]['chatTimestamp'] : "",
                    //                 "totalMember": totalMember[0]['total'],
                    //                 "totalUnreadMsg": unreadTotal
                    //             }
                    //             newdata.push(dataKab);
                    //         }

                    //     }
                    // });
                }
            });
        });
    }

    function getLastMessage(roomId) {
        return new Promise(resolve => {
            var query = 'SELECT member.mEmail, member.mName, room_chat.* FROM room_chat JOIN member ON member.mId = room_chat.senderId WHERE chatId IN (SELECT MAX(chatId) FROM room_chat WHERE roomId = ?)';
            db.query(query, roomId, function (error, dataLastMsg) {
                if (error) {
                    console.log(error)
                } else {
                    resolve(dataLastMsg);
                }
            });
        });
    }

    function getCountRoomProvinsi(roomId) {
        return new Promise(resolve => {
            var query = "SELECT COUNT(mId) as total FROM member WHERE mStatus='y' AND mDeleted=0 ";
            db.query(query,  function (error, dataCount) {
                if (error) {
                    console.log(error)
                } else {
                    resolve(dataCount);
                }
            });
        });
    }

    function getCountRoomKabupaten(roomId) {
        return new Promise(resolve => {
            var query = "SELECT COUNT(mId) as total FROM member WHERE mStatus='y' AND mDeleted=0 AND kabupatenId = ?";
            db.query(query, roomId, function (error, dataCount) {
                if (error) {
                    console.log(error)
                } else {
                    resolve(dataCount);
                }
            });
        });
    }

    // //Function total unread message from group chat
    // function getTotalUnreadMessage(senderId, roomId) {
    //     return new Promise(resolve => {
    //         var query = "SELECT COUNT(chatRead) AS total FROM room_chat WHERE senderId != ? AND roomId = ? AND chatRead = 'n' ORDER BY chatTimestamp DESC";
    //         db.query(query, [senderId, roomId], function (error, result) {
    //             if (error) {
    //                 console.log(error)
    //             } else {
    //                 resolve(result[0]['total']);
    //             }
    //         });
    //     });
    // }

    //New function total unread message from group chat
    function getTotalUnreadMsg(roomId, senderId) {
        return new Promise(resolve => {
            var query = `SELECT count(chatId) as total FROM room_chat WHERE roomId = ? AND NOT JSON_CONTAINS(chatReadId, '"?"')`;
            db.query(query, [roomId, senderId], function (error, result) {
                if (error) {
                    console.log(error)
                } else {
                    resolve(result[0]['total']);
                }
            });
        });
    }
};