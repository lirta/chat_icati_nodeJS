module.exports = function (io, db, util, fs, baseurl) {
  io.on('connection', function (userSocket) {

    console.log("connected to message");

    chatRoomID = userSocket.handshake.query.chatRoomID
    userSocket.join(chatRoomID)
    console.log("Chat Room ID ", chatRoomID)


    userSocket.on('disconnect', () => {
      userSocket.leave(chatRoomID)
    })

    //SEND_MESSAGE
    userSocket.on("send_message", async (data) => {
      console.log("send_message ", data);

      //let chColor = await getUserColor(data['senderId']);

      var newdata = { chatParentId: data['chatParentId'], senderId: data['senderId'], roomId: data['roomId'], chatData: data['chatData'], chatType: data['chatType'], chatReadId: '["' + data['senderId'] + '"]', chatTimestamp: Math.floor(Date.now() / 1000), chatColor: data['chatColor'] };
      db.query("INSERT INTO room_chat SET ? ", [newdata], async function (error, result) {
        if (!error) {

          let lastdata = await getlastdata(data['roomId'], result.insertId, data['chatParentId']);
          var success = { status: true, message: lastdata };
          console.log("receive_message ", success);

          if (data['roomId'] !== '26') {
            io.in(data['roomId']).emit("receive_message", success)
          } else {
            io.emit("receive_message", success)
          }
        } else {
          console.log("DB ", error);
          var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
          userSocket.broadcast.emit("error", fail)
        }
      });

      // function getUserColor(senderId){
      //   return new Promise(resolve => {
      //   db.query("SELECT * FROM member WHERE mId = ?", [senderId], function (error, result) {
      //           if (!error) {
      //             var member = Object.values(JSON.parse(JSON.stringify(result)))
      //             let mName = member[0]['mName']

      //             const initial = mName.split(" ");
      //             var firstL = initial[0][0].toString();
      //             const names = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
      //             const color = ["#337ab7","#5cb85c","#f0ad4e","#5bc0de","#d9534f","#ba78c8","#a94189","#337ab7","#5cb85c","#f0ad4e","#5bc0de","#d9534f","#ba78c8","#a94189","#337ab7","#5cb85c","#f0ad4e","#5bc0de","#d9534f","#ba78c8","#a94189","#337ab7","#5cb85c","#f0ad4e","#5bc0de","#d9534f","#ba78c8","#a94189","#f0ad4e","#337ab7","#5cb85c","#f0ad4e"];
      //             let idxName = names.indexOf(firstL);
      //             let selectedColor = color[idxName]
      //             resolve(selectedColor);

      //           } else {
      //               var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
      //               userSocket.emit("error", fail)
      //           }
      //       });
      //   });
      // }

      function getlastdata(roomId, chatId, chatParentId) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ? AND roomId = ? ", [chatId, roomId], async function (error, result) {
            if (!error) {
              var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
              var datalast = [];

              for (var i = 0; i < lastmsg.length; i++) {
                let dataparent;
                if (lastmsg[i]['chatParentId'] !== 0) {
                  dataparent = await getdataparent(chatParentId);
                }
                const data = {
                  "chatId": lastmsg[i]['chatId'],
                  "senderId": lastmsg[i]['senderId'],
                  "mName": lastmsg[i]['mName'],
                  "roomId": lastmsg[i]['roomId'],
                  "chatData": lastmsg[i]['chatData'],
                  "chatType": lastmsg[i]['chatType'],
                  "chatTimestamp": lastmsg[i]['chatTimestamp'],
                  "chatColor": lastmsg[i]['chatColor'],
                  "mPic": lastmsg[i]['urlSource'] + lastmsg[i]['mDir'] + "/" + lastmsg[i]['mPic'],
                  "parentData": dataparent,
                  "file": [],
                }
                datalast.push(data);
              }
              resolve(datalast);
            } else {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("error", fail)
            }
          });
        });
      }

      function getdataparent(chatParentId) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ?", [chatParentId], function (error, messages) {
            if (!error) {
              var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
              var datap = [];
              for (var i = 0; i < dataparent.length; i++) {
                const data = {
                  "chatId": dataparent[i]['chatId'],
                  "senderId": dataparent[i]['senderId'],
                  "mName": dataparent[i]['mName'],
                  "roomId": dataparent[i]['roomId'],
                  "chatData": dataparent[i]['chatData'],
                  "chatType": dataparent[i]['chatType'],
                  "chatTimestamp": dataparent[i]['chatTimestamp'],
                  "chatColor": dataparent[i]['chatColor'],
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



    // //READ UPDATE MESSAGE
    // userSocket.on("read_item_request", (data) => {
    //   console.log("read_item_request ", data);

    //   db.query("UPDATE room_chat SET chatRead = ? WHERE chatId = ? AND roomId = ? ", ['y', data['chatId'], data['roomId']], async function (error, result) {

    //       if (!error) {
    //           let lastdata = await getlastdata(data['roomId'],  data['chatId'])

    //           var success = {status:true, message: lastdata};
    //           console.log("read item response ", success);
    //           userSocket.emit("read_item_response", success)

    //       } else {
    //           var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
    //           userSocket.emit("error", fail)
    //       }
    //   });

    //   function getlastdata(roomId, chatId){
    //     return new Promise(resolve => {
    //     db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ? AND roomId = ? ", [chatId, roomId], function (error, result) {
    //             if (!error) {
    //               var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
    //               var datalast = [];

    //               for(var i = 0; i<lastmsg.length;i++) {
    //                   const data = {
    //                       "chatId": lastmsg[i]['chatId'],
    //                       "senderId": lastmsg[i]['senderId'],
    //                       "mName": lastmsg[i]['mName'],
    //                       "roomId": lastmsg[i]['roomId'],
    //                       "chatData": lastmsg[i]['chatData'],
    //                       "chatTimestamp": lastmsg[i]['chatTimestamp'],
    //                       "chatColor": lastmsg[i]['chatColor'],
    //                       "mPic": lastmsg[i]['urlSource']+lastmsg[i]['mDir']+"/"+lastmsg[i]['mPic'],
    //                   }
    //                   datalast.push(data);
    //               }
    //               resolve(datalast);
    //             } else {
    //                 var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
    //                 userSocket.emit("error", fail)
    //             }
    //         });
    //     });
    //   }

    // })

    //READ UPDATE MESSAGE
    userSocket.on("read_item_request", (data) => {
      console.log("read_item_request ", data);

      var query = `SELECT * FROM room_chat WHERE roomId = ? AND chatId = ? AND NOT JSON_CONTAINS(chatReadId, '"?"')`;
      db.query(query, [data['roomId'], data['chatId'], data['mId']], function (error, messages) {
        if (error) {
          var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
          userSocket.emit("error", fail)
          console.log('error', error);
        } else {
          var chatReadId = JSON.parse(messages[0]['chatReadId']);
          chatReadId.push(data['mId'].toString());
          console.log("ini readId", JSON.stringify(chatReadId));

          //update chat
          db.query("UPDATE room_chat SET chatReadId= ? WHERE roomId = ? AND chatId = ?", [JSON.stringify(chatReadId), data['roomId'], data['chatId']], async function (error, msg) {
            if (error) {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("error", fail)
              console.log("error", error);
            } else {
              let lastdata = await getlastdata(data['roomId'], data['chatId'])

              var success = { status: true, message: lastdata };
              console.log("read item response ", success);
              userSocket.emit("read_item_response", success)
            }
          });
        }
      });

      function getlastdata(roomId, chatId) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ? AND roomId = ? ", [chatId, roomId], function (error, result) {
            if (!error) {
              var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
              var datalast = [];

              for (var i = 0; i < lastmsg.length; i++) {
                const data = {
                  "chatId": lastmsg[i]['chatId'],
                  "senderId": lastmsg[i]['senderId'],
                  "mName": lastmsg[i]['mName'],
                  "roomId": lastmsg[i]['roomId'],
                  "chatData": lastmsg[i]['chatData'],
                  "chatType": lastmsg[i]['chatType'],
                  "chatTimestamp": lastmsg[i]['chatTimestamp'],
                  "chatColor": lastmsg[i]['chatColor'],
                  "mPic": lastmsg[i]['urlSource'] + lastmsg[i]['mDir'] + "/" + lastmsg[i]['mPic'],
                }
                datalast.push(data);
              }
              resolve(datalast);
            } else {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("error", fail)
            }
          });
        });
      }

    });


    //CHAT INFO 
    userSocket.on("chat_info_request", (data) => {
      console.log("chat_info_request data ", data);

      db.query("SELECT * FROM room_chat_info WHERE roomId = ? ", [data], function (error, messages) {
        if (!error) {
          var info = Object.values(JSON.parse(JSON.stringify(messages)))
          console.log("room chat info ", info);
          userSocket.emit("chat_info_response", info)
        } else {
          var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
          userSocket.emit("fail", fail)
        }
      });
    })

    //UPDATE MESSAGE
    userSocket.on("update_message_request", (data) => {
      console.log("update_message_request data ", data);

      var id = data['chatId'].toString();
      var chat = data['chatData'].toString();
      var room = data['roomId'].toString();

      db.query("UPDATE room_chat SET chatData = ? WHERE chatId = ? AND roomId = ? ", [chat, id, room], async function (error, result) {

        if (!error) {

          let updated = await getUpdatedData(id, room);

          if (room !== '26') {
            io.in(room).emit("update_message_response", updated)
          } else {
            io.emit("update_message_response", updated)
          }

          console.log("update_message_response", updated);
        } else {
          var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
          userSocket.broadcast.emit("fail", fail)
        }
      });

      function getUpdatedData(id, room) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat WHERE chatId = ? AND roomId = ?", [id, room], function (error, result) {
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

    // DELETE MESSAGE
    userSocket.on("delete_message_request", (data) => {
      console.log("delete_message_request data ", data);

      db.query("DELETE FROM room_chat WHERE chatId = ? AND roomId = ? ", [data['chatId'], data['roomId']], async function (error, result) {
        if (!error) {

          await deleteFile(data['chatId'], data['roomId']);

          if (data['roomId'] !== '26') {
            io.in(data['roomId']).emit("delete_message_response", { "chatId": data['chatId'], "roomId": data['roomId'] })
          } else {
            io.emit("delete_message_response", { "chatId": data['chatId'], "roomId": data['roomId'] })
          }
        } else {
          var fail = { status: false, errorMessage: 'Gagal menghapus data' };
          userSocket.broadcast.emit("fail", fail)
        }
      });

      function deleteFile(chatId, roomId) {
        return new Promise(resolve => {
          db.query("DELETE FROM room_chat_file WHERE chatId = ? ", [chatId], function (error, result) {
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


    //UPLOAD FILE PSMTI
    userSocket.on("upload_request", (data) => {
      // console.log("upload_request data ", data);

      var chatParentId = data['chatParentId'];
      var senderId = data['senderId'];
      var roomId = data['roomId'];
      var chatData = data['chatData'];
      var chatType = data['chatType'];
      var chatReadId = '["' + data['senderId'] + '"]';
      var chatTimestamp = Math.floor(Date.now() / 1000);
      var chatColor = data['chatColor'];
      var chatFileType = data['chatFileType'];
      var chatFile = JSON.parse(data['chatFile'])
      var chatFilename = JSON.parse(data['chatFilename'])

      console.log("file ", chatFile);
      console.log("name ", chatFilename);

      var newdata = { chatParentId: chatParentId, senderId: senderId, roomId: roomId, chatData: chatData, chatType: chatType, chatReadId: chatReadId, chatTimestamp: chatTimestamp, chatColor: chatColor };
      db.query("INSERT INTO room_chat SET ? ", [newdata], async function (error, result) {
        if (!error) {

          var currentdate = new Date();
          var newdir = currentdate.getDate() + "" + (currentdate.getMonth() + 1) + "" + currentdate.getFullYear();
          console.log("dir time ", newdir);

          if (!fs.existsSync('./upload/' + newdir)) {
            fs.mkdirSync('./upload/' + newdir);
          }

          for (var i = 0; i < chatFile.length; i++) {
            await uploadFile(result.insertId, chatFile[i], chatFilename[i], newdir);
          }

          let lastData = await getLastData(result.insertId);

          console.log("upload_receive ");
          console.log(util.inspect(lastData, { showHidden: false, depth: null, colors: true }))

          var success = { status: true, message: lastData };

          if (roomId !== '26') {
            io.in(roomId).emit("upload_receive", success)
          } else {
            io.emit("upload_receive", success)
          }

        } else {
          var fail = { status: false, errorMessage: 'Gagal menyimpan data' };
          userSocket.broadcast.emit("fail", fail)
        }
      });

      function uploadFile(chatId, chatFile, chatFilename, newdir) {
        return new Promise(resolve => {

          var realFile = Buffer.from(chatFile, "base64");

          fs.writeFileSync('./upload/' + newdir + '/' + chatFilename, realFile, "utf8")
          console.log("uploaded " + chatFilename)

          var newdata = { chatId: chatId, chatFileDir: newdir, chatFileName: chatFilename, chatFileType: chatFileType };
          db.query("INSERT INTO room_chat_file SET ? ", [newdata], function (error, result) {
            if (!error) {
              console.log("file " + chatId, result.insertId);
              resolve();
            } else {
              var fail = { status: false, errorMessage: 'Gagal menyimpan file' };
              userSocket.broadcast.emit("fail", fail)
              console.log("error", error);
            }
          });
        });
      }

      function getLastData(chatId) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ? ", [chatId], async function (error, result) {
            if (!error) {
              var lastmsg = Object.values(JSON.parse(JSON.stringify(result)))
              var datalast = [];

              for (var i = 0; i < lastmsg.length; i++) {
                let dataparent, datafile;

                if (lastmsg[i]['chatParentId'] !== 0) {
                  dataparent = await getDataParent(chatParentId);
                }

                datafile = await getFile(chatId);
                const data = {
                  "chatId": lastmsg[i]['chatId'],
                  "senderId": lastmsg[i]['senderId'],
                  "mName": lastmsg[i]['mName'],
                  "roomId": lastmsg[i]['roomId'],
                  "chatData": lastmsg[i]['chatData'],
                  "chatType": lastmsg[i]['chatType'],
                  "chatTimestamp": lastmsg[i]['chatTimestamp'],
                  "chatColor": lastmsg[i]['chatColor'],
                  "mPic": lastmsg[i]['urlSource'] + lastmsg[i]['mDir'] + "/" + lastmsg[i]['mPic'],
                  "parentData": dataparent,
                  "file": datafile,
                }
                datalast.push(data);
              }
              resolve(datalast);
            } else {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("error", fail)
            }
          });
        });
      }

      function getDataParent(chatParentId) {
        return new Promise(resolve => {
          db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ?", [chatParentId], function (error, messages) {
            if (!error) {
              var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
              var datap = [];
              for (var i = 0; i < dataparent.length; i++) {
                const data = {
                  "chatId": dataparent[i]['chatId'],
                  "senderId": dataparent[i]['senderId'],
                  "mName": dataparent[i]['mName'],
                  "roomId": dataparent[i]['roomId'],
                  "chatData": dataparent[i]['chatData'],
                  "chatType": dataparent[i]['chatType'],
                  "chatTimestamp": dataparent[i]['chatTimestamp'],
                  "chatColor": dataparent[i]['chatColor'],
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

      function getFile(chatId) {
        return new Promise(resolve => {
          var query = "SELECT * FROM room_chat_file WHERE chatId = ? ";
          db.query(query, [chatId], function (error, result) {
            if (!error) {
              var datafile = Object.values(JSON.parse(JSON.stringify(result)))
              var file = [];
              for (var i = 0; i < datafile.length; i++) {
                const data = {
                  "chatFileId": datafile[i]['chatFileId'],
                  "chatId": datafile[i]['chatId'],
                  "chatFileDir": datafile[i]['chatFileDir'],
                  "chatFileName": datafile[i]['chatFileName'],
                  "chatFileType": datafile[i]['chatFileType'],
                  //"fileUrl": "http://phpstack-91227-2158059.cloudwaysapps.com:3000/upload/"+datafile[i]['chatFileDir']+"/"+datafile[i]['chatFileName'],
                  "fileUrl": "http://" + baseurl + "/upload/" + datafile[i]['chatFileDir'] + "/" + datafile[i]['chatFileName'],
                }
                file.push(data);
              }
              console.log("file ", file);
              resolve(file);
            } else {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("fail", fail)
              console.log("error", error);
            }
          });
        });
      }

    })


  });
}