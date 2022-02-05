module.exports = function(io, db, util, baseurl) {
  io.on('connection', function(userSocket) {
   
    console.log("connected to chatroom");

     //Get the chatID of the user and join in a room of the same chatID
     chatRoomID = userSocket.handshake.query.chatRoomID
     userSocket.join(chatRoomID)
     console.log("Chat Room ID ", chatRoomID)
 
     //Leave the room if the user closes the socket
     userSocket.on('disconnect', () => {
         userSocket.leave(chatRoomID)
     })
 
      
    userSocket.on("init_message_request", async (data) => {
      console.log("init_message_request ", data);

       //await updateChatReadId(data['roomId'], data['mId']);
      await updateChatReadId(data['roomId'], data['mId']);
    
      db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE roomId = ? ",[data['roomId']], async function (error, messages) {
        if (!error) {
          var lastmsg = Object.values(JSON.parse(JSON.stringify(messages)))
          var datalast = [];
          

          for(var i = 0; i<lastmsg.length;i++) {
            let dataparent;
            if (lastmsg[i]['chatParentId'] !== 0) {
              dataparent = await getdataparent(lastmsg[i]['chatParentId']);
            }

            let datafile = await getFile(lastmsg[i]['chatId']);

              const data = {
                  "chatId": lastmsg[i]['chatId'],
                  "senderId": lastmsg[i]['senderId'],
                  "mName": lastmsg[i]['mName'],
                  "roomId": lastmsg[i]['roomId'],
                  "chatData": lastmsg[i]['chatData'],
                  "chatType": lastmsg[i]['chatType'],
                  "chatTimestamp": lastmsg[i]['chatTimestamp'],
                  "chatColor": lastmsg[i]['chatColor'],
                  "mPic": lastmsg[i]['urlSource']+lastmsg[i]['mDir']+"/"+lastmsg[i]['mPic'],
                  "parentData": dataparent,
                  "file": datafile,
              }
              datalast.push(data);
          }
          console.log("init_message data ");
          console.log(util.inspect(datalast, {showHidden: false, depth: null, colors: true}))

          var success = {status:true, message: datalast};
          userSocket.emit("init_message_response", success)

        } else {

          var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
          userSocket.emit("error", fail)
        }
      });  
      
      ////function update read chat
      // function updatechatread(roomId, mid){
      //   return new Promise(resolve => {
      //       db.query("UPDATE room_chat SET chatRead= ? WHERE roomId = ? AND senderId != ? ",['y', roomId, mid], function (error, messages) {
      //           if (!error) {
      //               console.log("all chat read");
      //               resolve();
      //           } else {
      //               var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
      //               userSocket.emit("error", fail)
      //           }
      //       });
      //   });
      // }

      //new function update read chat
      function updateChatReadId(roomId, mid) {
        return new Promise(resolve => {
          var query = `SELECT * FROM room_chat WHERE roomId = ? AND NOT JSON_CONTAINS(chatReadId, '"?"')`;
          db.query(query, [roomId, mid], function (error, messages) {
            if (error) {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("error", fail)
              console.log('error', error);
            } else {
              for (i = 0; i < messages.length; i++) {
                var chatReadId = JSON.parse(messages[i]['chatReadId']);
                chatReadId.push(mid.toString());
                console.log("ini readId", JSON.stringify(chatReadId));

                //update chat
                db.query("UPDATE room_chat SET chatReadId= ? WHERE roomId = ? AND chatId = ?", [JSON.stringify(chatReadId), roomId, messages[i]['chatId']], function (error, msg) {
                  if (error) {
                    var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
                    userSocket.emit("error", fail)
                    console.log("error", error);
                  } else {
                    console.log("all chat read", msg);
                  }
                });
              }
              resolve();
              console.log("update read", messages);
            }
          });
        });
      }

      function getdataparent(chatParentId){
        return new Promise(resolve => {
            db.query("SELECT * FROM room_chat as a join member as b ON a.senderId=b.mId WHERE chatId = ?",[chatParentId], function (error, messages) {
                if (!error) {
                  var dataparent = Object.values(JSON.parse(JSON.stringify(messages)))
                  var datap = [];
                  for(var i = 0; i<dataparent.length;i++) {
                    const data = {
                        "chatId": dataparent[i]['chatId'],
                        "senderId": dataparent[i]['senderId'],
                        "mName": dataparent[i]['mName'],
                        "roomId": dataparent[i]['roomId'],
                        "chatData": dataparent[i]['chatData'],
                        "chatType": dataparent[i]['chatType'],
                        "chatTimestamp": dataparent[i]['chatTimestamp'],
                        "chatColor": dataparent[i]['chatColor'],
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
            var query = "SELECT * FROM room_chat_file WHERE chatId = ? ";
            db.query(query, [chatId], function (error, result) {
                if (!error) {
                    var datafile = Object.values(JSON.parse(JSON.stringify(result)))
                    var file = [];
                    for(var i = 0; i<datafile.length;i++) {
                      const data = {
                          "chatFileId": datafile[i]['chatFileId'],
                          "chatId": datafile[i]['chatId'],
                          "chatFileDir": datafile[i]['chatFileDir'],
                          "chatFileName": datafile[i]['chatFileName'],
                          "chatFileType": datafile[i]['chatFileType'],
                          //"fileUrl": "http://phpstack-91227-2158059.cloudwaysapps.com:3000/upload/"+datafile[i]['chatFileDir']+"/"+datafile[i]['chatFileName'],
                          "fileUrl": "http://"+baseurl+"/upload/"+datafile[i]['chatFileDir']+"/"+datafile[i]['chatFileName'],
                      }
                      file.push(data);
                    }
                      console.log("file ", file);
                      resolve(file);
                } else {
                    var fail = {status:false, errorMessage:'Gagal mendapatkan data'};
                    userSocket.emit("fail", fail)
                    console.log("error", error);
                }
            });
        });
    }

    })

    userSocket.on("profile_request", (mid) => {
      console.log("profile_request", mid);
      db.query("SELECT * from member as a JOIN marga as b ON a.margaId=b.margaId JOIN kabupaten as c ON a.kabupatenId=c.kabupatenId WHERE mId = ?", [mid], async function (error, profile) {
        if (!error) {
          var member = Object.values(JSON.parse(JSON.stringify(profile)))
          var datap = [];
          for (var i = 0; i < member.length; i++) {

            var mData = await getSocialMedia(mid);

            console.log("data SOSMED ", mData);

            if (mData != undefined) {
              if (mData['mdataFacebook'] == "https://facebook.com/") {
                facebook = "";
              } else {
                facebook = mData['mdataFacebook'];
              }
              if (mData['mdataTwitter'] == "https://twitter.com/") {
                twitter = "";
              } else {
                twitter = mData['mdataTwitter'];
              }
              if (mData['mdataInstagram'] == "https://instagram.com/") {
                instagram = "";
              } else {
                instagram = mData['mdataInstagram'];
              }
              if (mData['mdataYoutube'] == "https://www.youtube.com/channel/") {
                youtube = "";
              } else {
                youtube = mData['mdataYoutube'];
              }
              if (mData['mdataLinkedIn'] == "https://www.linkedin.com/in/") {
                linkedin = "";
              } else {
                linkedin = mData['mdataLinkedIn'];
              }
              if (mData['mdataTikTok'] == "https://www.tiktok.com/") {
                tiktok = "";
              } else {
                tiktok = mData['mdataTikTok'];
              }
              if (mData['mdataWebsite'] == "") {
                website = "";
              } else {
                website = "https://" + mData['mdataWebsite'];
              }
            } else {
              facebook = "";
              twitter = "";
              instagram = "";
              youtube = "";
              linkedin = "";
              tiktok = "";
              website = "";
            }

            var newhp;
            var newwa;

            if (member[i]['mHP'].substr(0, 2) == '62') {
              var subshp = member[i]['mHP'].substr(2);
              var trimhp = subshp.trim("62")
              newhp = "0" + trimhp;
            } else {
              newhp = member[i]['mHP'];
            }

            if (member[i]['mWa'].substr(0, 2) == '62') {
              var subswa = member[i]['mWa'].substr(2);
              var trimwa = subswa.trim("62")
              newwa = "0" + trimwa;
            } else {
              newwa = member[i]['mWa'];
            }

            const data = {
              "mId": member[i]['mId'],
              "mName": member[i]['mName'],
              "mMandarinName": member[i]['mMandarinName'],
              "mHP": newhp,
              "mWa": newwa,
              "mEmail": member[i]['mEmail'],
              "margaId": member[i]['margaId'],
              "margaName": member[i]['margaName'],
              "kabupatenId": member[i]['kabupatenId'],
              "kabupatenName": member[i]['kabupatenName'],
              "mPic": member[i]['urlSource'] + member[i]['mDir'] + "/" + member[i]['mPic'],
              "fb": facebook,
              "twitter": twitter,
              "instagram": instagram,
              "youtube": youtube,
              "linkedin": linkedin,
              "tiktok": tiktok,
              "website": website,
              "waShow": mData != undefined ? mData['mdataWaShow'] : "n",
              "emailShow": mData != undefined ? mData['mdataEmailShow'] : "n",
              "bio": mData != undefined ? mData['mdataBio'] : "",
            }
            datap.push(data);
          }

          var success = { status: true, message: datap };
          console.log("data profile ", success);
          userSocket.emit("profile_response", success)
        } else {
          var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
          userSocket.emit("fail", fail)
        }
      });

      function getSocialMedia(mid) {
        return new Promise(resolve => {
          db.query("SELECT * from member_data WHERE mId = ? ", [mid], function (error, result) {
            if (!error) {
              var sosmed = Object.values(JSON.parse(JSON.stringify(result)))
              console.log("social media ", sosmed[0]);
              resolve(sosmed[0]);
            } else {
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' };
              userSocket.emit("fail", fail)
            }
          });
        });
      }
    });

    userSocket.on("sticker_request", async (data) => { 
      console.log("sticker_request ", data); 
 
      let category = await getcategory(); 
      var success = {status:true, message: category}; 
      console.log("sticker_response "); 
      console.log(util.inspect(success, {showHidden: false, depth: null, colors: true})) 
      io.emit("sticker_response", success) 
 
      function getcategory() { 
        return new Promise(resolve => { 
          db.query("SELECT * from sticker_category ORDER BY stickerCatSort ASC", async function (error, result) { 
            if (!error) { 
              var catdata = Object.values(JSON.parse(JSON.stringify(result))) 
              var cat = []; 
              for(var i = 0; i<catdata.length;i++)  { 
 
                  let stickerdata = await getstickerdata(catdata[i]['stickerCatId']); 
                     
                  const data = { 
                      "stickerCatId": catdata[i]['stickerCatId'], 
                      "stickerCatName": catdata[i]['stickerCatName'], 
                      "stickerCatSort": catdata[i]['stickerCatSort'], 
                      "stickerData": stickerdata, 
                  } 
                  cat.push(data); 
              } 
              resolve(cat); 
 
            } else { 
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' }; 
              userSocket.emit("fail", fail) 
              console.log("error", error);
            } 
          }); 
 
        }); 
      } 
 
      function getstickerdata(catId) { 
        return new Promise(resolve => { 
          db.query("SELECT * from sticker_data WHERE stickerCatId = ? ", [catId], function (error, result) { 
            if (!error) { 
              var stick = Object.values(JSON.parse(JSON.stringify(result))) 
              var stickers = []; 
              for(var i = 0; i<stick.length;i++)  {     
                const data = { 
                    "stickerId": stick[i]['stickerId'], 
                    "stickerCatId": stick[i]['stickerCatId'], 
                    "stickerUrl": stick[i]['stickerUrl'], 
                    "stickerDir": stick[i]['stickerDir'], 
                    "stickerName": stick[i]['stickerName'], 
                    "stickerLink": stick[i]['stickerUrl']+"/"+stick[i]['stickerDir']+"/"+stick[i]['stickerName'], 
                } 
                stickers.push(data); 
              } 
              resolve(stickers); 
            } else { 
              var fail = { status: false, errorMessage: 'Gagal mendapatkan data' }; 
              userSocket.emit("fail", fail) 
            } 
          }); 
        }); 
      } 
 
    });


  });
}