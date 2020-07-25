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
      let listItem = document.createElement("LI");
      listItem.textContent = userlist[i];
      listItem.className = "userlist-user";
      document.getElementById("userlist-users").appendChild(listItem);
    }
  });

  socket.on("challenge-confirm", function (data) {
    console.log(data[1]);
    challenge = data[0] + " challenges " + data[1];
    //emit chat message"
    $("#messages").append($("<li>").html("<strong>" + challenge + "</strong>"));
    //emit challenge
    sessionStorage.setItem("duel", "1");
    console.log(sessionStorage.duel);
    socket.emit("challenge", [data[0], data[1]]);
  });

  socket.on("results", function (data) {
    console.log(sessionStorage.user_Name);
    console.log(data);
    console.log(sessionStorage.user_Name in data);
    if (data.includes(sessionStorage.user_Name)) {
      sessionStorage.setItem("duel", "0");
    }
  });

  $("#userlist-users").on("click", ".userlist-user", function () {
    target = this.textContent;
    if (sessionStorage.user_Name != target) {
      socket.emit("challenge-check", [sessionStorage.user_Name, target]);
    } else {
      console.log("can't challenge self");
    }
  });

  //add guest accounts, temp ids and sets usernames in chat
  let guest = false;
  let username;
  if (sessionStorage.user_Name == null) {
    guest = confirm("Would you like to be logged in as a Guest?");
  }

  if (guest) {
    socket.emit("start-session", { sessionId: null });
    socket.emit("guest", true);
  } else {
    username = sessionStorage.user_Name;
  }

  socket.on("set-session-acknowledgement", function (data) {
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
    if (sessionStorage.getItem("duel") == "1") {
      socket.emit("rps_option", 1);
    }
  });

  //rock
  $("#rock_but").click(function () {
    console.log(username + " picked: ROCK");
    if (sessionStorage.getItem("duel") == "1") {
      socket.emit("rps_option", 2);
    }
  });

  //scissors
  $("#scissors_but").click(function () {
    console.log(username + " picked: SCISSORS");
    console.log(sessionStorage.getItem("duel"));
    console.log(sessionStorage.getItem("duel") == "1");
    if (sessionStorage.getItem("duel") == "1") {
      socket.emit("rps_option", 3);
    }
  });

  //chatbutton
  $("form").submit(function (e) {
    e.preventDefault();
    socket.emit("chat_message", $("#txt").val());
    $("#txt").val("");
    return false;
  });
});
