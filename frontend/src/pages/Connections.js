import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { FiSearch, FiUserPlus, FiUserCheck, FiMessageCircle, FiX, FiUsers } from 'react-icons/fi';
import { API_URL } from '../config/api';

const Connections = () => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/suggestions`);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/list`);
      setConnections(response.data.connections || []);
    } catch (error) {
      console.error('Failed to load connections');
    }
  }, [API_URL]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/connections/pending`);
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load pending requests');
    }
  }, [API_URL]);

  useEffect(() => {
    fetchSuggestions();
    fetchConnections();
    fetchPendingRequests();
  }, [fetchSuggestions, fetchConnections, fetchPendingRequests]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters to search');
      return;
    }
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/connections/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.users || []);
      setActiveTab('search');
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/connections/send-request/${userId}`);
      toast.success('Connection request sent!');
      setSuggestions(suggestions.filter(s => s._id !== userId));
      setSearchResults(searchResults.map(s => 
        s._id === userId ? { ...s, requestSent: true } : s
      ));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAccept = async (requesterId) => {
    try {
      await axios.post(`${API_URL}/api/connections/accept-request/${requesterId}`);
      toast.success('Request accepted!');
      fetchConnections();
      fetchPendingRequests();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (requesterId) => {
    try {
      await axios.post(`${API_URL}/api/connections/reject-request/${requesterId}`);
      toast.success('Request rejected');
      fetchPendingRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    try {
      await axios.delete(`${API_URL}/api/connections/remove/${connectionId}`);
      toast.success('Connection removed');
      fetchConnections();
    } catch (error) {
      toast.error('Failed to remove connection');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('suggestions');
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="connections-page">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Network & Growth</h1>
          <p className="text-gray-600">Find and connect with professionals. Search by name, username, or email.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-xl">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 py-6 text-lg border-2 border-gray-200 focus:border-yellow-400 rounded-xl"
                data-testid="connection-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={searching || searchQuery.length < 2}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-6 rounded-xl"
              data-testid="search-button"
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full justify-start overflow-x-auto mb-6 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black rounded-lg">
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black rounded-lg">
              Search Results ({searchResults.length})
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black rounded-lg">
              My Network ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black rounded-lg">
              Pending ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            {loading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">Loading suggestions...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {suggestions.map((suggestion) => (
                  <div key={suggestion._id} className="connection-card-pro animate-fadeIn" data-testid={`suggestion-card-${suggestion._id}`}>
                    <div className="pro-match-badge">PRO MATCH</div>
                    <div className="flex items-start justify-between mt-8">
                      <Link to={`/portfolio/${suggestion.username}`} className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                        <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                          <AvatarImage src={suggestion.profilePic} />
                          <AvatarFallback className="bg-white text-black text-2xl font-bold">
                            {suggestion.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold text-black hover:underline">{suggestion.name}</h3>
                          {suggestion.username && (
                            <p className="text-sm text-gray-800">@{suggestion.username}</p>
                          )}
                          <p className="text-sm text-gray-700">
                            {suggestion.role === 'recruiter' ? 'Recruiter' : 'Professional'}
                          </p>
                        </div>
                      </Link>
                    </div>
                    
                    {suggestion.bio && (
                      <p className="mt-4 text-sm text-gray-800 line-clamp-2">{suggestion.bio}</p>
                    )}

                    {suggestion.mutualConnectionsCount > 0 && (
                      <div className="mt-4 bg-white/90 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-700 font-medium">
                            {suggestion.mutualConnectionsCount} MUTUAL CONNECTIONS
                          </p>
                          <div className="flex -space-x-2">
                            {suggestion.mutualConnections?.slice(0, 3).map((conn, idx) => (
                              <Avatar key={idx} className="w-8 h-8 border-2 border-white">
                                <AvatarFallback className="text-xs bg-gray-200">
                                  {conn.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {suggestion.commonSkills?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-700 mb-2">Common Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.commonSkills.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="bg-white/80 text-black px-2 py-1 rounded-full text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <Button
                        onClick={() => handleConnect(suggestion._id)}
                        className="w-full bg-white text-black font-semibold hover:bg-gray-100"
                        data-testid={`connect-btn-${suggestion._id}`}
                      >
                        <FiUserPlus className="w-5 h-5 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No suggestions available. Try searching for users!</p>
              </div>
            )}
          </TabsContent>

          {/* Search Results Tab */}
          <TabsContent value="search">
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <div key={user._id} className="connection-card flex items-center justify-between animate-fadeIn" data-testid={`search-result-${user._id}`}>
                    <Link to={`/portfolio/${user.username}`} className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                      <Avatar className="w-16 h-16 border-2 border-gray-200">
                        <AvatarImage src={user.profilePic} />
                        <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">
                          {user.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-black hover:underline">{user.name}</h3>
                        {user.username && (
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        )}
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center space-x-3">
                      {user.isConnected ? (
                        <span className="flex items-center text-green-600 font-medium">
                          <FiUserCheck className="w-5 h-5 mr-1" />
                          Connected
                        </span>
                      ) : user.requestSent ? (
                        <span className="text-gray-500 font-medium">Request Sent</span>
                      ) : (
                        <Button
                          onClick={() => handleConnect(user._id)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                          data-testid={`connect-search-btn-${user._id}`}
                        >
                          <FiUserPlus className="w-5 h-5 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchQuery ? 'No users found. Try a different search term.' : 'Enter a name, username, or email to search.'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections">
            {connections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <div key={connection._id} className="connection-card animate-fadeIn" data-testid={`connection-${connection._id}`}>
                    <Link to={`/portfolio/${connection.username}`} className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                      <Avatar className="w-14 h-14 border-2 border-yellow-400">
                        <AvatarImage src={connection.profilePic} />
                        <AvatarFallback className="bg-yellow-400 text-black font-bold">
                          {connection.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-black hover:underline">{connection.name}</h3>
                        {connection.username && (
                          <p className="text-sm text-gray-600">@{connection.username}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {connection.role === 'recruiter' ? 'Recruiter' : 'Professional'}
                        </p>
                      </div>
                    </Link>
                    <div className="mt-4 flex space-x-2">
                      <Button size="sm" onClick={() => navigate(`/chat?with=${connection._id}`)} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black">
                        <FiMessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveConnection(connection._id)}
                        className="text-gray-600 hover:text-red-600"
                      >
                        <FiX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No connections yet. Start connecting with professionals!</p>
              </div>
            )}
          </TabsContent>

          {/* Pending Requests Tab */}
          <TabsContent value="pending">
            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request._id} className="connection-card flex items-center justify-between animate-fadeIn" data-testid={`pending-${request._id}`}>
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-14 h-14 border-2 border-gray-200">
                        <AvatarImage src={request.profilePic} />
                        <AvatarFallback className="bg-gray-200 text-black font-bold">
                          {request.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-black">{request.name}</h3>
                        {request.username && (
                          <p className="text-sm text-gray-600">@{request.username}</p>
                        )}
                        <p className="text-sm text-gray-500">{request.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleAccept(request._id)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                        data-testid={`accept-btn-${request._id}`}
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleReject(request._id)}
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300"
                        data-testid={`reject-btn-${request._id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiUserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No pending requests.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Connections;
