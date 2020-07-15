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
  if (username != null) {
    socket.emit("username", username);
  }

  //rps options
  //paper
  $("#paper_but").click(function () {
    console.log(username + " picked: PAPER");
    socket.emit("rps_option", 1);
  });
  //rock
  $("#rock_but").click(function () {
    console.log(username + " picked: ROCK");
    socket.emit("rps_option", 2);
  });
  //scissors
  $("#scissors_but").click(function () {
    console.log(username + " picked: SCISSORS");
    socket.emit("rps_option", 3);
  });
  //chatbutton
  $("form").submit(function (e) {
    e.preventDefault();
    socket.emit("chat_message", $("#txt").val());
    $("#txt").val("");
    return false;
  });
});
