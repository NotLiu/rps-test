import express from "express";
import { join } from "path";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import http from "http";
import socketio from "socket.io";
import { constants } from "buffer";
import uuid from "uuidv4";
import ngrok from "ngrok";

//db setup
import pgpromise from "pg-promise";
import { stringify } from "querystring";
const pgp = pgpromise();

const db = pgp("postgres://aliu:775842@localhost:5432/rps");

//temp user db
const query =
  "CREATE TEMP TABLE IF NOT EXISTS temp_user(\
    user_id integer,\
    user_name character varying(20))";

db.none(query);

const reg_query =
  "CREATE TABLE IF NOT EXISTS reg_user(\
      user_id integer NOT NULL,\
      user_name character varying(20),\
      password character varying(20),\
      email character varying(20),\
      rating integer,\
      wins integer,\
      losses integer,\
      draws integer)";

db.none(reg_query);

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

function user_num() {
  return db
    .one("SELECT COUNT(*) FROM reg_user")
    .then(function (data) {
      return data.count;
    })
    .catch(function (error) {});
}

//render views

app.get("/leaderboards", function (req, res, next) {
  db.many(
    "SELECT user_name, rating FROM reg_user ORDER BY rating DESC, user_name"
  )
    .then(function (data) {
      res.render("leaderboards", {
        results: data,
      });
    })
    .catch(function (error) {});
});

app.get("/success", function (req, res, next) {
  // temp registration success screen
  res.render("success", { title: "Registered!" });
});

app.get("/register", function (req, res, next) {
  res.render("register", { title: "Register" });
});

app.get("/login", function (req, res, next) {
  res.render("login", { title: "RPS-Login" });
});

app.get("/", function (req, res, next) {
  res.render("index", { title: "RPS-Chat" });
});

const server = httpServer.listen(8080, function () {
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

const guest = [];

let last_choose = null; // last user that chose a rps option and compares
const duelists = {
  user: "",
};
//get id
let temp_id = 0;
db.one("SELECT COUNT(*) FROM temp_user")
  .then(function (data) {
    temp_id = Number(data.count);
  })
  .catch(function (error) {});
//socketio server event handling

io.sockets.on("connection", function (socket) {
  console.log("Socket " + socket.id + " connected.");

  socket.on("chat-loaded", function (data) {
    if (data != null) {
      guest.push(data);
    }
  });

  socket.on("start-session", function (data) {
    console.log("====start-session====");
    console.log(data);

    if (data.sessionId == null) {
      var session_id = uuid.uuid();
      io.emit("set-session-acknowledgement", { sessionId: session_id });
    }
  });

  socket.on("username", function (username) {
    socket.username = username;
    console.log(username + " has connected");
    io.emit("is_online", socket.username + " connected!");
    user[socket.username] = [];
    user[socket.username].push(socket.username);
    user[socket.username].push(null);
    user[socket.username].push(null);
    io.emit("reload-list", guest);
    //***temp add user to rps db if not in */
    db.none("SELECT user_name FROM temp_user WHERE user_name = $1", [
      socket.username,
    ])
      .then(function (data) {
        //success;"
        console.log("new user");
        console.log(temp_id);
        db.none("INSERT INTO temp_user(user_id, user_name) VALUES ($1, $2)", [
          temp_id,
          socket.username,
        ]);
        temp_id += 1;
      })
      .catch(function (error) {
        //error;
        console.log("user relogging");
      });
  });

  socket.on("disconnect", function (username) {
    io.emit("is_online", socket.username + " disconnected!");
    console.log("Socket ${socket.id} disconnected.");
    delete user[socket.username];

    const index = guest.indexOf(socket.username);

    if (index != -1) {
      guest.splice(index, 1);
    }
    io.emit("reload-list", guest);
    // io.close();
  });

  socket.on("chat_message", function (message) {
    io.emit(
      "chat_message",
      "<strong>" + socket.username + "</strong>: " + message
    );
  });

  //check duel
  socket.on("challenge", function (duelist) {
    duelists[duelist[0]] = duelist[1];
    duelists[duelist[1]] = duelist[0];
  });

  socket.on("challenge-check", function (user) {
    if (!(user[1] in duelists)) {
      io.sockets.emit("challenge-confirm", user);
    } else {
      console.log("user already challenged");
    }
  });

  function duel_rating(player1, player2) {
    return db
      .one("SELECT rating FROM reg_user WHERE user_name = $1", [player1])
      .then(function (data1) {
        return db
          .one("SELECT rating FROM reg_user WHERE user_name = $1", [player2])
          .then(function (data2) {
            //if player 1 has a larger rating data greater than 1, vice versa. therefore if player 2 wins while we keep this ratio
            return [
              Math.pow(data1.rating / data2.rating, 1.5),
              player1,
              player2,
            ];
          })
          .catch(function (error) {
            return [0.5, player1, player2];
          });
      })
      .catch(function (error) {
        return [0.5, player1, player2];
      });
  }
  // duel_rating(socket.username, duelists[socket.username])
  //   .then(function (data) {
  //     console.log(data);
  //   })
  //   .catch(function (data) {});

  socket.on("rps_option", function (option) {
    let optionname = "";
    if (option == 1) {
      optionname = "PAPER";
    } else if (option == 2) {
      optionname = "ROCK";
    } else {
      optionname = "SCISSORS";
    }
    // console.log(user);
    if (user[socket.username][1] != true) {
      io.emit(
        "chat_message",
        "<strong>" + socket.username + " has chosen!</strong>"
      );

      user[socket.username][1] = true;
      user[socket.username][2] = option;
      user[socket.username][3] = optionname;

      if (user[duelists[socket.username]][1]) {
        let winner = rps(
          user[duelists[socket.username]][2],
          user[socket.username][2]
        );
        if (winner == 1) {
          io.emit(
            "chat_message",
            "<strong>" +
              duelists[socket.username] +
              " beats " +
              socket.username +
              " by using " +
              user[duelists[socket.username]][3] +
              "</strong>"
          );
          //rating adjustment

          duel_rating(socket.username, duelists[socket.username])
            .then(function (data) {
              console.log(data);
              console.log("test");
              if (!data[2].includes("GUEST")) {
                db.one("SELECT rating FROM reg_user WHERE user_name = $1", [
                  data[2],
                ])
                  .then(function (data1) {
                    console.log(data1.rating + Math.floor(25 * data[0]));
                    db.none(
                      "UPDATE reg_user SET rating = $1 WHERE user_name = $2",
                      [data1.rating + Math.floor(25 * data[0]), data[2]]
                    )
                      .then(function (data2) {})
                      .catch(function (error) {});
                  })
                  .catch(function (error) {});
              }
              console.log("AAAAAAAAAA");
              if (!data[1].includes("GUEST")) {
                db.one("SELECT rating FROM reg_user WHERE user_name = $1", [
                  data[1],
                ])
                  .then(function (data1) {
                    db.none(
                      "UPDATE reg_user SET rating = $1 WHERE user_name = $2",
                      [data1.rating - Math.floor((25 * data[0]) / 2), data[1]]
                    )
                      .then(function (data2) {})
                      .catch(function (error) {});
                  })
                  .catch(function (error) {});
              }
            })
            .catch(function (error) {});

          io.sockets.emit("results", [
            duelists[socket.username],
            socket.username,
          ]);
        } else if (winner == 2) {
          io.emit(
            "chat_message",
            "<strong>" +
              socket.username +
              " beats " +
              duelists[socket.username] +
              " by using " +
              user[socket.username][3] +
              "</strong>"
          );

          //rating adjustment
          duel_rating(duelists[socket.username], socket.username)
            .then(function (data) {
              console.log(data);
              if (!data[2].includes("GUEST")) {
                db.one("SELECT rating FROM reg_user WHERE user_name = $1", [
                  data[2],
                ])
                  .then(function (data1) {
                    db.none(
                      "UPDATE reg_user SET rating = $1 WHERE user_name = $2",
                      [data1.rating + Math.floor(25 * data[0]), data[2]]
                    )
                      .then(function (data2) {})
                      .catch(function (error) {});
                  })
                  .catch(function (error) {});
              }

              if (!data[1].includes("GUEST")) {
                db.one("SELECT rating FROM reg_user WHERE user_name = $1", [
                  data[1],
                ])
                  .then(function (data1) {
                    db.none(
                      "UPDATE reg_user SET rating = $1 WHERE user_name = $2",
                      [data1.rating - Math.floor((25 * data[0]) / 2), data[1]]
                    )
                      .then(function (data2) {})
                      .catch(function (error) {});
                  })
                  .catch(function (error) {});
              }
            })
            .catch(function (error) {});

          io.sockets.emit("results", [
            socket.username,
            duelists[socket.username],
          ]);
        } else {
          io.emit(
            "chat_message",
            "<strong>It's a DRAW between " +
              duelists[socket.username] +
              " and " +
              socket.username +
              "!</strong>"
          );
          io.sockets.emit("results", [
            duelists[socket.username],
            socket.username,
          ]);
        }

        //reset after comparing rps
        user[duelists[socket.username]][1] = false;
        user[duelists[socket.username]][2] = null;
        user[duelists[socket.username]][3] = null;
        user[socket.username][1] = false;
        user[socket.username][2] = null;
        user[socket.username][3] = null;

        delete duelists[duelists[socket.username]];
        delete duelists[socket.username];
      }
    } else {
      console.log(socket.username + " has already chosen!");
    }
    // console.log(last_choose);
    // console.log(user);
  });

  //registration checking
  socket.on("registration_check", function (user_data) {
    db.none("SELECT user_name FROM reg_user WHERE user_name = $1", [
      user_data[0],
    ])
      .then(function (data) {
        db.none("SELECT email FROM reg_user WHERE email = $1", [user_data[2]])
          .then(function (data) {
            let reg_id = 0;
            db.one("SELECT COUNT(*) FROM reg_user")
              .then(function (data) {
                reg_id = data.count;
                console.log(reg_id);
                db.none(
                  "INSERT INTO reg_user(user_id, user_name, password, email, rating, wins, losses, draws) VALUES($1, $2, $3, $4, $5, $6, $7, $8)",
                  [
                    reg_id,
                    user_data[0],
                    user_data[1],
                    user_data[2],
                    500,
                    0,
                    0,
                    0,
                  ]
                );
                io.emit("registration_error", "SUCCESS");
              })
              .catch(function (error) {});
          })
          .catch(function (error) {
            io.emit(
              "registration_error",
              "There is already an account under that email."
            );
            console.log("email taken");
          });
      })
      .catch(function (error) {
        io.emit("registration_error", "That Username is taken.");
        console.log("username taken");
      });
  });

  //login checking
  socket.on("login_check", function (login_data) {
    db.one("SELECT user_name FROM reg_user WHERE user_name = $1", [
      login_data[0],
    ])
      .then(function (data) {
        // socket.emit("acc_username", data.user_name);
        db.one("SELECT password FROM reg_user WHERE password = $1", [
          login_data[1],
        ])
          .then(function (data) {
            console.log("SUCCESS");
            io.emit("login_response", "SUCCESS");
          })
          .catch(function (error) {
            io.emit("login_response", "ERROR");
          });
      })
      .catch(function (error) {
        io.emit("login_response", "ERROR");
      });
  });

  // //load leaderboard
  // socket.on("leaderboard", function (page) {
  //   //return number of users
  //   user_num()
  //     .then(function (data) {
  //       io.emit("num_pages", 1 + data / 20);
  //     })
  //     .catch(function (error) {});
  //   //get all users and ratings
  //   db.many(
  //     "SELECT user_name, rating FROM reg_user ORDER BY rating DESC, user_name"
  //   )
  //     .then(function (data) {
  //       if (data.length - 20 * (page - 1) > 20) {
  //         io.emit("leaderboard-data", data.slice(20 * (page - 1), 20 * page));
  //       } else {
  //         io.emit("leaderboard-data", data.slice(20 * (page - 1), data.length));
  //       }
  //     })
  //     .catch(function (error) {});
  // });

  //guest handling
  socket.on("guest", function (data) {
    let guestname = "GUEST#" + Math.floor(Math.random() * 10000).toString();
    while (guest.includes(guestname)) {
      guestname = "GUEST#" + Math.floor(Math.random() * 10000).toString();
    }

    guest.push(guestname);
    socket.emit("guest-name", guestname);
  });

  // socket.on("chat-loaded", function (data) {
  //   console.log(guest);
  //   socket.emit("login-list", guest);
  // });
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
