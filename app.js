const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 3000;

const usersRouter = require('./routes/users.js');
const authRouter = require('./routes/auth.js');

app.use(express.json());
app.use(cookieParser());

app.use('/api', [usersRouter, authRouter]);

app.listen(PORT, () => {
  console.log(`${PORT}번 포트로 서버가 열렸습니다.`);
});
