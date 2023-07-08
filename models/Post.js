const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: String,
    summary: String,
    content: String,
    file: String,
    author: { type: mongoose.Schema.ObjectId, ref: "User" },
  },
  {
    timestamps: true, //setting timestamps to true we can have access to the time of created document
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
