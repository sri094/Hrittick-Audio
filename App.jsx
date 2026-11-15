import React, { useEffect, useRef, useState } from "react";

import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Music2,
  MoreHorizontal,
  Trash2,
  Pencil,
  X,
  ListMusic,
  Clock3,
  Disc3,
  Menu,
  ChevronLeft
} from "lucide-react";

import { searchSongs } from "./services/jiosaavn";

const FALLBACK_IMAGE =
  "https://placehold.co/300x300/191923/ffffff?text=Hrittick";

const STORAGE_KEY = "hrittick_music_player_v1";

function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(seconds) {
  const value = Math.floor(Number(seconds) || 0);

  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function App() {
  const initial = loadStorage();

  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activePage, setActivePage] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [favorites, setFavorites] = useState(initial.favorites || []);
  const [recent, setRecent] = useState(initial.recent || []);
  const [playlists, setPlaylists] = useState(initial.playlists || []);
  const [albums, setAlbums] = useState(initial.albums || []);

  const [currentAlbumId, setCurrentAlbumId] = useState(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState(null);

  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumCover, setAlbumCover] = useState("");

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  const [showAddSong, setShowAddSong] = useState(null);
  const [toast, setToast] = useState("");

  const audioRef = useRef(null);
  const toastTimer = useRef(null);

  const currentAlbum =
    albums.find((album) => album.id === currentAlbumId) || null;

  const currentPlaylist =
    playlists.find((playlist) => playlist.id === currentPlaylistId) || null;

  // Save personal data
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          favorites,
          recent,
          playlists,
          albums
        })
      );
    } catch (error) {
      console.error("Unable to save library:", error);
      showMessage("Storage is full. Some changes may not be saved.");
    }
  }, [favorites, recent, playlists, albums]);

  // Audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load selected song
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    setProgress(0);
    setDuration(0);

    if (!currentSong?.audioUrl) {
      setIsPlaying(false);
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.src = currentSong.audioUrl;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        showMessage("Unable to play this song.");
      });
    }
  }, [currentSong]);

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentSong?.audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showMessage(message) {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 2500);
  }

  async function handleSearch(searchQuery = query) {
    if (!searchQuery.trim()) {
      showMessage("Enter a song or artist name.");
      return;
    }

    setLoading(true);
    setError("");
    setActivePage("search");
    setMobileMenu(false);

    try {
      const results = await searchSongs(searchQuery);
      setSearchResults(results);

      if (!results.length) {
        setError("No songs found. Try another search.");
      }
    } catch (error) {
      console.error(error);
      setSearchResults([]);
      setError("Unable to load music. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function addRecent(song) {
    setRecent((previous) => [
      song,
      ...previous.filter((item) => item.id !== song.id)
    ].slice(0, 30));
  }

  function playSong(song, queue = null) {
    if (!song?.audioUrl) {
      showMessage("Audio is unavailable for this song.");
      return;
    }

    if (queue) {
      setSongs(queue);
    }

    addRecent(song);

    if (currentSong?.id === song.id) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      setProgress(0);
      setIsPlaying(true);
      return;
    }

    setCurrentSong(song);
    setIsPlaying(true);
  }

  function togglePlay() {
    if (!currentSong) {
      showMessage("Select a song first.");
      return;
    }

    setIsPlaying((previous) => !previous);
  }

  function playNext() {
    if (!songs.length || !currentSong) return;

    const playable = songs.filter((song) => song.audioUrl);

    if (!playable.length) return;

    if (shuffle) {
      const available = playable.filter(
        (song) => song.id !== currentSong.id
      );

      if (available.length) {
        playSong(
          available[Math.floor(Math.random() * available.length)]
        );
      } else {
        playSong(playable[0]);
      }

      return;
    }

    const index = playable.findIndex(
      (song) => song.id === currentSong.id
    );

    const next = playable[(index + 1 + playable.length) % playable.length];

    playSong(next);
  }

  function playPrevious() {
    const audio = audioRef.current;

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (!songs.length || !currentSong) return;

    const playable = songs.filter((song) => song.audioUrl);

    const index = playable.findIndex(
      (song) => song.id === currentSong.id
    );

    if (index === -1 || !playable.length) return;

    const previous =
      playable[(index - 1 + playable.length) % playable.length];

    playSong(previous);
  }

  function handleEnded() {
    if (repeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      playNext();
    }
  }

  function toggleFavorite(song) {
    const exists = favorites.some((item) => item.id === song.id);

    setFavorites((previous) =>
      exists
        ? previous.filter((item) => item.id !== song.id)
        : [song, ...previous]
    );

    showMessage(exists ? "Removed from favourites." : "Added to favourites.");
  }

  function isFavorite(song) {
    return favorites.some((item) => item.id === song.id);
  }

  // Album management
  function openCreateAlbum() {
    setEditingAlbumId(null);
    setAlbumName("");
    setAlbumDescription("");
    setAlbumCover("");
    setShowAlbumModal(true);
  }

  function openEditAlbum(album) {
    setEditingAlbumId(album.id);
    setAlbumName(album.name);
    setAlbumDescription(album.description || "");
    setAlbumCover(album.cover || "");
    setShowAlbumModal(true);
  }

  function saveAlbum(event) {
    event.preventDefault();

    if (!albumName.trim()) return;

    if (editingAlbumId) {
      setAlbums((previous) =>
        previous.map((album) =>
          album.id === editingAlbumId
            ? {
                ...album,
                name: albumName.trim(),
                description: albumDescription.trim(),
                cover: albumCover.trim()
              }
            : album
        )
      );

      showMessage("Album updated.");
    } else {
      const newAlbum = {
        id: createId(),
        name: albumName.trim(),
        description: albumDescription.trim(),
        cover: albumCover.trim(),
        songs: [],
        createdAt: Date.now()
      };

      setAlbums((previous) => [newAlbum, ...previous]);
      showMessage("Album created successfully.");
    }

    setShowAlbumModal(false);
  }

  function deleteAlbum(id) {
    if (!window.confirm("Are you sure you want to delete this album?")) {
      return;
    }

    setAlbums((previous) =>
      previous.filter((album) => album.id !== id)
    );

    if (currentAlbumId === id) {
      setCurrentAlbumId(null);
      setActivePage("library");
    }

    showMessage("Album deleted.");
  }

  function addSongToAlbum(albumId, song) {
    setAlbums((previous) =>
      previous.map((album) => {
        if (album.id !== albumId) return album;

        if (album.songs.some((item) => item.id === song.id)) {
          return album;
        }

        return {
          ...album,
          songs: [...album.songs, song]
        };
      })
    );

    setShowAddSong(null);
    showMessage("Song added to album.");
  }

  function removeSongFromAlbum(albumId, songId) {
    setAlbums((previous) =>
      previous.map((album) =>
        album.id === albumId
          ? {
              ...album,
              songs: album.songs.filter(
                (song) => song.id !== songId
              )
            }
          : album
      )
    );

    showMessage("Song removed from album.");
  }

  function openAlbum(album) {
    setCurrentAlbumId(album.id);
    setCurrentPlaylistId(null);
    setActivePage("album");
    setMobileMenu(false);
  }

  // Playlist management
  function createPlaylist(event) {
    event.preventDefault();

    if (!playlistName.trim()) return;

    setPlaylists((previous) => [
      {
        id: createId(),
        name: playlistName.trim(),
        songs: []
      },
      ...previous
    ]);

    setPlaylistName("");
    setShowPlaylistModal(false);
    showMessage("Playlist created.");
  }

  function addSongToPlaylist(playlistId, song) {
    setPlaylists((previous) =>
      previous.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              songs: playlist.songs.some(
                (item) => item.id === song.id
              )
                ? playlist.songs
                : [...playlist.songs, song]
            }
          : playlist
      )
    );

    setShowAddSong(null);
    showMessage("Song added to playlist.");
  }

  function removeSongFromPlaylist(playlistId, songId) {
    setPlaylists((previous) =>
      previous.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              songs: playlist.songs.filter(
                (song) => song.id !== songId
              )
            }
          : playlist
      )
    );

    showMessage("Song removed from playlist.");
  }

  function openPlaylist(playlist) {
    setCurrentPlaylistId(playlist.id);
    setCurrentAlbumId(null);
    setActivePage("playlist");
    setMobileMenu(false);
  }

  function playCollection(collection) {
    const playable = collection.filter((song) => song.audioUrl);

    if (!playable.length) {
      showMessage("No playable songs in this collection.");
      return;
    }

    setSongs(playable);
    playSong(playable[0], playable);
  }

  // Song row
  function SongRow({ song, index, collection = null, queue = [] }) {
    const active = currentSong?.id === song.id;

    return (
      <div className={`song-row ${active ? "active-song" : ""}`}>
        <div className="song-index">
          {active && isPlaying ? (
            <span className="playing-bars">♫</span>
          ) : (
            index + 1
          )}
        </div>

        <img
          className="song-cover"
          src={song.image || FALLBACK_IMAGE}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        <button
          className="song-info"
          onClick={() => playSong(song, queue)}
        >
          <span className="song-name">{song.name}</span>
          <span className="song-artist">{song.artist}</span>
        </button>

        <span className="song-album">{song.album}</span>

        <button
          className={`icon-button favorite-button ${
            isFavorite(song) ? "liked" : ""
          }`}
          onClick={() => toggleFavorite(song)}
          title="Favourite"
        >
          <Heart
            size={17}
            fill={isFavorite(song) ? "currentColor" : "none"}
          />
        </button>

        <button
          className="icon-button more-button"
          onClick={() => setShowAddSong(song)}
          title="Add to collection"
        >
          <MoreHorizontal size={20} />
        </button>

        <span className="song-duration">
          {formatTime(song.duration)}
        </span>

        {collection?.type === "album" && (
          <button
            className="icon-button"
            onClick={() =>
              removeSongFromAlbum(collection.id, song.id)
            }
            title="Remove song"
          >
            <Trash2 size={16} />
          </button>
        )}

        {collection?.type === "playlist" && (
          <button
            className="icon-button"
            onClick={() =>
              removeSongFromPlaylist(collection.id, song.id)
            }
            title="Remove song"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  }

  function renderSongList(list, collection = null) {
    if (!list.length) {
      return (
        <div className="empty-state">
          <Music2 size={42} />
          <h3>No songs yet</h3>
          <p>Search for music and add songs to your collection.</p>

          <button
            className="primary-button"
            onClick={() => {
              setActivePage("search");
              setMobileMenu(false);
            }}
          >
            Explore Music
          </button>
        </div>
      );
    }

    return (
      <div className="song-list">
        <div className="song-list-heading">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span></span>
          <span></span>
          <span>Time</span>
        </div>

        {list.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            index={index}
            collection={collection}
            queue={list}
          />
        ))}
      </div>
    );
  }

  function renderAlbumGrid() {
    if (!albums.length) {
      return (
        <div className="small-empty">
          <Disc3 size={28} />
          <p>You haven't created any albums yet.</p>

          <button className="text-button" onClick={openCreateAlbum}>
            <Plus size={16} /> Create your first album
          </button>
        </div>
      );
    }

    return (
      <div className="album-grid">
        {albums.map((album) => (
          <div className="album-card" key={album.id}>
            <button
              className="album-image-wrap"
              onClick={() => openAlbum(album)}
            >
              <img
                src={album.cover || FALLBACK_IMAGE}
                alt={album.name}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <span className="album-play">
                <Play fill="currentColor" size={21} />
              </span>
            </button>

            <div className="album-card-info">
              <button
                className="album-title"
                onClick={() => openAlbum(album)}
              >
                {album.name}
              </button>

              <span>{album.songs.length} songs</span>
            </div>

            <div className="album-actions">
              <button
                className="icon-button"
                onClick={() => openEditAlbum(album)}
                title="Edit album"
              >
                <Pencil size={15} />
              </button>

              <button
                className="icon-button"
                onClick={() => deleteAlbum(album.id)}
                title="Delete album"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderHome() {
    return (
      <>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">WELCOME TO HRITTICK</span>
            <h1>Feel every beat.</h1>
            <p>
              Discover your favourite songs and create your own
              musical world.
            </p>

            <button
              className="primary-button"
              onClick={() => {
                setQuery("Arijit Singh");
                handleSearch("Arijit Singh");
              }}
            >
              <Play size={17} fill="currentColor" />
              Explore Music
            </button>
          </div>

          <div className="hero-art">
            <Disc3 size={170} strokeWidth={0.8} />
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <h2>Quick Access</h2>
              <p>Your music collections</p>
            </div>
          </div>

          <div className="quick-grid">
            <button
              className="quick-card liked-card"
              onClick={() => setActivePage("favorites")}
            >
              <Heart size={30} fill="white" />
              <strong>Liked Songs</strong>
              <span>{favorites.length} songs</span>
            </button>

            <button
              className="quick-card recent-card"
              onClick={() => setActivePage("recent")}
            >
              <Clock3 size={30} />
              <strong>Recently Played</strong>
              <span>{recent.length} songs</span>
            </button>

            <button
              className="quick-card library-card"
              onClick={() => setActivePage("library")}
            >
              <Library size={30} />
              <strong>My Albums</strong>
              <span>{albums.length} albums</span>
            </button>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <h2>Find Your Music</h2>
              <p>Search your favourite songs and artists</p>
            </div>
          </div>

          <form
            className="home-search"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <Search size={20} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you want to listen to?"
            />

            <button type="submit">Search</button>
          </form>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <h2>Your Albums</h2>
              <p>Your personal music collection</p>
            </div>

            <button className="text-button" onClick={openCreateAlbum}>
              <Plus size={17} /> Create Album
            </button>
          </div>

          {renderAlbumGrid()}
        </section>
      </>
    );
  }

  function renderLibrary() {
    return (
      <>
        <div className="library-toolbar">
          <div>
            <h2>My Personal Library</h2>
            <p>Create and manage your own albums.</p>
          </div>

          <button className="primary-button" onClick={openCreateAlbum}>
            <Plus size={18} /> New Album
          </button>
        </div>

        {renderAlbumGrid()}

        <div className="library-toolbar playlist-toolbar">
          <div>
            <h2>My Playlists</h2>
            <p>Organize songs into playlists.</p>
          </div>

          <button
            className="secondary-button"
            onClick={() => setShowPlaylistModal(true)}
          >
            <Plus size={17} /> New Playlist
          </button>
        </div>

        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <div className="playlist-card" key={playlist.id}>
              <button onClick={() => openPlaylist(playlist)}>
                <ListMusic size={28} />
                <strong>{playlist.name}</strong>
                <span>{playlist.songs.length} songs</span>
              </button>

              <button
                className="icon-button"
                title="Delete playlist"
                onClick={() => {
                  if (window.confirm("Delete this playlist?")) {
                    setPlaylists((previous) =>
                      previous.filter((item) => item.id !== playlist.id)
                    );

                    if (currentPlaylistId === playlist.id) {
                      setCurrentPlaylistId(null);
                      setActivePage("library");
                    }
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {playlists.length === 0 && (
          <div className="small-empty">
            <ListMusic size={28} />
            <p>No playlists created yet.</p>
          </div>
        )}
      </>
    );
  }

  function renderCollectionPage() {
    const isAlbum = activePage === "album";
    const collection = isAlbum ? currentAlbum : currentPlaylist;

    if (!collection) return renderLibrary();

    const collectionSongs = collection.songs || [];

    return (
      <>
        <button
          className="back-button"
          onClick={() => setActivePage("library")}
        >
          <ChevronLeft size={18} /> Back to Library
        </button>

        <div className="collection-hero">
          <img
            src={
              isAlbum
                ? collection.cover || FALLBACK_IMAGE
                : FALLBACK_IMAGE
            }
            alt={collection.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div>
            <span className="eyebrow">
              {isAlbum ? "PERSONAL ALBUM" : "PLAYLIST"}
            </span>

            <h1>{collection.name}</h1>

            <p>
              {isAlbum
                ? collection.description || "Your personal music album"
                : "Your personal playlist"}
            </p>

            <span className="collection-count">
              {collectionSongs.length} songs
            </span>

            <div className="collection-buttons">
              <button
                className="primary-button"
                onClick={() => playCollection(collectionSongs)}
              >
                <Play size={18} fill="currentColor" /> Play All
              </button>

              {isAlbum && (
                <button
                  className="secondary-button"
                  onClick={() => openEditAlbum(collection)}
                >
                  <Pencil size={16} /> Edit Album
                </button>
              )}
            </div>
          </div>
        </div>

        {renderSongList(collectionSongs, {
          type: isAlbum ? "album" : "playlist",
          id: collection.id
        })}
      </>
    );
  }

  function renderPage() {
    switch (activePage) {
      case "home":
        return renderHome();

      case "search":
        return (
          <>
            <div className="search-heading">
              <h2>Search Music</h2>
              <p>Find songs, artists and albums.</p>
            </div>

            <form
              className="search-bar"
              onSubmit={(event) => {
                event.preventDefault();
                handleSearch();
              }}
            >
              <Search size={21} />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search songs, artists..."
              />

              <button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </form>

            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Finding your music...</p>
              </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {!loading && searchResults.length > 0 && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>Search Results</h2>
                    <p>{searchResults.length} songs found</p>
                  </div>
                </div>

                {renderSongList(searchResults)}
              </>
            )}
          </>
        );

      case "library":
        return renderLibrary();

      case "favorites":
        return (
          <>
            <div className="page-banner">
              <Heart size={44} fill="currentColor" />

              <div>
                <h1>Liked Songs</h1>
                <p>{favorites.length} favourite songs</p>
              </div>

              {favorites.length > 0 && (
                <button
                  className="primary-button"
                  onClick={() => playCollection(favorites)}
                >
                  <Play size={18} fill="currentColor" /> Play
                </button>
              )}
            </div>

            {renderSongList(favorites)}
          </>
        );

      case "recent":
        return (
          <>
            <div className="page-banner">
              <Clock3 size={44} />

              <div>
                <h1>Recently Played</h1>
                <p>Your listening history</p>
              </div>

              {recent.length > 0 && (
                <button
                  className="primary-button"
                  onClick={() => playCollection(recent)}
                >
                  <Play size={18} fill="currentColor" /> Play
                </button>
              )}
            </div>

            {renderSongList(recent)}
          </>
        );

      case "album":
      case "playlist":
        return renderCollectionPage();

      default:
        return renderHome();
    }
  }

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Your Library", icon: Library },
    { id: "favorites", label: "Liked Songs", icon: Heart },
    { id: "recent", label: "Recent", icon: Clock3 }
  ];

  const progressPercent = duration
    ? (progress / duration) * 100
    : 0;

  const pageTitle = {
    home: "Discover Music",
    search: "Search Results",
    library: "Your Library",
    favorites: "Liked Songs",
    recent: "Recently Played",
    album: currentAlbum?.name || "Album",
    playlist: currentPlaylist?.name || "Playlist"
  };

  return (
    <div className="app">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(event) =>
          setProgress(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || 0)
        }
        onEnded={handleEnded}
        onError={() => {
          if (currentSong?.audioUrl) {
            setIsPlaying(false);
            showMessage("Playback error. Try another song.");
          }
        }}
      />

      {/* SIDEBAR */}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Music2 size={23} />
          </div>

          <span>
            Hrittick<span className="brand-dot">.</span>
          </span>

          <button
            className="mobile-close icon-button"
            onClick={() => setMobileMenu(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-label">MENU</div>

        <nav className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={activePage === item.id ? "nav-active" : ""}
                onClick={() => {
                  setActivePage(item.id);
                  setCurrentAlbumId(null);
                  setCurrentPlaylistId(null);
                  setMobileMenu(false);
                }}
              >
                <Icon size={20} />

                {item.label}

                {item.id === "favorites" && (
                  <span className="nav-count">{favorites.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-label library-label">
          YOUR COLLECTIONS
        </div>

        <button className="create-link" onClick={openCreateAlbum}>
          <Plus size={18} /> Create Album
        </button>

        <div className="sidebar-albums">
          {albums.slice(0, 5).map((album) => (
            <button
              key={album.id}
              onClick={() => openAlbum(album)}
            >
              <img
                src={album.cover || FALLBACK_IMAGE}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <span>{album.name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Disc3 size={24} />
            <p>Your music, your memories.</p>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* MAIN */}

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu-button icon-button"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={24} />
          </button>

          <div className="topbar-location">
            <span>LISTEN YOUR WAY</span>
            <strong>{pageTitle[activePage]}</strong>
          </div>

          <button
            className="top-search"
            onClick={() => {
              setActivePage("search");
              setMobileMenu(false);
            }}
          >
            <Search size={17} />
            <span>Search music...</span>
          </button>

          <div className="profile-icon">H</div>
        </header>

        <div className="page-content">
          {renderPage()}
        </div>
      </main>

      {/* MUSIC PLAYER */}

      <footer className="player">
        <div className="player-song">
          {currentSong ? (
            <>
              <img
                src={currentSong.image || FALLBACK_IMAGE}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <div className="player-song-info">
                <strong>{currentSong.name}</strong>
                <span>{currentSong.artist}</span>
              </div>

              <button
                className={`icon-button player-heart ${
                  isFavorite(currentSong) ? "liked" : ""
                }`}
                onClick={() => toggleFavorite(currentSong)}
              >
                <Heart
                  size={19}
                  fill={isFavorite(currentSong) ? "currentColor" : "none"}
                />
              </button>
            </>
          ) : (
            <>
              <div className="player-placeholder">
                <Music2 size={23} />
              </div>

              <div className="player-song-info">
                <strong>Nothing playing</strong>
                <span>Choose your favourite song</span>
              </div>
            </>
          )}
        </div>

        <div className="player-controls">
          <div className="control-buttons">
            <button
              className={`icon-button optional-control ${
                shuffle ? "control-active" : ""
              }`}
              onClick={() => setShuffle((value) => !value)}
              title="Shuffle"
            >
              <Shuffle size={17} />
            </button>

            <button
              className="icon-button"
              onClick={playPrevious}
              title="Previous"
            >
              <SkipBack size={21} fill="currentColor" />
            </button>

            <button
              className="play-button"
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={21} fill="currentColor" />
              ) : (
                <Play size={21} fill="currentColor" />
              )}
            </button>

            <button
              className="icon-button"
              onClick={playNext}
              title="Next"
            >
              <SkipForward size={21} fill="currentColor" />
            </button>

            <button
              className={`icon-button optional-control ${
                repeat ? "control-active" : ""
              }`}
              onClick={() => setRepeat((value) => !value)}
              title="Repeat"
            >
              <Repeat size={17} />
            </button>
          </div>

          <div className="progress-container">
            <span>{formatTime(progress)}</span>

            <input
              type="range"
              min="0"
              max={duration || 100}
              value={Math.min(progress, duration || 100)}
              onChange={(event) => {
                const value = Number(event.target.value);

                if (audioRef.current) {
                  audioRef.current.currentTime = value;
                  setProgress(value);
                }
              }}
              style={{ "--progress": `${progressPercent}%` }}
            />

            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-volume">
          <button
            className="icon-button"
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          >
            {volume === 0 ? (
              <VolumeX size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={{ "--progress": `${volume * 100}%` }}
          />
        </div>
      </footer>

      {/* CREATE / EDIT ALBUM */}

      {showAlbumModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAlbumModal(false);
            }
          }}
        >
          <form className="modal" onSubmit={saveAlbum}>
            <div className="modal-heading">
              <div>
                <h2>
                  {editingAlbumId ? "Edit Album" : "Create Album"}
                </h2>
                <p>Build your own personal music collection.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setShowAlbumModal(false)}
              >
                <X size={21} />
              </button>
            </div>

            <label>Album Name *</label>

            <input
              required
              maxLength="60"
              value={albumName}
              onChange={(event) => setAlbumName(event.target.value)}
              placeholder="e.g. My Romantic Collection"
            />

            <label>Description</label>

            <textarea
              maxLength="250"
              value={albumDescription}
              onChange={(event) =>
                setAlbumDescription(event.target.value)
              }
              placeholder="Write something about your album..."
            />

            <label>Cover Image URL (optional)</label>

            <input
              type="url"
              value={albumCover}
              onChange={(event) => setAlbumCover(event.target.value)}
              placeholder="https://example.com/cover.jpg"
            />

            <button className="primary-button modal-submit" type="submit">
              {editingAlbumId ? "Save Changes" : "Create Album"}
            </button>
          </form>
        </div>
      )}

      {/* CREATE PLAYLIST */}

      {showPlaylistModal && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={createPlaylist}>
            <div className="modal-heading">
              <div>
                <h2>Create Playlist</h2>
                <p>Give your playlist a name.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPlaylistModal(false)}
              >
                <X size={21} />
              </button>
            </div>

            <label>Playlist Name *</label>

            <input
              required
              maxLength="60"
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="My Favourite Songs"
            />

            <button className="primary-button modal-submit" type="submit">
              Create Playlist
            </button>
          </form>
        </div>
      )}

      {/* ADD SONG TO COLLECTION */}

      {showAddSong && (
        <div className="modal-overlay">
          <div className="modal add-song-modal">
            <div className="modal-heading">
              <div>
                <h2>Add to Collection</h2>
                <p>{showAddSong.name}</p>
              </div>

              <button
                className="icon-button"
                onClick={() => setShowAddSong(null)}
              >
                <X size={21} />
              </button>
            </div>

            <h4>Your Albums</h4>

            {albums.length === 0 && (
              <p className="muted-text">Create an album first.</p>
            )}

            {albums.map((album) => (
              <button
                className="collection-option"
                key={album.id}
                onClick={() => addSongToAlbum(album.id, showAddSong)}
              >
                <Disc3 size={20} />
                <span>{album.name}</span>
                <Plus size={17} />
              </button>
            ))}

            <h4>Your Playlists</h4>

            {playlists.length === 0 && (
              <p className="muted-text">Create a playlist first.</p>
            )}

            {playlists.map((playlist) => (
              <button
                className="collection-option"
                key={playlist.id}
                onClick={() =>
                  addSongToPlaylist(playlist.id, showAddSong)
                }
              >
                <ListMusic size={20} />
                <span>{playlist.name}</span>
                <Plus size={17} />
              </button>
            ))}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}