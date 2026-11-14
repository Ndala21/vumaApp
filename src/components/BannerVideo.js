/**
 * VUMA Store - the video part of a banner.
 *
 * The video does NOT load until the customer taps the play button, so nobody
 * spends mobile data on a video they did not ask for (the banner picture is
 * the poster until then). It plays once, muted at first, with a sound button
 * and a close button.
 *
 * The video player is a native part of the app (expo-video). An app build made
 * before it was added does not have it: then VIDEO_READY is false, no play
 * button is shown and the banner stays a picture. Nothing here can crash the
 * banner: any problem with the video just turns the video off for that banner.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

let VideoLib = null;
try {
  // eslint-disable-next-line global-require
  VideoLib = require('expo-video');
} catch (e) {
  VideoLib = null;
}

export const VIDEO_READY = !!(VideoLib && typeof VideoLib.useVideoPlayer === 'function' && VideoLib.VideoView);

// Show the picture again if the first video picture takes very long to arrive.
const READY_FALLBACK_MS = 3500;

class VideoGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.props.onFail) this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function VideoInner({ uri, muted, onEnd, onFail, onReady, style }) {
  const player = VideoLib.useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });
  const endRef = useRef(onEnd);
  const failRef = useRef(onFail);
  const readyRef = useRef(onReady);
  endRef.current = onEnd;
  failRef.current = onFail;
  readyRef.current = onReady;

  useEffect(() => {
    const subs = [];
    try {
      subs.push(player.addListener('playToEnd', () => { if (endRef.current) endRef.current(); }));
      subs.push(player.addListener('statusChange', (e) => {
        if (e && e.status === 'error' && failRef.current) failRef.current();
      }));
    } catch (e) {
      if (failRef.current) failRef.current();
    }
    const timer = setTimeout(() => { if (readyRef.current) readyRef.current(); }, READY_FALLBACK_MS);
    return () => {
      clearTimeout(timer);
      subs.forEach((s) => { try { s.remove(); } catch (e) { /* already gone */ } });
    };
  }, [player]);

  useEffect(() => {
    try { player.muted = !!muted; } catch (e) { /* the player is gone */ }
  }, [player, muted]);

  return (
    <VideoLib.VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      onFirstFrameRender={() => { if (readyRef.current) readyRef.current(); }}
    />
  );
}

/** Plays `uri` filling its parent. Renders nothing when this app build cannot play video. */
export function BannerVideoPlayer({ uri, muted, onEnd, onFail, style }) {
  const [ready, setReady] = useState(false);
  if (!VIDEO_READY || !uri) return null;
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.fill, { opacity: ready ? 1 : 0.01 }]}>
        <VideoGuard onFail={onFail}>
          <VideoInner uri={uri} muted={muted} onEnd={onEnd} onFail={onFail} onReady={() => setReady(true)} style={style || styles.fill} />
        </VideoGuard>
      </View>
      {!ready ? (
        <View style={[styles.fill, styles.center]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

/** A small round button with a symbol in it. */
export function RoundButton({ symbol, onPress, size = 32, label, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.round, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Text style={[styles.roundText, { fontSize: size * 0.44 }]}>{symbol}</Text>
    </TouchableOpacity>
  );
}

/** The big round play button laid over the banner picture. */
export function PlayButton({ onPress, size = 40, label, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.play, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Text style={[styles.playText, { fontSize: size * 0.42 }]}>{'▶'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  round: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  roundText: { color: '#FFFFFF', fontWeight: '700' },
  play: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  playText: { color: '#FFFFFF', marginLeft: 2 },
});
