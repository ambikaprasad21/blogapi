const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Post = require("./models/Post");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

const app = express();

// In order to encrypt password we need to have a salt
// const salt = "lasjdfoislvjoaijljopklaj;oifj";
//We can even generate salt with the help of bcrypt
let salt;
bcrypt.genSalt(10).then((salt) => (salt = salt)); //genSalt method returns a promise so we need to add then method.

// secret key for  creating session token jwt
const secret = "my-ultra-extra-long-secret";

app.use(cors({ credentials: true, origin: "https://blogbest.netlify.app" })); //if you are including credentials then you need to specify something more in cors
app.use(express.json());

// cookie-parser
app.use(cookieParser());

// adding a express.static middleware for getting image from uplaod file to UI
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose
  .connect(
    "mongodb+srv://ambika:sgTuOkLyfz7xDyuL@cluster0.m27f8sp.mongodb.net/newblog?retryWrites=true&w=majority"
  )
  .then(() => console.log("Database connectd successfuly!"));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    //doing try catch to catch error if user is not unique
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt), //storing hash of password instead of plain password
    });

    res.json(userDoc);
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    //doing try catch to catch error if user is not unique
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt), //storing hash of password instead of plain password
    });

    res.json(userDoc);
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const userDoc = await User.findOne({ username });
  const err = { status: "fail", err: "User not registered" };

  if (!userDoc) return res.json(err);

  // const err = { message: "User is not registered" };
  // if (!userDoc) res.json(err);

  // To compare hash stored in database with the current entered password

  const passOk = bcrypt.compareSync(password, userDoc?.password); //it's result will be true or false

  if (passOk) {
    //if credentials are correct then we want to create a token
    //logged in
    // we will create token and this token will have encrypted information about the user. That information belong to user
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;

      res.cookie("token", token).json({ id: userDoc._id, username });
    });
    // res.json();
  } else {
    res.status(400).json("Wrong credentials");
  }
});

// anyone can set cookie in browser so we need to verify the token.
app.get("/profile", (req, res) => {
  const { token } = req.cookies; // and after getting the token we try to read token. It is a jwt token which contains username and id. We can only read token if we have secret key.
  //reading the data from token this can only be done at backend
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.json("There was not a valid jwt token");
    res.json(info);
  });

  // res.json(req.cookies);
});

app.post("/logout", (req, res) => {
  res.cookie("token", "loggedout").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      file: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);

    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("you are not the author");
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      file: newPath ? newPath : postDoc.file,
    });

    res.json(postDoc);
  });
});

app.get("/posts", async (req, res) => {
  const posts = await Post.find().populate("author", ["username"]);
  res.json(posts);
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  // debugger;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(8002, () => {
  console.log("server running on port 8002");
});
