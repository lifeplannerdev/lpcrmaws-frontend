import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { getPusherClient } from '../../lib/pusher';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function FeedsWidget() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();

  const getToken = useCallback(async () => {
    return accessToken || await refreshAccessToken();
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_BASE_URL}/feeds/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data;
        const postsArray = data.results || data || [];
        setPosts(Array.isArray(postsArray) ? postsArray.slice(0, 3) : []); // Only show top 3 on dashboard
      } catch (error) {
        console.error('Failed to load feeds:', error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchPosts();
    }

    const setupPusher = async () => {
      const pusherClient = getPusherClient(getToken);
      const channel = pusherClient.subscribe('feeds');

      channel.bind('new_post', (newPost) => {
        setPosts((prev) => [newPost, ...prev].slice(0, 3));
      });

      channel.bind('delete_post', (data) => {
        setPosts((prev) => prev.filter(p => p.id !== data.id));
      });

      channel.bind('new_reaction', (reactionData) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === reactionData.post) {
            return { ...p, reaction_count: (p.reaction_count || 0) + 1 };
          }
          return p;
        }));
      });

      channel.bind('remove_reaction', (data) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === data.post_id) {
            return { ...p, reaction_count: Math.max(0, (p.reaction_count || 0) - 1) };
          }
          return p;
        }));
      });

      channel.bind('new_comment', (commentData) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === commentData.post) {
            return { ...p, comment_count: (p.comment_count || 0) + 1 };
          }
          return p;
        }));
      });
      
      channel.bind('delete_comment', (data) => {
        setPosts((prev) => prev.map(p => {
          if (p.id === data.post_id) {
            return { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) };
          }
          return p;
        }));
      });
    };

    if (accessToken) {
      setupPusher();
    }

    return () => {
      // Cleanup if needed, but getPusherClient caches the connection
    };
  }, [accessToken, getToken]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <span className="bg-gradient-to-r from-pink-500 to-indigo-500 w-2 h-6 rounded-full inline-block"></span>
          Latest Feeds
        </h3>
        <button 
          onClick={() => navigate('/feeds')}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View All
        </button>
      </div>

      <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500">
            <MessageCircle size={32} className="text-gray-300 mb-2" />
            <p className="text-sm">No feeds yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="group relative p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300" onClick={() => navigate('/feeds')}>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 p-[2px] shrink-0">
                  <div className="w-full h-full rounded-full border-2 border-white bg-white overflow-hidden flex items-center justify-center font-bold text-gray-600 text-sm">
                    {post.author?.first_name?.charAt(0) || post.author?.username?.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {post.author?.first_name || post.author?.username}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {post.content && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{post.content}</p>
                  )}
                  {post.media_type !== 'none' && post.media ? (
                    <div className="mt-2 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                      {post.media_type === 'image' ? (
                        <img 
                          src={post.media.startsWith('http') ? post.media : `${API_BASE_URL.replace('/api', '')}${post.media}`} 
                          alt="Post media" 
                          className="w-full h-auto" 
                        />
                      ) : (
                        <video 
                          src={post.media.startsWith('http') ? post.media : `${API_BASE_URL.replace('/api', '')}${post.media}`} 
                          className="w-full h-auto" 
                          controls
                        />
                      )}
                    </div>
                  ) : post.media_type !== 'none' && (
                    <div className="mt-2 text-xs font-medium text-indigo-500 flex items-center gap-1">
                      {post.media_type === 'video' ? '🎥 Video Post' : '🖼️ Image Post'}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-gray-400 group-hover:text-pink-500 transition-colors text-xs">
                      <Heart size={14} />
                      <span>{post.reaction_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 group-hover:text-blue-500 transition-colors text-xs">
                      <MessageCircle size={14} />
                      <span>{post.comment_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
