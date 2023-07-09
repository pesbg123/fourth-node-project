const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const authMiddleware = require('../middlewares/auth-middleware.js');
const { Posts, Comments, Users } = require('../models');

// 댓글 목록 조회 API
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Posts.findOne({
      where: { postId },
    });
    // include를 사용해서 Users모델에 있는 nickname을 같이 가져옵니다.
    const comments = await Comments.findAll({
      where: { postId },
      include: { model: Users, attributes: ['nickname'] },
      attributes: ['commentId', 'content', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'desc']], // 작성날짜 기준으로 내림차순 정렬
    });

    // 게시글의 존재 여부를 확인합니다.
    if (!post) {
      return res
        .status(404)
        .json({ errorMessage: '게시글이 존재하지 않습니다.' });
    }
    // 댓글의 존재 여부를 확인합니다.
    if (!comments.length) {
      return res
        .status(404)
        .json({ errorMessage: '댓글이 존재하지 않습니다.' });
    }
    // 데이터 형식 변경
    const modifiedComments = comments.map((comment) => ({
      commentId: comment.commentId,
      nickname: comment.User.nickname,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
    // 확인 메시지를 응답합니다.
    res.status(200).json({ data: modifiedComments });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '댓글 조회에 실패했습니다.' });
  }
});

// 댓글 생성 API
router.post('/posts/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const { userId } = res.locals.user;
    const post = await Posts.findOne({ where: { postId } });
    // body에서 받은 댓글 데이터가 비어있는 경우
    if (!content) {
      return res.status(400).json({ errorMessage: '댓글을 입력해주세요.' });
    }
    // 해당 게시글이 존재하지 않을 경우
    if (!post) {
      return res
        .status(404)
        .json({ errorMessage: '해당 게시글이 존재하지 않습니다.' });
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
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '댓글 생성에 실패했습니다.' });
  }
});

// 댓글 수정 API (로그인 한 사용자가 본인이 작성한 댓글만 수정할 수 있게 authMiddleware사용)
router.put(
  '/posts/:postId/comments/:commentId',
  authMiddleware,
  async (req, res) => {
    try {
      const { content } = req.body;
      const { postId, commentId } = req.params;
      const { userId } = res.locals.user;

      // 게시글의 존재 여부를 확인합니다.
      const post = await Posts.findOne({ where: { postId } });
      if (!post) {
        return res
          .status(404)
          .json({ errorMessage: '게시글을 찾을 수 없습니다.' });
      }
      // 코멘트의 존재 여부를 확인합니다.
      const comment = await Comments.findOne({ where: { commentId } });
      if (!comment) {
        return res
          .status(404)
          .json({ errorMessage: '코멘트를 찾을 수 없습니다.' });
      }
      // 사용자 본인이 작성한 코멘트인지 검사합니다.
      if (userId !== comment.UserId) {
        return res
          .status(400)
          .json({ errorMessage: '본인이 작성한 댓글만 수정할 수 있습니다.' });
      }
      // 입력된 코멘트 값의 유효성을 검사합니다.
      if (!content) {
        return res.status(404).json({ errorMessage: '코멘트를 입력해주세요.' });
      }
      /// 코멘트를 업데이트합니다.
      await comment.update({ content });
      // 확인 메시지를 응답합니다.
      res.status(200).json({ message: '댓글을 수정하였습니다.' });
    } catch (error) {
      // 에러 메시지를 응답합니다.
      res.status(500).json({ errorMessage: '댓글 수정에 실패했습니다.' });
    }
  }
);

// 댓글 삭제 API (로그인 한 사용자가 본인이 작성한 댓글만 삭제할 수 있게 authMiddleware사용)
router.delete(
  '/posts/:postId/comments/:commentId',
  authMiddleware,
  async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { userId } = res.locals.user;

      // 게시글의 존재 여부를 확인합니다.
      const post = await Posts.findOne({ where: { postId } });
      if (!post) {
        return res
          .status(404)
          .json({ errorMessage: '게시글을 찾을 수 없습니다.' });
      }
      // 코멘트의 존재 여부를 확인합니다.
      const comment = await Comments.findOne({ where: { commentId } });
      if (!comment) {
        return res
          .status(404)
          .json({ errorMessage: '코멘트를 찾을 수 없습니다.' });
      }
      // // 사용자 본인이 작성한 코멘트인지 검사합니다.
      if (userId !== comment.UserId) {
        return res
          .status(400)
          .json({ errorMessage: '본인이 작성한 댓글만 삭제할 수 있습니다.' });
      }
      // 코멘트를 삭제합니다.
      await Comments.destroy({
        where: {
          [Op.and]: [
            { commentId }, // commentId를 기준으로 삭제할 댓글을 지정합니다.
            { UserId: userId }, // userId를 기준으로 삭제할 댓글을 지정합니다.
          ],
        },
      });
      // 확인 메시지를 응답합니다.
      res.status(200).json({ message: '댓글을 삭제하였습니다.' });
    } catch (error) {
      // 에러 메시지를 응답합니다.
      res.status(500).json({ errorMessage: '댓글 삭제에 실패했습니다.' });
    }
  }
);
module.exports = router; // router 모듈을 외부로 내보냅니다.
