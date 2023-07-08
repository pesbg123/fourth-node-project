const jwt = require('jsonwebtoken'); // 'jsonwebtoken' 모듈을 가져옵니다. (jwt를 사용하기 위해 필요)
const { Users } = require('../models');
require('dotenv').config();
const env = process.env;

// 사용자 인증 미들웨어
module.exports = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies; // 요청의 쿠키에서 accessToken과 refreshToken를 가져옵니다.
  // 인증 토큰이 없을 경우
  if (!accessToken || !refreshToken) {
    res.status(401).send({
      errorMessage: '로그인 후 이용 가능한 기능입니다.', // 에러 메시지를 응답으로 보내고, 상태 코드 401로 설정합니다.
    });
    return;
  }

  try {
    const decodedToken = jwt.verify(accessToken, env.ACCESS_TOKEN_KEY);

    const thisUser = await Users.findOne({
      where: { userId: decodedToken.userId },
    }); // 추출한 사용자 ID를 사용하여 데이터베이스에서 사용자를 조회합니다.
    res.locals.user = thisUser; // 조회된 사용자 정보를 응답 로컬 변수에 저장합니다.
    next(); // 다음 미들웨어로 넘어갑니다.
  } catch (err) {
    console.error(err);
    res.status(401).send({
      errorMessage: '로그인 후 이용 가능한 기능입니다.', // 에러 메시지를 응답으로 보내고, 상태 코드 401(Unauthorized)를 설정합니다.
    });
  }
};
