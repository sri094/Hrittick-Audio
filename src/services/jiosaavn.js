const API_BASE = "https://saavn.sumit.co/api";

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function getImage(song) {
  const images = song?.image || song?.images || [];

  if (typeof images === "string") return images;

  if (!Array.isArray(images)) return "";

  return (
    [...images].reverse().find((item) => item?.url)?.url || ""
  );
}

function getAudio(song) {
  const urls = song?.downloadUrl || song?.download_url || [];

  if (typeof urls === "string") return urls;

  if (!Array.isArray(urls)) return "";

  return (
    [...urls].reverse().find((item) => item?.url)?.url || ""
  );
}

export function normalizeSong(song) {
  if (!song) return null;

  const id = song.id || song.songId;

  if (!id) return null;

  return {
    id: String(id),
    name: cleanText(song.name || song.title || "Unknown Song"),
    artist: cleanText(
      song.primaryArtists ||
      song.artist ||
      song.singers ||
      "Unknown Artist"
    ),
    album: cleanText(
      song.album?.name ||
      song.album ||
      "Unknown Album"
    ),
    image: getImage(song),
    audioUrl: getAudio(song),
    duration: Number(song.duration || 0),
    year: song.year || "",
    language: song.language || "",
    url: song.url || ""
  };
}

export async function searchSongs(query) {
  const response = await fetch(
    `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=30`
  );

  if (!response.ok) {
    throw new Error("Unable to search songs");
  }

  const json = await response.json();

  const results = json?.data?.results || [];

  return results.map(normalizeSong).filter(Boolean);
}

export async function getSongDetails(id) {
  try {
    const response = await fetch(
      `${API_BASE}/songs/${encodeURIComponent(id)}`
    );

    if (!response.ok) return null;

    const json = await response.json();

    const song = Array.isArray(json?.data)
      ? json.data[0]
      : json?.data;

    return normalizeSong(song);
  } catch (error) {
    console.error(error);
    return null;
  }
}