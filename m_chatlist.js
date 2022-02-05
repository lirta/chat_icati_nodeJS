module.exports = function(io, db, util, fs, baseurl) {
    io.on('connection', function(userSocket) {
     
    console.log("connected to personal chat list");
  
    chatRoomID = userSocket.handshake.query.chatRoomID
    personID = userSocket.handshake.query.personID
    userSocket.join(chatRoomID)
    userSocket.join(personID)
    console.log("Chat Room ID ", chatRoomID)
    console.log("person ID ", personID)
  

    userSocket.on('disconnect', () => {
        userSocket.leave(chatRoomID)
    })
        
     // GET MEMBER CHAT HISTORY
    userSocket.on("m_chatlist_req", async (data) => {
      const newdata = [];
      
      let myChat = await getChat(data['mId']);

      var success = {status:true, message: myChat};
      userSocket.emit("m_chatlist_res", success)
      console.log("m_chatlist_res ", success);

      function getChat(id){
          return new Promise(resolve => {
            db.query("SELECT max(a.mChatId) as mChatId, b.mId, b.mName, b.urlSource, b.mDir, b.mPic, a.* FROM member_chat as a JOIN member as b on (a.mSenderId=b.mId OR a.mRecipientId=b.mId) where b.mId != ? and a.mSenderId IN (?) or a.mRecipientId IN (?) GROUP by b.mId having b.mId != ? ORDER BY mChatId desc",[id, id, id, id], async function (error, result) {
                  if (!error) {
                      var datachat = Object.values(JSON.parse(JSON.stringify(result)))
                      for (var i = 0; i < datachat.length; i++) {

                        let msg = await getMessage(id, datachat[i]['mId']);
                          let unread = await getUnreadMessage(id, datachat[i]['mId']);
                          const data = {
                              "mChatId": datachat[i]['mChatId'],
                              "mChatParentId": datachat[i]['mChatParentId'],
                              "mId": datachat[i]['mId'],
                              "mName": datachat[i]['mName'],
                              "mPic": datachat[i]['urlSource']+datachat[i]['mDir']+"/"+datachat[i]['mPic'],
                              "mSenderId":msg[1],
                              "mRecipientId": msg[2],
                              "mChatData":  msg[0],
                              "mChatType": msg[4],
                              "mChatTimestamp": msg[3],
                              "mChatColor": datachat[i]['mChatColor'],
                              "unreadMessage": unread,
                          }
                          newdata.push(data);
                      }
                      resolve(newdata);
                  } else {
                      var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                      userSocket.emit("fail", fail)
                  }
              });
          });
      }

      function getMessage(id, mid){
        return new Promise(resolve => {
            ids = [];
            ids.push(id);
            ids.push(mid);

            var query = 'SELECT * from member_chat where mSenderId in (?) and mRecipientId in (?) Order By mChatId DESC limit 1';
            db.query(query, [ids, ids], function (error, rows, fields){
                if(error){
                    console.log(error)
                } else{
                    var reschat = Object.values(JSON.parse(JSON.stringify(rows)))
                    if (reschat[0].hasOwnProperty('mChatData') && reschat[0].hasOwnProperty('mSenderId') && reschat[0].hasOwnProperty('mChatTimestamp')) {
                        resolve([reschat[0]['mChatData'], reschat[0]['mSenderId'], reschat[0]['mRecipientId'], reschat[0]['mChatTimestamp'], reschat[0]['mChatType']]);
                    } else {
                        resolve("");
                    }
                }
            });
        });
    }

      function getUnreadMessage(senderId, recipientId){
          return new Promise(resolve => {
              const ids = [];
              ids.push(senderId);
              ids.push(recipientId);

              var query = "SELECT count(mChatRead) as unreadMessage FROM `member_chat` where mSenderId in (?) and mRecipientId in (?) and mChatRead='n' and mSenderId != ?";
              db.query(query, [ids, ids, senderId], function (error, rows, fields){
                  if(error){
                      console.log(error)
                  } else{
                      var reschat = Object.values(JSON.parse(JSON.stringify(rows)))
                      resolve(reschat[0]['unreadMessage']);
                  }
              });
          });
      }

    })

  

  });
}