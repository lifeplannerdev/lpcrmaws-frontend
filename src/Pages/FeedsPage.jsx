import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { getPusherClient } from '../lib/pusher';
import Navbar from '../Components/layouts/Navbar';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, 
  Video as VideoIcon, Send, X, Smile, Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const EMOJIS = ['❤️', '😂', '👍', '🔥', '👏', '🎉', '😢', '😍'];

export default function FeedsPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Post creation state
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const canPost = hasPermission('feeds:post') || hasPermission('feeds:admin') || user?.is_superuser;
  const canDelete = (postAuthorId) => hasPermission('feeds:admin') || user?.is_superuser || user?.id === postAuthorId;

  const getToken = useCallback(async () => {
    return accessToken || await refreshAccessToken();
  }, [accessToken, refreshAccessToken]);

  const fetchPosts = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/feeds/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch feeds');
      const data = await res.json();
      const postsArray = data.results || data || [];
      setPosts(Array.isArray(postsArray) ? postsArray : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const setupPusher = async () => {
      const pusherClient = getPusherClient(getToken);
      const channel = pusherClient.subscribe('feeds');

      channel.bind('new_post', (newPost) => {
        setPosts((prev) => [newPost, ...prev]);
      });

      channel.bind('delete_post', (data) => {
        setPosts((prev) => prev.filter(p => p.id !== data.id));
      });

      channel.bind('new_reaction', (reactionData) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === reactionData.post) {
            // Check if reaction already exists in UI
            const exists = p.reactions?.find(r => r.id === reactionData.id);
            if (exists) return p;
            return {
              ...p,
              reactions: [...(p.reactions || []), reactionData],
              reaction_count: (p.reaction_count || 0) + 1
            };
          }
          return p;
        }));
      });

      channel.bind('remove_reaction', (data) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === data.post_id) {
            return {
              ...p,
              reactions: p.reactions?.filter(r => !(r.user.id === data.user_id && r.emoji === data.emoji)) || [],
              reaction_count: Math.max(0, (p.reaction_count || 0) - 1)
            };
          }
          return p;
        }));
      });

      channel.bind('new_comment', (commentData) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === commentData.post) {
            return {
              ...p,
              comments: [...(p.comments || []), commentData],
              comment_count: (p.comment_count || 0) + 1
            };
          }
          return p;
        }));
      });
      
      channel.bind('delete_comment', (data) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === data.post_id) {
            return {
              ...p,
              comments: p.comments?.filter(c => c.id !== data.id) || [],
              comment_count: Math.max(0, (p.comment_count || 0) - 1)
            };
          }
          return p;
        }));
      });
    };

    if (accessToken) {
      setupPusher();
    }

    return () => {
      // getPusherClient().unsubscribe('feeds'); // We don't want to unsubscribe totally since other components might use pusher
    };
  }, [accessToken, getToken]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMediaFile(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePostSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('media_type', mediaType);
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/feeds/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        setContent('');
        clearMedia();
      } else {
        const err = await res.text();
        setError(err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/feeds/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-transparent bg-clip-text">
              Company Feeds
            </span>
          </h1>
          <p className="text-gray-500 mt-1">Stay updated with the latest announcements, videos, and moments.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Create Post Section */}
        {canPost && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-8 transition-shadow focus-within:shadow-md">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shrink-0">
                <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center font-bold text-indigo-600">
                  {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full bg-gray-50 border-none rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                  rows="3"
                  placeholder="What's happening? Share a post or announcement..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                
                {mediaPreview && (
                  <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-200">
                    <button 
                      onClick={clearMedia}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                    >
                      <X size={16} />
                    </button>
                    {mediaType === 'image' ? (
                      <img src={mediaPreview} alt="Preview" className="max-h-80 w-full object-cover" />
                    ) : (
                      <video src={mediaPreview} controls className="max-h-80 w-full object-cover" />
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <ImageIcon size={18} className="text-pink-500" />
                      <span className="hidden sm:inline">Photo</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <VideoIcon size={18} className="text-purple-500" />
                      <span className="hidden sm:inline">Video</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                  </div>
                  <button 
                    onClick={handlePostSubmit}
                    disabled={isSubmitting || (!content.trim() && !mediaFile)}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-all shadow-sm shadow-indigo-200"
                  >
                    {isSubmitting ? 'Posting...' : (
                      <>
                        <span>Post</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feeds List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No posts yet</h3>
              <p className="text-gray-500 mt-1">Check back later for updates from your team.</p>
            </div>
          ) : (
            posts.map(post => (
              <FeedPostCard 
                key={post.id} 
                post={post} 
                canDelete={canDelete(post.author.id)}
                onDelete={() => handleDeletePost(post.id)}
                getToken={getToken}
                currentUser={user}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-component for individual post
function FeedPostCard({ post, canDelete, onDelete, getToken, currentUser }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Find which emoji the current user reacted with
  const userReaction = post.reactions?.find(r => r.user.id === currentUser?.id);

  const handleReact = async (emoji) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/feeds/${post.id}/react/`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      setShowEmojiPicker(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/feeds/${post.id}/comments/`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentText })
      });
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete comment?')) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/feeds/comments/${commentId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };
  
  // Aggregate reactions by emoji
  const reactionCounts = post.reactions?.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
              {post.author?.first_name?.charAt(0) || post.author?.username?.charAt(0) || 'U'}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author?.first_name || post.author?.username}</p>
            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media_type !== 'none' && post.media && (
        <div className="w-full bg-gray-100 flex justify-center max-h-[600px] overflow-hidden">
          {post.media_type === 'image' ? (
            <img src={`${API_BASE_URL.replace('/api', '')}${post.media}`} alt="Post media" className="max-w-full object-contain" />
          ) : (
            <video src={`${API_BASE_URL.replace('/api', '')}${post.media}`} controls className="max-w-full object-contain" />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          {Object.entries(reactionCounts).length > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-1 mr-2">
                {Object.keys(reactionCounts).slice(0, 3).map((emoji, i) => (
                  <span key={i} className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-xs shadow-sm z-10 relative">
                    {emoji}
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-500">{post.reaction_count}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Be the first to react</span>
          )}
        </div>
        <div className="text-sm text-gray-500 cursor-pointer hover:underline" onClick={() => setShowComments(!showComments)}>
          {post.comment_count} comments
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-1">
        <div className="relative">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition flex-1 justify-center
              ${userReaction ? 'text-pink-600 bg-pink-50' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => handleReact(userReaction ? userReaction.emoji : '❤️')} // toggle default heart if none, else remove current
            onMouseEnter={() => setShowEmojiPicker(true)}
            onMouseLeave={() => setTimeout(() => setShowEmojiPicker(false), 500)} // Allow time to move to picker
          >
            {userReaction ? <span>{userReaction.emoji}</span> : <Heart size={20} />}
            <span>{userReaction ? 'Reacted' : 'React'}</span>
          </button>
          
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div 
              className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border border-gray-200 px-3 py-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2 z-20"
              onMouseEnter={() => setShowEmojiPicker(true)}
              onMouseLeave={() => setShowEmojiPicker(false)}
            >
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                  className="text-2xl hover:scale-125 transition-transform origin-bottom"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition flex-1 justify-center"
        >
          <MessageCircle size={20} />
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
            {post.comments?.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                  {comment.author?.first_name?.charAt(0) || comment.author?.username?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 shadow-sm border border-gray-100 inline-block relative group">
                    <span className="font-semibold text-gray-900 text-sm mr-2">{comment.author?.first_name || comment.author?.username}</span>
                    <p className="text-gray-700 text-sm">{comment.content}</p>
                    
                    {/* Delete comment button */}
                    {(currentUser?.id === comment.author.id || currentUser?.is_superuser) && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 ml-1">{new Date(comment.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleComment} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0">
              {currentUser?.first_name?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
            </div>
            <input 
              type="text" 
              placeholder="Write a comment..." 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            <button 
              type="submit"
              disabled={!commentText.trim()}
              className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
