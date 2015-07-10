// YOUR CODE HERE:
var app;
$(function() {
  app = {
    server: 'https://api.parse.com/1/classes/chatterbox',

    init: function() {
      //Fetch all messages
      //Add new rooms (get them from the messages)
      //Display

      app.fetch();
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
        //data: JSON.stringify(message),
        contentType: 'application/json',
        success: function (data) {
          console.log('chatterbox: Message received');
          console.log('chatterbox:', data);

          if ( 'results' in data ) {
            _.each(data.results, function(message) { app.addMessage(message) });
          }
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
      $('#chats').append(
          $('<div>').addClass('message').html(
              '(<strong>' + message.roomname + '</strong>) ' + '<em>' + message.username + '</em>: ' + message.text
            )
        );
    },

    addRoom: function(room) {
      $('#roomSelect').append(
        $('<option>').addClass('room').text(room)
        )
    },

    addFriend: function(friend) { },

    clean: function(message){
      message.roomname = _.escape(message.roomname);
      message.username = _.escape(message.username);
      message.text = _.escape(message.text);

      return message;
    }
  }
})
