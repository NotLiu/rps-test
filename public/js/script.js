$(function () {
  const socket = io("http://localhost:8080");

  socket.on("chat_message", function (msg) {
    $("#messages").append($("<li>").html(msg));
  });

  socket.on("is_online", function (username) {
    // console.log("test" + username);
    $("#messages").append($("<li>").html(username));
  });

  const username = prompt("Enter a username");
  socket.emit("username", username);

  $("form").submit(function (e) {
    e.preventDefault();
    socket.emit("chat_message", $("#txt").val());
    $("#txt").val("");
    return false;
  });
});
