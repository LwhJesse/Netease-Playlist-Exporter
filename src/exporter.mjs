/**
 * Playlist export core.
 *
 * Stripped YesPlayMusic logic:
 *
 *   1. /playlist/detail
 *   2. playlist.trackIds is the source of original order
 *   3. /song/detail fills metadata in batches
 *   4. songs are mapped by song.id
 *   5. final rows are rebuilt strictly by trackIds order
 *
 * Do not trust playlist.tracks as complete.
 */

function parsePlaylistId(input) {
  const text = String(input).trim();

  if (/^\d+$/.test(text)) return text;

  const match =
    text.match(/[?&]id=(\d+)/) ||
    text.match(/playlist\/(\d+)/) ||
    text.match(/\/playlist\?id=(\d+)/);

  if (!match) {
    throw new Error(`Cannot parse playlist id from: ${input}`);
  }

  return match[1];
}

function joinNames(items) {
  return (items || [])
    .map((item) => item?.name)
    .filter(Boolean)
    .join(" / ");
}

function joinIds(items) {
  return (items || [])
    .map((item) => item?.id)
    .filter((id) => id !== undefined && id !== null)
    .join(" / ");
}

function buildRow({ id, index, song, playlistId, playlistName }) {
  if (!song) {
    return {
      index,
      playlist_id: playlistId,
      playlist_name: playlistName,
      netease_song_id: id,
      song_name: "",
      artist_names: "",
      artist_ids: "",
      album_name: "",
      album_id: "",
      duration_ms: "",
      aliases: "",
      source_url: `https://music.163.com/song?id=${id}`,
      status: "missing_detail"
    };
  }

  const artists = song.ar || song.artists || [];
  const album = song.al || song.album || {};

  return {
    index,
    playlist_id: playlistId,
    playlist_name: playlistName,
    netease_song_id: song.id ?? id,
    song_name: song.name ?? "",
    artist_names: joinNames(artists),
    artist_ids: joinIds(artists),
    album_name: album.name ?? "",
    album_id: album.id ?? "",
    duration_ms: song.dt ?? song.duration ?? "",
    aliases: (song.alia || song.alias || []).join(" / "),
    source_url: `https://music.163.com/song?id=${song.id ?? id}`,
    status: "ok"
  };
}

export async function exportPlaylist(api, input, options = {}) {
  const playlistId = parsePlaylistId(input);
  const batchSize = options.batchSize || 400;

  console.log(`[1/5] Fetch playlist detail: ${playlistId}`);

  const detail = await api.get("/playlist/detail", {
    id: playlistId
  });

  if (!detail.playlist) {
    console.error(JSON.stringify(detail, null, 2));
    throw new Error("No playlist field returned. Login state or API compatibility may be wrong.");
  }

  const playlistName = detail.playlist.name || `playlist_${playlistId}`;

  const trackIds = (detail.playlist.trackIds || [])
    .map((track) => track?.id ?? track)
    .filter(Boolean);

  if (!trackIds.length) {
    throw new Error("playlist.trackIds is empty. Cannot preserve original order.");
  }

  console.log(`[2/5] Playlist: ${playlistName}`);
  console.log(`[3/5] trackCount=${detail.playlist.trackCount ?? "?"}, trackIds=${trackIds.length}`);

  const songMap = new Map();

  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);

    console.log(`[4/5] Fetch song detail: ${i + 1}-${i + batch.length}/${trackIds.length}`);

    const data = await api.get("/song/detail", {
      ids: batch.join(",")
    });

    for (const song of data.songs || []) {
      if (song?.id !== undefined && song?.id !== null) {
        songMap.set(String(song.id), song);
      }
    }
  }

  const rows = trackIds.map((id, i) =>
    buildRow({
      id,
      index: i + 1,
      song: songMap.get(String(id)),
      playlistId,
      playlistName
    })
  );

  const missing = rows.filter((row) => row.status !== "ok").length;

  const playlist = {
    id: playlistId,
    name: playlistName,
    apiTrackCount: detail.playlist.trackCount ?? null,
    trackIdsCount: trackIds.length,
    exportedCount: rows.length,
    missingDetailCount: missing
  };

  const warnings = [];

  if (options.expectedCount !== null && options.expectedCount !== undefined) {
    if (Number(options.expectedCount) !== rows.length) {
      warnings.push(
        `Expected ${options.expectedCount} tracks, but exported ${rows.length}. ` +
          "The API result may be missing login-visible or web-visible tracks."
      );
    }
  }

  if (missing > 0) {
    warnings.push(`${missing} tracks were returned by playlist.trackIds but missing from song/detail.`);
  }

  return {
    playlist,
    rows,
    warnings
  };
}
