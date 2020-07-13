import express from "express";
import { join } from "path";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import http from "http";
import socketio from "socket.io";
import { constants } from "buffer";

//db setup
import pgpromise from "pg-promise";
const pgp = pgpromise();

const db = pgp("postgres://aliu:775842@localhost:5432/rps");

//temp user db
const query =
  "CREATE TABLE temp_user(\
    user_id integer,\
    user_name character varying(20))";

db.none(query);

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
app.get("/login", function (req, res, next) {
  res.render("login", { title: "RPS-Login" });
});

app.get("/", function (req, res, next) {
  res.render("index", { title: "RPS-Chat" });
});

const server = httpServer.listen("8080", function () {
  console.log("listening at :8080");
});

//rps handling
function rps(choice1, choice2) {
  if (choice1 - choice2 == -2 || choice1 - choice2 == 1) {
    return 2;
  } else if (choice1 - choice2 == -1 || choice1 - choice2 == 2) {
    return 1;
  } else {
    return 0;
  }
}

let user = {
  //name, chosen, choice
  name: [],
};
let last_choose = null; // last user that chose a rps option and compares
let temp_id = 0;
//socketio server event handling

io.sockets.on("connection", function (socket) {
  socket.on("username", function (username) {
    socket.username = username;
    console.log(username + " has connected");
    io.emit("is_online", socket.username + " connected!");
    user[socket.username] = [];
    user[socket.username].push(socket.username);
    user[socket.username].push(null);
    user[socket.username].push(null);

    //***temp add user to rps db if not in */
    db.none("SELECT user_name FROM temp_user WHERE user_name = $1", [
      socket.username,
    ])
      .then(function (data) {
        //success;"
        console.log("user relogging");
      })
      .catch(function (error) {
        //error;
        db.none("INSERT INTO temp_user(user_id, user_name) VALUES ($1, $2)", [
          temp_id,
          socket.username,
        ]);
        temp_id += 1;
      });
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
    let optionname = "";
    if (option == 1) {
      optionname = "PAPER";
    } else if (option == 2) {
      optionname = "ROCK";
    } else {
      optionname = "SCISSORS";
    }

    if (user[socket.username][1] != true) {
      io.emit(
        "chat_message",
        "<strong>" + socket.username + " chose " + optionname + "!</strong>"
      );

      user[socket.username][1] = true;
      user[socket.username][2] = option;

      if (last_choose == null) {
        last_choose = socket.username;
      } else {
        let winner = rps(user[last_choose][2], user[socket.username][2]);
        if (winner == 1) {
          io.emit(
            "chat_message",
            "<strong>" +
              last_choose +
              " beats " +
              socket.username +
              " by using " +
              optionname +
              "</strong>"
          );
        } else if (winner == 2) {
          io.emit(
            "chat_message",
            "<strong>" +
              socket.username +
              " beats " +
              last_choose +
              " by using " +
              optionname +
              "</strong>"
          );
        } else {
          io.emit(
            "chat_message",
            "<strong>It's a DRAW between " +
              last_choose +
              " and " +
              socket.username +
              "!</strong>"
          );
        }

        //reset after comparing rps
        user[last_choose][1] = false;
        user[last_choose][2] = null;
        user[socket.username][1] = false;
        user[socket.username][2] = null;
        last_choose = null;
      }
    } else {
      console.log(socket.username + " has already chosen!");
    }
    // console.log(last_choose);
    // console.log(user);
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
