const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

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
      mediaUrl: typeof mediaUrl === 'string' && /^(https:\/\/|\/uploads\/)/.test(mediaUrl) ? mediaUrl : ''
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

router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();

    res.json({ message: 'Post updated', likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like post', message: error.message });
  }
});

router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({
      author: req.userId,
      text
    });

    await post.save();
    await post.populate('comments.author', 'name profilePic');

    res.json({ message: 'Comment added', comments: post.comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment', message: error.message });
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