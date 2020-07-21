$(function () {
  // const socket = io("http://localhost:8080");

  socket.on("chat_message", function (msg) {
    $("#messages").append($("<li>").html(msg));
  });

  socket.on("is_online", function (username) {
    // console.log("test" + username);
    $("#messages").append($("<li>").html(username));
  });

  //add guest accounts, temp ids and sets usernames in chat
  let guest = false;
  let username;
  if (sessionStorage.user_Name == null) {
    guest = confirm("Would you like to be logged in as a Guest?");
  }

  if (guest) {
    socket.emit("guest", true);
    socket.emit("start-session", { sessionId: null });
  } else {
    username = sessionStorage.user_Name;
  }

  socket.on("set-session-acknowledgement", function (data) {
    sessionStorage.setItem("sessionId", data.sessionId);
  });

  socket.on("guest-name", function (name) {
    username = name;
    sessionStorage.user_Name = username;
  });

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
