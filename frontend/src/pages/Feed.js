import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ImageUpload from '../components/ImageUpload';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { FiHeart, FiMessageCircle, FiSend, FiImage, FiPlus, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStories, setSelectedStories] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchFeed();
    fetchStories();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/posts/feed`);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Failed to load feed');
    }
  };

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stories/feed`);
      setStories(response.data.stories);
    } catch (error) {
      console.error('Failed to load stories');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !mediaUrl) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/posts/create`, {
        content: newPost,
        mediaUrl
      });
      setPosts([response.data.post, ...posts]);
      setNewPost('');
      setMediaUrl('');
      setShowUpload(false);
      toast.success('Post shared!');
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!storyMediaUrl.trim()) {
      toast.error('Please upload an image for your story');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/stories/create`, {
        mediaUrl: storyMediaUrl,
        caption: storyCaption,
        mediaType: 'image'
      });
      setStoryMediaUrl('');
      setStoryCaption('');
      setShowStoryModal(false);
      fetchStories();
      toast.success('Story created!');
    } catch (error) {
      toast.error('Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStory = async (storyGroup, index) => {
    setSelectedStories(storyGroup);
    setCurrentStoryIndex(index);
    setShowStoryViewer(true);
    
    // Mark as viewed
    if (storyGroup.stories[index]._id) {
      try {
        await axios.post(`${API_URL}/api/stories/${storyGroup.stories[index]._id}/view`);
      } catch (error) {
        console.error('Failed to mark story as viewed');
      }
    }
  };

  const nextStory = () => {
    if (selectedStories && currentStoryIndex < selectedStories.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      handleViewStory(selectedStories, nextIndex);
    } else {
      setShowStoryViewer(false);
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(prevIndex);
      handleViewStory(selectedStories, prevIndex);
    }
  };

  const handleLike = async (postId) => {
    try {
      await axios.post(`${API_URL}/api/posts/${postId}/like`);
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes.includes(user.id);
          return {
            ...post,
            likes: isLiked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id]
          };
        }
        return post;
      }));
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (postId) => {
    const text = commentTexts[postId];
    if (!text?.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/api/posts/${postId}/comment`, { text });
      setPosts(posts.map(post => post._id === postId ? { ...post, comments: response.data.comments } : post));
      setCommentTexts({ ...commentTexts, [postId]: '' });
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stories Section */}
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {/* Add Story Button */}
                  <div 
                    className="flex-shrink-0 text-center cursor-pointer"
                    onClick={() => setShowStoryModal(true)}
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-600 flex items-center justify-center mb-2 hover:scale-105 transition">
                      <FiPlus className="w-6 h-6 text-black" />
                    </div>
                    <p className="text-xs font-medium">Add Story</p>
                  </div>

                  {/* User Stories - Only show real stories */}
                  {stories.map((storyGroup, idx) => (
                    <div 
                      key={idx} 
                      className="flex-shrink-0 text-center cursor-pointer"
                      onClick={() => handleViewStory(storyGroup, 0)}
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 p-0.5 mb-2 hover:scale-105 transition">
                        <Avatar className="w-full h-full border-2 border-white">
                          <AvatarImage src={storyGroup.author.profilePic} />
                          <AvatarFallback className="bg-[#16324F] text-white">
                            {storyGroup.author.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <p className="text-xs truncate w-16">{storyGroup.author.name.split(' ')[0]}</p>
                    </div>
                  ))}
                  
                  {/* Show message if no stories */}
                  {stories.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-4">
                      <p className="text-sm text-gray-500">No stories yet. Be the first to share!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Create Post Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex space-x-3 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.profilePic} />
                    <AvatarFallback className="bg-[#16324F] text-white">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Textarea
                    placeholder={`What's your latest project, ${user?.name?.split(' ')[0]}?`}
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-20 resize-none border-gray-300"
                  />
                </div>
                {showUpload && (
                  <div className="mb-4">
                    <ImageUpload onUploadComplete={(url) => setMediaUrl(url)} />
                  </div>
                )}
                {mediaUrl && (
                  <div className="mb-4 relative">
                    <img src={mediaUrl} alt="Upload" className="rounded-lg max-h-64 object-cover" />
                    <button 
                      onClick={() => setMediaUrl('')}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <FiX />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setShowUpload(!showUpload)} 
                    className="flex items-center space-x-2 text-gray-600 hover:text-black"
                  >
                    <FiImage className="w-5 h-5" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={loading || (!newPost.trim() && !mediaUrl)} 
                    className="bg-[#16324F] hover:bg-[#0F2439] text-white"
                  >
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            {posts.map((post) => (
              <Card key={post._id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={post.author?.profilePic} />
                      <AvatarFallback className="bg-[#16324F] text-white">
                        {post.author?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.author?.name}</p>
                      <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-gray-800">{post.content}</p>
                  </div>
                  {post.mediaUrl && (
                    <img src={post.mediaUrl} alt="Post" className="w-full max-h-96 object-cover" />
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => handleLike(post._id)}
                        className={`flex items-center space-x-1 ${post.likes?.includes(user?.id) ? 'text-red-600' : 'text-gray-600'} hover:text-red-600`}
                      >
                        <FiHeart className={post.likes?.includes(user?.id) ? 'fill-current' : ''} />
                        <span className="text-sm">{post.likes?.length || 0}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-gray-600 hover:text-black">
                        <FiMessageCircle />
                        <span className="text-sm">{post.comments?.length || 0}</span>
                      </button>
                    </div>
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {post.comments.slice(-3).map((comment, idx) => (
                          <div key={idx} className="flex space-x-2 text-sm">
                            <span className="font-semibold">{comment.author?.name}:</span>
                            <span className="text-gray-700">{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentTexts[post._id] || ''}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [post._id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post._id)}
                        className="text-sm"
                      />
                      <Button 
                        onClick={() => handleComment(post._id)} 
                        size="sm"
                        disabled={!commentTexts[post._id]?.trim()}
                        className="bg-[#16324F] hover:bg-[#0F2439] text-white"
                      >
                        <FiSend />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-4">Upcoming Webinars</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-semibold text-sm">BeeBark Networking Event</p>
                    <p className="text-xs text-gray-600">Tomorrow, 3 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-4">Active Projects</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="font-semibold text-sm">Community Building</p>
                    <p className="text-xs text-gray-600">24 members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Story Modal */}
      <Dialog open={showStoryModal} onOpenChange={setShowStoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload onUploadComplete={(url) => setStoryMediaUrl(url)} />
            {storyMediaUrl && (
              <img src={storyMediaUrl} alt="Story preview" className="rounded-lg max-h-64 object-cover w-full" />
            )}
            <Input
              placeholder="Add a caption (optional)"
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateStory} 
                disabled={loading || !storyMediaUrl}
                className="flex-1 bg-[#16324F] hover:bg-[#0F2439] text-white"
              >
                Post Story
              </Button>
              <Button variant="outline" onClick={() => setShowStoryModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      <Dialog open={showStoryViewer} onOpenChange={setShowStoryViewer}>
        <DialogContent className="max-w-lg p-0">
          {selectedStories && selectedStories.stories[currentStoryIndex] && (
            <div className="relative bg-black">
              <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                <Avatar className="w-10 h-10 border-2 border-white">
                  <AvatarImage src={selectedStories.author.profilePic} />
                  <AvatarFallback>{selectedStories.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-white">
                  <p className="font-semibold text-sm">{selectedStories.author.name}</p>
                  <p className="text-xs opacity-75">
                    {new Date(selectedStories.stories[currentStoryIndex].createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowStoryViewer(false)}
                className="absolute top-4 right-4 z-10 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
              >
                <FiX />
              </button>
              <img 
                src={selectedStories.stories[currentStoryIndex].mediaUrl} 
                alt="Story" 
                className="w-full max-h-[80vh] object-contain"
              />
              {selectedStories.stories[currentStoryIndex].caption && (
                <div className="absolute bottom-4 left-4 right-4 text-white bg-black/50 p-3 rounded">
                  <p>{selectedStories.stories[currentStoryIndex].caption}</p>
                </div>
              )}
              {currentStoryIndex > 0 && (
                <button 
                  onClick={previousStory}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
                >
                  ‹
                </button>
              )}
              {currentStoryIndex < selectedStories.stories.length - 1 && (
                <button 
                  onClick={nextStory}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
                >
                  ›
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feed;
