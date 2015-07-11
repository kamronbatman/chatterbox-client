var app;
$(function() {
  app = {
    server: 'https://api.parse.com/1/classes/chatterbox',
    rooms: new Set(),
    //currentRoom: 'lobby',

    init: function() {
      //Fetch all messages
      //Add new rooms (get them from the messages)
      //Display

      app.fetch();
      $('#roomSelect').val('lobby');

      $('#sendInput').on('click', function(){
        var currentRoom = $('#roomSelect').val();
        var message = $('#messageInput').val();

        app.send( app.createMessage(currentRoom,message) );
        app.clearMessages();
        app.fetch();
      });
    },

    send: function(message) {
      $.ajax({
        url: app.server,
        type: 'POST',
        data: JSON.stringify(message),
        contentType: 'application/json',
        success: function (data) {
          console.log('chatterbox: Message sent');
          console.log('chatterbox:', data);

          //Fetch all messages
        },
        error: function (data) {
          console.error('chatterbox: Failed to send message');
          console.log('chatterbox:', data);
        }
      });
    },

    fetch: function() {
      $.ajax({
        url: app.server,
        type: 'GET',
        //data: { order: '-createdAt'},
        contentType: 'application/json',
        success: function (data) {
          console.log('chatterbox: Message received');
          console.log('chatterbox:', data);

          _.each(data.results.reverse(), function(message) { app.addMessage(message) });
        },
        error: function (data) {
          console.error('chatterbox: Failed to receive message');
          console.log('chatterbox:', data);
        }
      });
    },

    clearMessages: function() {
      $('#chats').children().remove();
    },

    addMessage: function(message) {
      message = app.clean(message);

      if (message.username && message.roomname) {
        displayed = '(<strong>' + message.roomname + '</strong>) ' + '<em>' + message.username + '</em>: ' + message.text;

        if (message.auth) {
          if (message.auth2){
            var auth2 = app.cryptText( message.roomname, message.username, message.text );
            var msgauth2 = CryptoJS.SHA256();
            if ( auth2 == _.extend(msgauth2,message.auth2).toString() ) {
              displayed = '<img src=images/star.gif>' + displayed;
            }
          }
          else if ( app.cryptText( message.roomname, message.username, message.text ) == message.auth3 ){
            displayed = '<img src=images/star.gif>' + displayed;
          } else {
            displayed = '<img src=images/silver-star.gif>' + displayed;
          }
        }

        $('<div>').addClass('message').html(displayed).prependTo('#chats');

        //Add Rooms
        app.addRoom(message.roomname);
      }
    },

    addRoom: function(room) {
      room = room.toLowerCase();
      if (!app.rooms.has(room)) {
        $('<option>').addClass('room').attr('value',room).text(room).appendTo('#roomSelect');
        app.rooms.add(room);
      }
    },

    addFriend: function(friend) { },

    clean: function(message){
      message.roomname = _.escape(message.roomname);
      message.username = _.escape(message.username);
      message.text = _.escape(message.text);

      return message;
    },

    getParameter: function(sParam)
    {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++)
        {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam)
            {
                return sParameterName[1];
            }
        }
    },

    getUsername: function(){
      return app.getParameter('username');
    },

    createMessage: function(roomname,text) {
      return {  username: app.getUsername(),
                roomname: roomname,
                text: text,
                auth:true,
                auth3: app.cryptText(roomname,app.getUsername(),text) };
    },

    cryptText: function(roomname,username,text) {
      var sha256 = CryptoJS.algo.SHA256.create();

      sha256.update(cryptSalt);
      sha256.update(roomname);
      sha256.update(username);
      sha256.update(text);
      sha256.update(cryptSalt);

      return sha256.finalize().toString();
    }
  }
})
