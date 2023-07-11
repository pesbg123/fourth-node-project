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
    expiresIn: '1h', // 만료시간 1시간
  });
};
// 리프레시 토큰 발급
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId: userId }, env.REFRESH_TOKEN_KEY, {
    expiresIn: '7d', // 만료시간 7일
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
      // nickname이 일치하지 않는 경우
      if (!thisUser) {
        return res
          .status(400)
          .json({ errorMessage: '닉네임이 일치하지 않습니다.' });
      }
      // 패스워드 복호화
      const decodePw = await bcrypt.compare(password, thisUser.password);
      // body에서 받아온 password와 복호화한 password가 일치하는지 검사합니다.
      if (!decodePw) {
        return res
          .status(400)
          .json({ errorMessage: '패스워드가 일치하지 않습니다.' });
      }
      // 사용자 ID를 가져옵니다.
      const userId = thisUser.userId;
      // accessToken과 refreshToken을 변수에 할당합니다.
      const saveAccessTokenCookie = generateAccessToken(userId);
      const saveRefreshTokenCookie = generateRefreshToken(userId);
      // 쿠키에 accessToken과 refreshToken을 저장합니다.
      res.cookie('accessToken', saveAccessTokenCookie);
      res.cookie('refreshToken', saveRefreshTokenCookie);
      // 성공 메시지를 응답합니다.
      return res.status(200).json({ message: '로그인이 완료되었습니다.' });
    }

    // refreshToken이 존재하지 않고, error name이 TokenExpiredError일 경우
    try {
      jwt.verify(refreshToken, env.REFRESH_TOKEN_KEY);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.decode(refreshToken);
        const userId = decodedRefreshToken.userId;
        // 새로운 accessToken과 refreshToken을 발급합니다.
        const newSaveAccessTokenCookie = generateAccessToken(userId);
        const newSaveRefreshTokenCookie = generateRefreshToken(userId);
        // 쿠키에 accessToken과 refreshToken을 저장합니다.
        res.cookie('accessToken', newSaveAccessTokenCookie);
        res.cookie('refreshToken', newSaveRefreshTokenCookie);
        // 성공 메시지를 응답합니다.
        return res.status(200).json({
          message: 'ACCESS TOKEN과 REFRESH TOKEN이 갱신되었습니다.',
          message: '로그인이 완료되었습니다.',
        });
      }
    }

    // accessToken만 만료되었고, error name이 TokenExpiredError일 경우
    try {
      jwt.verify(accessToken, env.ACCESS_TOKEN_KEY);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        const decodedRefreshToken = jwt.decode(refreshToken);
        const userId = decodedRefreshToken.userId;
        // 새로운 accessToken을 발급합니다.
        const newSaveAccessTokenCookie = generateAccessToken(userId);
        // 성공 메시지를 응답합니다.
        return res
          .cookie('accessToken', newSaveAccessTokenCookie, { httpOnly: true })
          .status(200)
          .json({
            message: 'ACCESS TOKEN이 갱신되었습니다.',
            message: '로그인이 완료되었습니다.',
          });
      }
    }

    // refreshToken만 만료되었고, error name이 TokenExpiredError일 경우
    try {
      jwt.verify(refreshToken, env.REFRESH_TOKEN_KEY);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const decodedAccessToken = jwt.decode(accessToken);
        const userId = decodedAccessToken.userId;
        // 새로운 refreshToken을 발급합니다.
        const newSaveRefreshTokenCookie = generateRefreshToken(userId);
        // 성공 메시지를 응답합니다.
        return res
          .cookie('accessToken', newSaveRefreshTokenCookie, { httpOnly: true })
          .status(200)
          .json({
            message: 'REFRESH TOKEN이 갱신되었습니다.',
            message: '로그인이 완료되었습니다.',
          });
      }
    }

    // accessToken과 refreshToken이 모두 유효한 경우
    if (refreshToken) {
      const decodedRefreshToken = jwt.decode(refreshToken);
      const userId = decodedRefreshToken.userId;
      // 성공 메시지를 응답합니다.
      return res.status(200).json({
        userId,
        message: 'accessToken과 refreshToken이 유효한 상태입니다.',
        message: '현재 로그인 상태입니다.',
      });
    }
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '로그인에 실패했습니다.' });
  }
});

// 로그아웃 API
router.post('/logout', (req, res) => {
  // 쿠키에서 accessToken과 refreshToken을 제거합니다.
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  // 성공 메시지를 응답합니다.
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

module.exports = router; // router 모듈을 외부로 내보냅니다.
