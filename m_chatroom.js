module.exports = function(io, db, util, fs, baseurl) {
    io.on('connection', function(userSocket) {
     
    console.log("connected to m_chatroom");
  
    chatRoomID = userSocket.handshake.query.chatRoomID
    personID = userSocket.handshake.query.personID
    userSocket.join(chatRoomID)
    userSocket.join(personID)
    console.log("Chat Room ID ", chatRoomID)
    console.log("person ID ", personID)
  

    userSocket.on('disconnect', () => {
        userSocket.leave(chatRoomID)
    })
        
    userSocket.on("all_message_req", async (data) => {
      console.log("all_message_req ", data);

      ids = [];
      ids.push(data['mSenderId']);
      ids.push(data['mRecipientId']);

      await updateChatReadId(ids);
    
      db.query("SELECT * FROM member_chat as a JOIN member as b ON a.mSenderId=b.mId WHERE a.mSenderId in (?) and a.mRecipientId in (?)",[ids, ids], async function (error, messages) {
        if (!error) {
          var lastmsg = Object.values(JSON.parse(JSON.stringify(messages)))
          var datalast = [];
          

          for(var i = 0; i<lastmsg.length;i++) {
            let dataparent;
            if (lastmsg[i]['mChatParentId'] !== 0) {
              dataparent = await getDataParent(lastmsg[i]['mChatParentId']);
            }

            let datafile = await getFile(lastmsg[i]['mChatId']);

              const data = {
                  "mChatId": lastmsg[i]['mChatId'],
                  "mChatParentId": lastmsg[i]['mChatParentId'],
                  "mName": lastmsg[i]['mName'],
                  "mSenderId": lastmsg[i]['mSenderId'],
                  "mRecipientId": lastmsg[i]['mRecipientId'],
                  "mChatData": lastmsg[i]['mChatData'],
                  "mChatType": lastmsg[i]['mChatType'],
                  "mChatTimestamp": lastmsg[i]['mChatTimestamp'],
                  "mChatColor": lastmsg[i]['mChatColor'],
                  "parentData": dataparent,
                  "file": datafile,
              }
              datalast.push(data);
          }
          console.log("all_message_res data ");
          console.log(util.inspect(datalast, {showHidden: false, depth: null, colors: true}))

          var success = {status:true, message: datalast};
          userSocket.emit("all_message_res", success)

        } else {

          var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
          userSocket.emit("fail", fail)
        }
      });  
      
      //new function update read chat
      function updateChatReadId(ids){
        return new Promise(resolve => {
            db.query("UPDATE member_chat SET mChatRead = ? WHERE mChatRead = ? AND mRecipientId = ? AND mSenderId = ? ",['y', 'n', data['mId'], data['mRecipientId']], function (error, messages) {
                if (!error) {
                    console.log("messages read updated");
                    resolve();
                } else {
                    var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                    console.log("error", error);
                    userSocket.emit("fail", fail)
                }
            });
        });
      }

      function getDataParent(chatParentId){
        return new Promise(resolve => {
            db.query("SELECT * FROM member_chat as a join member as b ON a.mSenderId=b.mId WHERE mChatId = ?",[chatParentId], function (error, messages) {
                if (!error) {
                  var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
                  var datap = [];
                  for(var i = 0; i<dataparent.length;i++) {
                    const data = {
                        "mChatId": dataparent[i]['mChatId'],
                        "mSenderId": dataparent[i]['senderId'],
                        "mName": dataparent[i]['mName'],
                        "mChatData": dataparent[i]['mChatData'],
                        "mChatType": dataparent[i]['mChatType'],
                        "mChatTimestamp": dataparent[i]['mChatTimestamp'],
                        "mChatColor": dataparent[i]['mChatColor'],
                        "mPic": dataparent[i]['urlSource']+dataparent[i]['mDir']+"/"+dataparent[i]['mPic'],
                    }
                    datap.push(data);
                  }
                    console.log("data parent ", datap);
                    resolve(datap);
                } else {
                    var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                    userSocket.emit("error", fail)
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
                    for(var i = 0; i<datafile.length;i++) {
                      const data = {
                          "mChatFileId": datafile[i]['mChatFileId'],
                          "mChatId": datafile[i]['mChatId'],
                          "mChatFileType": datafile[i]['mChatFileType'],
                          "mChatFileDir": datafile[i]['mChatFileDir'],
                          "mChatFileName": datafile[i]['mChatFileName'],
                          //"fileUrl": "http://phpstack-91227-2158059.cloudwaysapps.com:3000/upload/"+datafile[i]['chatFileDir']+"/"+datafile[i]['chatFileName'],
                          "mFileUrl": "http://"+baseurl+"/upload/"+datafile[i]['mChatFileDir']+"/"+datafile[i]['mChatFileName'],
                      }
                      file.push(data);
                    }
                      console.log("file ", file);
                      resolve(file);
                } else {
                    var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                    userSocket.emit("fail", fail)
                }
            });
        });
    }

    })

    //CHAT INFO 
    userSocket.on("minfo_req", (data) => {
          console.log("minfo_req data ", data);
    
          db.query("SELECT * FROM room_chat_info WHERE roomId = ? ", [data], function (error, messages){
              if (!error) {
                  var info = Object.values(JSON.parse(JSON.stringify(messages)))
                  console.log("room chat info ", info);
                  userSocket.emit("minfo_res", info)
              } else {
                  var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                  userSocket.emit("fail", fail)
              }
          });
    })
    

  });
}