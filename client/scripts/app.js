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

      $.editable.addInputType('send_delete', {
         element : $.editable.types.text.element,
         buttons : function(settings, original) {
             var default_buttons = $.editable.types['defaults'].buttons
             default_buttons.apply(this, [settings, original]);

             var third = $('<input type="button">');
             third.val('Delete');
             $(this).append(third);

             $(third).click(function() {
                 var objectid = $(original).attr('id');
                 //console.log('third objectid', objectid);
                 app.delete(objectid);
             });
         }
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

    removeProperty: function(objectid, key){
      var data = {};
      data[key] = { '__op': 'Delete' };

      $.ajax({
        url: app.server + '/' + objectid,
        type: 'DELETE',
        data: data,
        success: function (data) {
          console.log('chatterbox: Delete property from message!');
          console.log('chatterbox:', data);

          app.deleteMessage(objectid);
        },
        error: function (data) {
          console.error('chatterbox: Failed to delete property from message');
          console.log('chatterbox:', data);
        }
      });
    },

    delete: function(objectid) {
      $.ajax({
        url: app.server + '/' + objectid,
        type: 'DELETE',
        success: function (data) {
          console.log('chatterbox: Message deleted!');
          console.log('chatterbox:', data);

          app.deleteMessage(objectid);
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
          console.log('timeStamp', app.currentTimeStamp);

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

    deleteMessage: function(objectid) {
      $('#' + objectid).remove();
    },

    createLine: function(room, user, text, auth3 ) {
      var displayed = '';
      
      if ( app.cryptText( room, user, text ) === auth3 ) {
        displayed = '<img src=images/star.gif>';
      }

      room = _.escape(room);
      user = _.escape(user);
      text = _.escape(text);

      displayed += '<span>(<strong>' + room + '</strong>) </span>' +
      '<span> <em>' + user + '</em>: </span><span class="messagetext">' + text + '</span>';

      return displayed;
    },

    addMessage: function(message) {
      var room = (message.roomname || '').toLowerCase();
      var user = message.username;
      var text = message.text;
      var auth3 = message.auth3;
      var id = message.objectId;
      var auth = message.auth;

      displayed = app.createLine( room, user, text, auth3 );

      $('<div>').addClass('message edit')
      .attr({'data-roomname': room,
        'data-username': user,
        'id': id,
        'data-auth': auth,
        'data-auth3': auth3 })
      .html(displayed)

      .editable(function(value, settings){
        var auth3 = $(this).data('auth3');
        var auth = $(this).data('auth');
        var user = $(this).data('username');
        var room = $(this).data('roomname');
        var id = $(this).attr('id');

        console.log('objectid', id);

        var crypt = app.cryptText(room, user, $(this.revert).siblings('.messagetext').text());

        var newCrypt = (auth && crypt == auth3) ? app.cryptText(room, user, value ) : undefined;

        app.update( id, { text: value, auth3: newCrypt } );

        return app.createLine( room, user, value, newCrypt );

        }, { type: 'send_delete', submit: 'Send', data: text || ' '})

      .prependTo('#chats');

      //Add Rooms
      if (room && room.length > 0) {
        app.addRoom(room);
      }

      app.currentTimeStamp = message.createdAt; //Update the latest time stamp
    },

    filterRoom: function(){
      var room = $('#roomSelect').val();

      if (room != '--all--') {
        $('#chats > div:not([data-roomname="' + room + '"])').fadeOut();
        $('#chats > div[data-roomname="' + room + '"]').fadeIn();
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
      sha256.update(roomname || '');
      sha256.update(username || '');
      sha256.update(text || '');
      sha256.update(cryptSalt);

      return sha256.finalize().toString();
    }
  }
})
