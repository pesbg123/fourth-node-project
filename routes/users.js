const express = require('express');
const router = express.Router();
const { Users } = require('../models');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// 회원가입 API
router.post('/signup', async (req, res) => {
  try {
    const { nickname, password, confirmPassword } = req.body;

    // nickname, password가 존재하는지 검사합니다.
    if (!nickname || !password) {
      return res
        .status(401)
        .json({ errorMessage: '닉네임과, 패스워드를 입력해주세요' });
    }
    // 닉네임이 현재 중복되는지 검사합니다.
    const DuplicateNickname = await Users.findOne({
      where: {
        nickname,
      },
    });
    // 닉네임과 같은 값이 존재하는지 검사합니다.

    // password와 confirmPassword가 일치하는지 검사합니다.
    if (password !== confirmPassword) {
      return res.status(400).json({
        errorMessage: '패스워드와 패스워드 확인이 일치하지 않습니다.',
      });
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
    // 에러 출력
    console.log(error);

    res.status(500).json({ errorMessage: '회원가입에 실패했습니다.' });
  }
});

module.exports = router; // router 모듈을 외부로 내보냅니다.
