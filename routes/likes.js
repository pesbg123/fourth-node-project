const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authMiddleware = require('../middlewares/auth-middleware.js');

const { Posts, Comments } = require('../models');

module.exports = router; // router 모듈을 외부로 내보냅니다.
