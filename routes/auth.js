const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const env = process.env;

const { Users } = require('../models');

// 액세스 토큰 발급
const generateAccessToken = (userId) => {
  return jwt.sign({ userId: userId }, env.ACCESS_TOKEN_KEY, {
    expiresIn: '1h',
  });
};
// 리프레시 토큰 발급
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId: userId }, env.REFRESH_TOKEN_KEY, {
    expiresIn: '7d',
  });
};

// 로그인 API
router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    const { refreshToken, accessToken } = req.cookies;

    // refreshToken이 존재하지 않을 경우
    if (!refreshToken) {
      const thisUser = await Users.findOne({ where: { nickname } });
      res.clearCookie('refreshToken');
      const userId = thisUser.userId;
      // 패스워드 복호화
      const decodePw = await bcrypt.compare(password, thisUser.password);
      // body에서 받아온 password와 복호화 한 password가 일치하는지 검사합니다.
      if (!decodePw) {
        return res
          .status(400)
          .json({ errorMessage: '패스워드가 일치하지 않습니다.' });
      }
      // accessToken과 refreshToken을 변수에 할당합니다.
      const saveAccessTokenCookie = generateAccessToken(userId);
      const saveRefreshTokenCookie = generateRefreshToken(userId);
      // 쿠키에 accessToken과 refreshToken을 저장합니다.
      return res
        .cookie('accessToken', saveAccessTokenCookie)
        .cookie('refreshToken', saveRefreshTokenCookie)
        .status(200)
        .json({ message: '로그인이 완료 되었습니다. ' });
    }

    try {
      // refreshToken이 존재하지 않을경우
      jwt.verify(refreshToken, env.REFRESH_TOKEN_KEY);
    } catch (error) {
      // error name이 TokenExpiredError일 경우
      if (error.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.decode(refreshToken);
        const userId = decodedRefreshToken.userId;

        // accessToken과 refreshToken을 변수에 할당합니다.
        const newSaveAccessTokenCookie = generateAccessToken(userId);
        const newSaveRefreshTokenCookie = generateRefreshToken(userId);
        // 쿠키에 accessToken과 refreshToken을 저장합니다.
        res.cookie('accessToken', newSaveAccessTokenCookie);
        res.cookie('refreshToken', newSaveRefreshTokenCookie);
        // 성공 리스폰스값 반환
        return res
          .cookie('accessToken', newSaveAccessTokenCookie)
          .cookie('refreshToken', newSaveRefreshTokenCookie)
          .status(200)
          .json({ message: 'ACCESS TOKEN과 REFRESH TOKEN이 갱신되었습니다.' });
      }
    }

    try {
      // accessToken만 만료되었을 경우
      jwt.verify(req.cookies.accessToken, env.ACCESS_TOKEN_KEY);
    } catch (err) {
      // err name이 TokenExpiredError일 경우
      if (err.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.decode(refreshToken);
        const userId = decodedRefreshToken.userId;

        const newSaveAccessTokenCookie = generateAccessToken(userId);
        // 성공 리스폰스값 반환
        // httpOnly:true를 사용해 클라이언트에서 js로 쿠키에 접근할 수 없게 합니다.
        return res
          .cookie('accessToken', newSaveAccessTokenCookie, { httpOnly: true })
          .status(200)
          .json({ message: 'ACCESS TOKEN이 갱신되었습니다.' });
      }
    }

    try {
      // refreshToken만 만료되었을 경우
      jwt.verify(req.cookies.refreshToken, env.REFRESH_TOKEN_KEY);
    } catch (error) {
      // error name이 TokenExpiredError일 경우
      if (error.name === 'TokenExpiredError') {
        const decodedAccessToken = jwt.decode(accessToken);
        const userId = decodedAccessToken.userId;
        const newSaveRefreshTokenCookie = generateRefreshToken(userId);
        // 성공 리스폰스값 반환
        // httpOnly:true를 사용해 클라이언트에서 js로 쿠키에 접근할 수 없게 합니다.
        return res
          .cookie('accessToken', newSaveRefreshTokenCookie, { httpOnly: true })
          .status(200)
          .json({ message: 'ACCESS TOKEN이 갱신되었습니다.' });
      }
    }
    // accessToken과 refreshToken이 모두 유효한 경우
    if (refreshToken) {
      const decodedRefreshToken = jwt.decode(refreshToken);
      const userId = decodedRefreshToken.userId;
      res.status(200).json({
        userId,
        message: 'accessToken과 refreshToken이 유효한 상태입니다.',
      });
    }
  } catch (error) {
    res.status(500).json({ errorMessage: '로그인에 실패했습니다.' });
  }
});

// 로그아웃 API
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: '로그아웃되었습니다.' });
});

module.exports = router; // router 모듈을 외부로 내보냅니다.
