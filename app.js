const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

const usersRouter = require('./routes/users.js');
const authRouter = require('./routes/auth.js');
const postRouter = require('./routes/posts.js');
const commentRouter = require('./routes/comments.js');
const likeRouter = require('./routes/likes.js');

app.use(express.json());
app.use(cookieParser());

app.use('/api', [
  usersRouter,
  authRouter,
  postRouter,
  commentRouter,
  likeRouter,
]);

app.listen(PORT, () => {
  console.log(`${PORT}번 포트로 서버가 열렸습니다.`);
});
