import express from "express";
import { join } from "path";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import http from "http";
import socketio from "socket.io";

const app = express();
const httpServer = http.Server(app);
const io = socketio(httpServer);

//view engine setup
app.set("views", "./views");
app.set("view engine", "hbs");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));

//

// app.get("/user", function (req, res, next) {
//   res.render("index", { title: "RPS-Chat" });
// });

app.get("/", function (req, res, next) {
  res.render("index", { title: "RPS-Chat" });
});

const server = httpServer.listen("8080", function () {
  console.log("listening at :8080");
});

//socketio server event handling

io.sockets.on("connection", function (socket) {
  var user = {
    name: [],
  };

  socket.on("username", function (username) {
    socket.username = username;
    console.log(username + " has connected");
    io.emit("is_online", socket.username + " connected!");
    user[socket.username] = [];
    user[socket.username].push(socket.username);
  });

  socket.on("disconnect", function (username) {
    io.emit("is_online", socket.username + " disconnected!");
    console.log(socket.username);
    delete user[socket.username];
  });

  socket.on("chat_message", function (message) {
    io.emit(
      "chat_message",
      "<strong>" + socket.username + "</strong>: " + message
    );
  });

  socket.on("rps_option", function (option) {
    if (user[socket.username][1] != true) {
      io.emit(
        "chat_message",
        "<strong>" + socket.username + " chose " + option + "!</strong>"
      );
      user[socket.username].push(true);
      user[socket.username].push(option);
    } else {
      console.log(socket.username + " has already chosen!");
    }
    console.log(user);
  });
});

//error handling
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export const thisIsActuallyAModule = "lol";
