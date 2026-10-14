const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { isAllowedImageUrl } = require('../utils/imageUrls');

router.post('/create', auth, async (req, res) => {
  try {
    const { content, mediaUrl, title, kind } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const KINDS = ['update', 'article', 'site_update', 'opinion', 'project'];
    const post = new Post({
      author: req.userId,
      content: String(content).trim().slice(0, 5000),
      title: String(title || '').trim().slice(0, 160),
      kind: KINDS.includes(kind) ? kind : 'update',
      mediaUrl: isAllowedImageUrl(mediaUrl) ? mediaUrl : ''
    });

    await post.save();
    await post.populate('author', 'name profilePic');

    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post', message: error.message });
  }
});

router.get('/feed', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.userId);
    const connectionIds = currentUser.connections;

    const posts = await Post.find({
      $or: [
        { author: req.userId },
        { author: { $in: connectionIds } }
      ]
    })
    .populate('author', 'name profilePic role')
    .populate('comments.author', 'name profilePic')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Post.countDocuments({
      $or: [
        { author: req.userId },
        { author: { $in: connectionIds } }
      ]
    });

    res.json({ 
      posts, 
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed', message: error.message });
  }
});

const COMMENT_AUTHOR = 'name username profilePic headline';
const commentOut = (c) => ({ _id: c._id, text: c.text, createdAt: c.createdAt, author: c.author });

// Like or unlike: returns the new state and count
router.post('/:postId/like', auth, async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/.test(req.params.postId)) return res.status(404).json({ error: 'Post not found' });
    const post = await Post.findById(req.params.postId).select('likes');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const liked = post.likes.some((id) => String(id) === String(req.userId));
    const updated = await Post.findByIdAndUpdate(
      post._id,
      liked ? { $pull: { likes: req.userId } } : { $addToSet: { likes: req.userId } },
      { new: true }
    ).select('likes');
    res.json({ liked: !liked, likes: updated.likes.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like post', message: error.message });
  }
});

// Comments on a post, oldest first
router.get('/:postId/comments', auth, async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/.test(req.params.postId)) return res.status(404).json({ error: 'Post not found' });
    const post = await Post.findById(req.params.postId).select('author comments').populate('comments.author', COMMENT_AUTHOR).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ comments: (post.comments || []).filter((c) => c.author).map(commentOut), postAuthor: post.author });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load comments', message: error.message });
  }
});

router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    if (text.length > 1000) return res.status(400).json({ error: 'Keep comments under 1,000 characters' });
    if (!/^[a-f0-9]{24}$/.test(req.params.postId)) return res.status(404).json({ error: 'Post not found' });
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $push: { comments: { author: req.userId, text } } },
      { new: true }
    ).select('comments').populate('comments.author', COMMENT_AUTHOR).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comments = post.comments.filter((c) => c.author).map(commentOut);
    res.json({ message: 'Comment added', comment: comments[comments.length - 1], comments, count: post.comments.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment', message: error.message });
  }
});

// Delete a comment: its author or the post's author
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).select('author comments');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const mine = String(comment.author) === String(req.userId) || String(post.author) === String(req.userId);
    if (!mine) return res.status(403).json({ error: 'You can only delete your own comments' });
    comment.deleteOne();
    await post.save();
    res.json({ message: 'Comment deleted', count: post.comments.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment', message: error.message });
  }
});

router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post', message: error.message });
  }
});

module.exports = router;