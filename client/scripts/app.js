var app;
$(function() {
  app = {
    server: 'https://api.parse.com/1/classes/chatterbox',
    rooms: new Set(),
    currentTimeStamp: undefined,
    currentlyUpdating: false,

    init: function() {
      //Fetch all messages
      //Add new rooms (get them from the messages)
      //Display

      app.fetch();
      app.addRoom('--all--');
      app.addRoom('lobby'); //Lobby

      $('#roomSelect').val('lobby');

      $('#sendInput').on('click', function(){
        var currentRoom = $('#roomSelect').val();
        var message = $('#messageInput').val();

        app.send( app.createMessage(currentRoom,message) );
        //app.clearMessages();
        app.fetch();
      });

      $('#roomSelect').change(function() {
        //app.clearMessages();
        app.fetch();
      });

      //setInterval( function(){ app.fetch(); }, 5000 );

      // $('#main').css({'filter': 'alpha(opacity=75)','opacity': '.75'})
      // .appendTo( $('<div>').css({ 'background-size': 'cover', 'background-image': 'url(http://images3.alphacoders.com/723/72397.jpg)', 'background-attachment' : 'fixed'})
      //   .appendTo('body'));
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
          app.fetch();
        },
        error: function (data) {
          console.error('chatterbox: Failed to send message');
          console.log('chatterbox:', data);
        }
      });
    },

    update: function(objectid,message) {
      $.ajax({
        url: app.server + '/' + objectid,
        type: 'PUT',
        data: JSON.stringify(message),
        contentType: 'application/json',
        success: function (data) {
          console.log('chatterbox: Message updated!');
          console.log('chatterbox:', data);

          //Fetch all messages
          app.fetch();
        },
        error: function (data) {
          console.error('chatterbox: Failed to update message');
          console.log('chatterbox:', data);
        }
      });
    },

    fetch: function() {
      $.ajax({
        url: app.server,
        type: 'GET',
        data: { order: '-createdAt',
                limit: '1000',
                where: { 'createdAt': { '$gt': app.currentTimeStamp } } },
        contentType: 'application/json',
        beforeSend: function(){
          if (app.currentlyUpdating) {
            return false;
          }

          return (app.currentlyUpdating = true);
        },
        success: function (data) {
          console.log('chatterbox: Message received');
          console.log('chatterbox:', data);
          console.log('currentMessage', app.currentTimeStamp);

          _.each(data.results.reverse(), function(message) { app.addMessage(message) });

          app.filterRoom();
        },
        error: function (data) {
          console.error('chatterbox: Failed to receive message');
          console.log('chatterbox:', data);
        },
        complete: function(){
          app.currentlyUpdating = false;
        }
      });
    },

    clearMessages: function() {
      $('#chats').children().remove();
    },

    createLine: function(room,username,text) {
        return '<span>(<strong>' + room + '</strong>)</span>' +
        '<span><em>' + username + '</em>:</span><span class="messagetext">' + text + '</span>';
    },

    addMessage: function(message) {
      var displayed = '';

      //if (message.username && message.roomname) {
        if (message.auth) {
          if (message.auth2){
            var auth2 = app.cryptText( message.roomname, message.username, message.text );
            var msgauth2 = CryptoJS.SHA256();
            if ( auth2 == _.extend(msgauth2,message.auth2).toString() ) {
              displayed = '<img src=images/star.gif>';
            }
          }
          else if ( app.cryptText( message.roomname, message.username, message.text ) == message.auth3 ){
           displayed = '<img src=images/star.gif>';
          } else {
           displayed = '<img src=images/silver-star.gif>';
          }
        }
        // else {
        //   displayed = '<img src=images/silver-star.gif style="filter: alpha(opacity=750); opacity: 0">';
        // }

        message = app.clean(message);
        displayed = displayed + app.createLine(message.roomname,message.username,message.text);

        $('<div>').addClass('message edit')
        .attr({'data-roomname': message.roomname,
          'data-username': message.username,
          'id': message.objectId,
          'data-auth': message.auth,
          'data-auth3': message.auth3 })
        .html(displayed)

        .editable(function(value, settings){
          console.log('objectid', $(this).attr('id'));
            var auth3 = $(this).data('auth3');
            var username = $(this).data('username');
            var roomname = $(this).data('roomname');
            var objectid = $(this).attr('id');
            var crypt = app.cryptText(roomname, username, $(this.revert).siblings('.messagetext').text());

            app.update( objectid, { text: value, auth3: auth3 == crypt ? app.cryptText(roomname, username, value) : undefined } );
            return app.createLine(roomname,username, value);
          }, { type: 'textarea', submit: 'Send', data: _.unescape(message.text)})

        .prependTo('#chats');

        //Add Rooms
        app.addRoom(message.roomname);
      //}

      app.currentTimeStamp = message.createdAt; //Update the latest time stamp
    },

    filterRoom: function(){
      var room = $('#roomSelect').val();

      if (room != '--all--') {
        $('#chats > div:not([data-roomname="' + room + '"])').fadeOut();
      } else {
        $('#chats > div').fadeIn();
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
