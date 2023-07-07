const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const authMiddleware = require('../middlewares/auth-middleware.js');
const { Posts, Comments } = require('../models');

// 댓글 목록 조회 API
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Posts.findOne({
      where: { postId },
    });
    const comments = await Comments.findAll({
      where: { postId },
      order: [['createdAt', 'desc']], // 작성날짜 기준으로 내림차순 정렬
    });

    // 게시물의 존재 여부를 확인합니다.
    if (!post) {
      return res.status(404).json({ error: '게시물이 존재하지 않습니다.' });
    }
    // 댓글의 존재 여부를 확인합니다.
    if (!comments) {
      return res.status(404).json({ error: '댓글이 존재하지 않습니다.' });
    }
    //
    res.status(200).json({ data: comments });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ error: '댓글 조회에 실패했습니다.' });
  }
});

// 댓글 생성 API
router.post('/posts/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const { userId } = res.locals.user;

    // body에서 받은 댓글 데이터가 비어있는 경우
    if (!content) {
      return res.status(400).json({ errorMessage: '댓글을 입력해주세요.' });
    }
    // 댓글을 생성합니다.
    await Comments.create({
      UserId: userId,
      PostId: postId,
      content,
    });
    // 확인 메시지를 응답합니다.
    res.status(200).json({ message: '댓글을 생성했습니다.' });
  } catch (error) {
    console.log(error);

    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '댓글 생성에 실패했습니다.' });
  }
});

// // 댓글 수정 API
// router.patch('/posts/:postId/comments', authMiddleware, async (req, res) => {
//   const
// });
module.exports = router; // router 모듈을 외부로 내보냅니다.
