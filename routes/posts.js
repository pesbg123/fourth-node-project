const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const authMiddleware = require('../middlewares/auth-middleware.js');
const { Posts, Users, Likes } = require('../models');

// 전체 게시글 조회 API
router.get('/posts', async (req, res) => {
  try {
    // include를 사용해서 Users모델에 있는 nickname을 같이 가져옵니다.
    const posts = await Posts.findAll({
      include: [{ model: Users, attributes: ['nickname'] }],
      attributes: ['title', 'createdAt', 'postId', 'updatedAt'],
      order: [['createdAt', 'desc']], // 작성날짜 기준으로 내림차순 정렬
    });

    // 게시글의 존재 여부를 확인합니다.
    if (!posts.length) {
      res.status(404).json({ errorMessage: '존재하는 게시글이 없습니다.' });
      return; // 추가된 return 문을 통해 함수 실행 종료
    }
    // 데이터 형식을 변경합니다.
    const modifiedPosts = await Promise.all(
      // 모든 게시글에 대한 좋아요 수를 한 번에 얻기위해
      // Promise.all()을 사용해서 like.map()에서 반환된 모든 프로미스가
      // 완료될 때까지 기다리고 그 반환값을 반환합니다.
      posts.map(async (post) => {
        const postId = post.postId;
        const postLikes = await Likes.count({ where: { PostId: postId } });
        // modifiedLikes 변수로 반환됩니다.
        return {
          postId: post.postId,
          nickname: post.User.nickname,
          title: post.title,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          postLikes: postLikes,
        };
      })
    );
    // 조회한 게시글들을 응답합니다.
    res.status(200).json({ data: modifiedPosts });
  } catch (error) {
    // 오류가 발생한 경우 오류 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '게시글 조회에 실패했습니다.' });
  }
});

// 게시글 상세 조회 API
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    // include를 사용해서 Users모델에 있는 nickname을 같이 가져옵니다.
    const getTargetPost = await Posts.findOne({
      where: { postId },
      attributes: ['title', 'createdAt', 'updatedAt', 'postId'],
      include: [
        {
          model: Users,
          attributes: ['nickname'],
        },
      ],
    });

    if (!getTargetPost) {
      // 게시글이 존재하지 않을 경우
      return res
        .status(404)
        .json({ errorMessage: '해당 게시글이 존재하지 않습니다.' });
    }
    // 게시글이 존재한다면 응답 데이터 형식 변경
    const modifiedPost = {
      postId: getTargetPost.postId,
      nickname: getTargetPost.User.nickname,
      title: getTargetPost.title,
      createdAt: getTargetPost.createdAt,
      updatedAt: getTargetPost.updatedAt,
    };
    // 확인 메시지를 응답합니다.
    res.status(200).json({ data: modifiedPost });
  } catch (error) {
    // 오류가 발생한 경우 오류 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '게시글 상세조회에 실패했습니다.' });
  }
});

// 게시글 작성 API - 로그인 한 사용자만 작성할 수 있게 authMiddleware사용
router.post('/posts', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const { userId } = res.locals.user;

    // body로 가져온 데이터가 존재하지 않을 경우
    if (!title || !content) {
      return res
        .status(400)
        .json({ errorMessage: '제목이나 본문을 입력해주세요.' });
    }

    // 새로운 게시글을 생성합니다.
    await Posts.create({
      UserId: userId,
      title,
      content,
    });
    // 확인 메시지를 응답합니다.
    return res.status(201).json({ message: '게시글을 생성하였습니다.' });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '게시글 작성에 실패했습니다.' });
  }
});

// 게시글 수정 API - 로그인 한 사용자가 본인 게시글만 수정할 수 있게 구현했습니다.

router.patch('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const { postId } = req.params;
    const { userId } = res.locals.user;

    const post = await Posts.findOne({ where: { postId } });

    // 본인이 작성한 게시글인지 확인합니다.
    if (post.UserId !== userId) {
      return res
        .status(403)
        .json({ errorMessage: '본인이 작성한 게시글만 수정할 수 있습니다.' });
    }
    // 수정사항을 업데이트 합니다.
    if (title) post.update({ title });
    if (content) post.update({ content });
    // 확인 메시지를 응답합니다.
    return res.status(202).json({ message: '게시글 수정에 성공했습니다.' });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '게시글 수정에 실패했습니다.' });
  }
});

// 게시글 삭제 API - 로그인한 사용자가 본인 게시글만 삭제 할 수 있게 구현했습니다.
router.delete('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = res.locals.user;
    const post = await Posts.findOne({ where: { postId } });

    // 해당 게시글이 존재하지 않을 경우
    if (!post) {
      return res
        .status(404)
        .json({ errorMessage: '해당 게시글이 존재하지 않습니다.' });
    }
    // 본인이 작성한 게시글이 아닐 경우
    if (post.UserId !== userId) {
      return res
        .status(403)
        .json({ errorMessage: '본인이 작성한 게시글만 삭제할 수 있습니다.' });
    }

    // 게시글을 삭제합니다.
    post.destroy({
      where: {
        [Op.and]: [{ postId: post.postId }, { UserId: post.UserId }],
      },
    });
    // 확인 메시지를 응답합니다.
    res.status(200).json({ message: '게시글 삭제에 성공했습니다.' });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '게시글 삭제에 실패했습니다.' });
  }
});
module.exports = router; // router 모듈을 외부로 내보냅니다.
