const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authMiddleware = require('../middlewares/auth-middleware.js');

const { Posts, Likes, Users } = require('../models');

// 좋아요 등록한 게시물들 조회 API
// 경로 /pots/like로 할시에 알 수 없는 에러가 계속떠서, 해결 못 했습니다...
router.get('/like', authMiddleware, async (req, res) => {
  try {
    const { userId } = res.locals.user;
    // 로그인한 해당 사용자가 좋아요 관계를 가져옵니다.
    const likes = await Likes.findAll({
      where: { UserId: userId },
      include: [
        {
          model: Users,
          attributes: ['nickname'],
        },
        {
          model: Posts,
          attributes: ['title', 'content', 'createdAt', 'updatedAt'],
        },
      ],
      order: [['createdAt', 'desc']],
    });
    // 좋아요를 등록한 게시글이 존재하지 않을 경우
    if (!likes.length) {
      return res
        .status(404)
        .json({ errorMessage: '좋아요를 등록한 게시글이 존재하지 않습니다.' });
    }

    // 데이터 형식을 변경합니다.
    const modifiedLikes = await Promise.all(
      // 모든 게시글에 대한 좋아요 수를 한 번에 얻기위해
      // Promise.all()을 사용해서 like.map()에서 반환된 모든 프로미스가
      // 완료될 때까지 기다리고 그 반환값을 반환합니다.
      likes.map(async (like) => {
        const postId = like.PostId;
        const postLikes = await Likes.count({ where: { PostId: postId } });
        // modifiedLikes 변수로 반환됩니다.
        return {
          postId,
          likerUserId: like.UserId,
          likersNickname: like.User.nickname,
          postTitle: like.Post.title,
          postCreatedAt: like.Post.createdAt,
          postUpdatedAt: like.Post.updatedAt,
          postLikes,
        };
      })
    );
    // 좋아요 갯수별로 내림차순 정렬을위해 sort()메서드 사용
    const sortedLikes = modifiedLikes.sort((a, b) => b.postLikes - a.postLikes);
    // 성공 메시지를 응답합니다.
    res.status(200).json({ data: sortedLikes });
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '좋아요 조회에 실패했습니다.' });
  }
});

// 좋아요 등록, 취소 API
router.put('/posts/:postId/like', authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { userId } = res.locals.user;
  // 해당 게시글에 해당 유저가 좋아요를 눌렀는지 확인합니다.
  const checkLike = await Likes.findOne({
    where: {
      [Op.and]: [{ UserId: userId }, { PostId: postId }],
    },
  });

  try {
    // 좋아요를 누른적이 없는 경우 좋아요를 등록합니다.
    if (!checkLike) {
      Likes.create({
        UserId: userId,
        PostId: postId,
      });
      // 성공 메시지를 응답합니다.
      return res
        .status(200)
        .json({ errorMessage: '좋아요 등록에 성공했습니다.' });
    }
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '좋아요 등록에 실패했습니다.' });
  }

  try {
    // 좋아요를 눌렀었다면 좋아요를 취소합니다.
    if (checkLike) {
      Likes.destroy({
        where: {
          [Op.and]: [{ PostId: postId }, { UserId: userId }],
        },
      });
      // 성공 메시지를 응답합니다.
      return res
        .status(200)
        .json({ errorMessage: '좋아요 취소에 성공했습니다.' });
    }
  } catch (error) {
    // 에러 메시지를 응답합니다.
    res.status(500).json({ errorMessage: '좋아요 취소에 실패했습니다.' });
  }
});

module.exports = router; // router 모듈을 외부로 내보냅니다.
