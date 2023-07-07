const express = require('express');
const router = express.Router();
const { Users } = require('../models');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// 회원가입 API
router.post('/signup', async (req, res) => {
  try {
    const { nickname, password, confirmPassword } = req.body;

    // 정규 표현식을 사용해서 닉네임이 영어와 숫자로 이루어 졌는지 검사 합니다.
    if (!nickname.match(/^[a-zA-Z0-9]{3,50}$/)) {
      // 에러 메시지를 응답합니다.
      return res.status(400).json({
        error: '닉네임은 영어나 숫자로만 이루어지게 작성해 주세요.',
      });
    }

    // 패스워드 유효성 검사
    if (password.length < 4) {
      return res.status(400).json({
        // 에러 메시지를 응답합니다.
        error: '패스워드를 4글자 이상 작성해 주세요.',
      });
    }
    if (password.includes(nickname)) {
      return res.status(400).json({
        // 에러 메시지를 응답합니다.
        error: '닉네임이 패스워드에 포함될 수 없습니다.',
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        // 에러 메시지를 응답합니다.
        error: '패스워드와 전달된 패스워드 확인값이 일치하지 않습니다.',
      });
    }
    // nickname 기준으로 DB에 검색합니다.
    const DuplicateNickname = await Users.findOne({
      where: {
        nickname,
      },
    });

    // password와 confirmPassword가 일치하는지 검사합니다.
    if (password !== confirmPassword) {
      return res.status(400).json({
        errorMessage: '패스워드와 패스워드 확인이 일치하지 않습니다.',
      });
    }
    // 닉네임이 중복되는지 검사합니다.
    if (DuplicateNickname) {
      return res
        .status(400)
        .json({ errorMessage: '닉네임이 이미 사용중입니다.' });
    }
    // 비밀번호 암호화
    const EncryptionPW = bcrypt.hashSync(password, saltRounds);

    // 닉네임, 패스워드를 DB에 저장합니다.
    await Users.create({
      password: EncryptionPW,
      nickname,
    });
    // 성공 메시지 출력
    res.status(202).json({ message: '회원가입에 성공했습니다.' });
  } catch (error) {
    res.status(500).json({ errorMessage: '회원가입에 실패했습니다.' });
  }
});

module.exports = router; // router 모듈을 외부로 내보냅니다.
