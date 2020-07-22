$(function () {
  console.log("test");
  socket.emit("chat-loaded", sessionStorage.user_Name);
  // const socket = io("http://localhost:8080");

  socket.on("chat_message", function (msg) {
    $("#messages").append($("<li>").html(msg));
  });

  let userlist = [];

  socket.on("is_online", function (username) {
    // console.log("test" + username);
    $("#messages").append($("<li>").html(username));
  });

  socket.on("reload-list", function (data) {
    userlist = data;
    $("#userlist-users").empty();
    console.log(userlist);
    for (i = 0; i < userlist.length; i++) {
      $("#userlist-users").append($("<li>").html(userlist[i]));
    }
  });

  //add guest accounts, temp ids and sets usernames in chat
  let guest = false;
  let username;
  if (sessionStorage.user_Name == null) {
    console.log("te");
    guest = confirm("Would you like to be logged in as a Guest?");
  }

  if (guest) {
    console.log("tet");
    socket.emit("start-session", { sessionId: null });
    socket.emit("guest", true);
  } else {
    username = sessionStorage.user_Name;
  }

  socket.on("set-session-acknowledgement", function (data) {
    console.log("test");
    sessionStorage.setItem("sessionId", data.sessionId);
  });

  socket.on("guest-name", function (name) {
    username = name;
    sessionStorage.user_Name = username;
    console.log(document.getElementById("title").textContent);
    if (document.getElementById("title").textContent == "RPS") {
      location.reload();
    }
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
