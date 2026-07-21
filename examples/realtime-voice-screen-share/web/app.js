const FRAME_MAX_EDGE = 1280;
const FRAME_QUALITY = 0.68;
const FRAME_INTERVAL_MS = 2000;
const FRAME_CHANGE_THRESHOLD = 6;
const FRAME_LIMIT = 120;

const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
};

const elements = {
  start: $("start-call"),
  setup: $("setup-state"),
  dialog: $("call-dialog"),
  close: $("close-dialog"),
  end: $("end-call"),
  mute: $("mute-call"),
  share: $("share-screen"),
  sendFrame: $("send-frame"),
  clearTranscript: $("clear-transcript"),
  connection: $("connection-label"),
  announcement: $("live-announcement"),
  duration: $("call-duration"),
  model: $("model-name"),
  voice: $("voice-name"),
  error: $("call-error"),
  remoteAudio: $("remote-audio"),
  preview: $("screen-preview"),
  screenEmpty: $("screen-empty"),
  canvas: $("capture-canvas"),
  thumb: $("thumb-canvas"),
  frameCount: $("frame-count"),
  transcript: $("transcript"),
};

const state = {
  peer: null,
  channel: null,
  micStream: null,
  screenStream: null,
  screenVideo: null,
  captureTimer: null,
  durationTimer: null,
  connectedAt: 0,
  framesSent: 0,
  lastThumb: null,
  muted: false,
  stopping: false,
  currentAgentMessage: null,
  testAudioContext: null,
};

function isLocalE2E() {
  const localHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  return localHost && new URLSearchParams(location.search).get("e2e") === "1";
}

function createSilentTestStream() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser cannot create the local test audio track.");
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const destination = context.createMediaStreamDestination();
  gain.gain.value = 0;
  oscillator.connect(gain).connect(destination);
  oscillator.start();
  state.testAudioContext = context;
  return destination.stream;
}

async function getMicrophoneStream() {
  if (isLocalE2E()) return createSilentTestStream();
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(new Error("The browser could not read the test screenshot.")), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function sendLocalE2EProbe() {
  const response = await fetch("/docs/azure-foundry-models.png", { cache: "no-store" });
  if (!response.ok) throw new Error("The browser test screenshot is missing.");
  const imageUrl = await blobToDataUrl(await response.blob());
  const sent = sendEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        { type: "input_image", image_url: imageUrl, detail: "high" },
        { type: "input_text", text: "Das ist ein Browser-Screenshot aus Microsoft Foundry. Erkläre mir auf Deutsch, welche Modellübersicht ich sehe und nenne zwei Modelle, die für einen Realtime-Voice-Agent relevant sind. Antworte kurz." },
      ],
    },
  });
  if (!sent) throw new Error("The browser could not send the test screenshot.");
  state.framesSent = 1;
  elements.frameCount.textContent = "1 frame sent";
  elements.screenEmpty.innerHTML = `
    <img class="e2e-image" src="/docs/azure-foundry-models.png" alt="Microsoft Foundry model catalog sent to the live Realtime session">
    <p class="e2e-note">Azure browser screenshot · sent as <code>input_image</code></p>`;
  addMessage("user", "Welche Modellübersicht sehe ich hier und welche Modelle sind für einen Realtime-Voice-Agent relevant?");
  sendEvent({
    type: "response.create",
    response: {
      instructions: "Antworte ausschließlich auf Deutsch und stütze dich nur auf den bereitgestellten Screenshot. Beschreibe die sichtbare Microsoft-Foundry-Modellübersicht und nenne zwei sichtbare Modelle, die für einen Realtime-Voice-Agent relevant sind. Antworte in höchstens drei kurzen Sätzen.",
    },
  });
}

function setStatus(status, label) {
  elements.dialog.dataset.status = status;
  elements.connection.textContent = label;
  elements.announcement.textContent = label;
}

function showError(message) {
  elements.error.hidden = false;
  elements.error.textContent = message;
  setStatus("error", "Connection problem");
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = "";
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function startDuration() {
  stopDuration();
  state.connectedAt = Date.now();
  elements.duration.textContent = "00:00";
  state.durationTimer = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.connectedAt) / 1000);
    elements.duration.textContent = formatDuration(elapsed);
  }, 1000);
}

function stopDuration() {
  if (state.durationTimer) window.clearInterval(state.durationTimer);
  state.durationTimer = null;
}

function removeEmptyTranscript() {
  elements.transcript.querySelector(".transcript-empty")?.remove();
}

function addMessage(role, text, partial = false) {
  removeEmptyTranscript();
  const message = document.createElement("article");
  message.className = "message";
  message.dataset.role = role;
  message.dataset.partial = String(partial);

  const author = document.createElement("strong");
  author.textContent = role === "agent" ? "Screen Guide" : "You";
  const content = document.createElement("p");
  content.textContent = text;
  message.append(author, content);
  elements.transcript.append(message);
  elements.transcript.scrollTop = elements.transcript.scrollHeight;
  return message;
}

function appendAgentDelta(delta) {
  if (!delta) return;
  if (!state.currentAgentMessage) {
    state.currentAgentMessage = addMessage("agent", "", true);
  }
  const paragraph = state.currentAgentMessage.querySelector("p");
  paragraph.textContent += delta;
  elements.transcript.scrollTop = elements.transcript.scrollHeight;
}

function finishAgentMessage(transcript) {
  if (state.currentAgentMessage) {
    const paragraph = state.currentAgentMessage.querySelector("p");
    if (transcript && !paragraph.textContent.trim()) paragraph.textContent = transcript;
    state.currentAgentMessage.dataset.partial = "false";
    state.currentAgentMessage = null;
  } else if (transcript) {
    addMessage("agent", transcript);
  }
}

function sendEvent(event) {
  if (!state.channel || state.channel.readyState !== "open") return false;
  if (state.channel.bufferedAmount > 4_000_000) return false;
  state.channel.send(JSON.stringify(event));
  return true;
}

function handleRealtimeEvent(raw) {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      setStatus("connected", "Listening to you");
      break;
    case "input_audio_buffer.speech_stopped":
      setStatus("connected", "Thinking");
      break;
    case "output_audio_buffer.started":
      elements.dialog.dataset.speaking = "true";
      setStatus("connected", "Screen Guide is speaking");
      break;
    case "output_audio_buffer.stopped":
      elements.dialog.dataset.speaking = "false";
      setStatus("connected", "Ready for your question");
      break;
    case "conversation.item.input_audio_transcription.completed":
      if (event.transcript) addMessage("user", event.transcript);
      break;
    case "response.output_audio_transcript.delta":
      appendAgentDelta(event.delta || "");
      break;
    case "response.output_audio_transcript.done":
      finishAgentMessage(event.transcript || "");
      break;
    case "response.output_text.delta":
      if (!state.currentAgentMessage) appendAgentDelta(event.delta || "");
      break;
    case "response.output_text.done":
      finishAgentMessage(event.text || "");
      break;
    case "error":
    case "session.error":
      showError(event.error?.message || "The Realtime session returned an error.");
      break;
    default:
      break;
  }
}

function waitForDataChannel(channel, timeoutMs = 15000) {
  if (channel.readyState === "open") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("The Realtime data channel did not open.")), timeoutMs);
    channel.addEventListener("open", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
    channel.addEventListener("close", () => {
      window.clearTimeout(timer);
      reject(new Error("The Realtime data channel closed during setup."));
    }, { once: true });
  });
}

async function startSession() {
  if (!elements.start.dataset.ready || state.peer) return;
  clearError();
  state.stopping = false;
  elements.dialog.showModal();
  elements.start.disabled = true;
  setStatus("connecting", "Requesting secure session");

  try {
    const tokenResponse = await fetch("/api/realtime/token", {
      method: "POST",
      headers: { "Accept": "application/json" },
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.detail || "The local token service failed.");

    elements.model.textContent = tokenData.deployment;
    elements.voice.textContent = `${tokenData.voice} voice`;
    setStatus("connecting", "Waiting for microphone");

    state.micStream = await getMicrophoneStream();

    const peer = new RTCPeerConnection();
    state.peer = peer;
    state.micStream.getTracks().forEach((track) => peer.addTrack(track, state.micStream));
    peer.addEventListener("track", (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) elements.remoteAudio.srcObject = remoteStream;
    });
    peer.addEventListener("connectionstatechange", () => {
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        showError(`WebRTC connection ${peer.connectionState}. End the call and try again.`);
      }
    });

    const channel = peer.createDataChannel("realtime-channel");
    state.channel = channel;
    channel.addEventListener("message", (event) => handleRealtimeEvent(event.data));
    channel.addEventListener("close", () => {
      if (!state.stopping) setStatus("error", "Session disconnected");
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    setStatus("connecting", "Negotiating WebRTC");
    const sdpResponse = await fetch(`${tokenData.endpoint}/openai/v1/realtime/calls?webrtcfilter=on`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Authorization": `Bearer ${tokenData.token}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!sdpResponse.ok) throw new Error(`Azure rejected the WebRTC offer (${sdpResponse.status}).`);

    await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    await waitForDataChannel(channel);

    setStatus("connected", "Ready for your question");
    elements.mute.disabled = false;
    elements.share.disabled = false;
    startDuration();
    if (isLocalE2E()) {
      elements.voice.textContent = `${tokenData.voice} voice · browser E2E`;
      await sendLocalE2EProbe();
    } else {
      sendEvent({
        type: "response.create",
        response: {
          instructions: "Give one short welcome and explain that you can discuss a screen after the user explicitly shares it. For every later answer, use the language of the user's latest spoken question.",
        },
      });
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : "The voice session could not start.");
    cleanupMedia();
  }
}

function thumbFromVideo(video) {
  const context = elements.thumb.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, 32, 32);
  const rgba = context.getImageData(0, 0, 32, 32).data;
  const gray = new Uint8ClampedArray(32 * 32);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    gray[index] = (rgba[offset] + rgba[offset + 1] + rgba[offset + 2]) / 3;
  }
  return gray;
}

function frameChanged(nextThumb) {
  if (!state.lastThumb || state.lastThumb.length !== nextThumb.length) return true;
  let total = 0;
  for (let index = 0; index < nextThumb.length; index += 1) {
    total += Math.abs(nextThumb[index] - state.lastThumb[index]);
  }
  return total / nextThumb.length >= FRAME_CHANGE_THRESHOLD;
}

function captureFrame(force = false) {
  const video = state.screenVideo;
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) return false;
  if (state.framesSent >= FRAME_LIMIT) {
    stopScreenShare();
    showError(`The ${FRAME_LIMIT}-frame safety limit was reached. Start a new share if needed.`);
    return false;
  }

  const nextThumb = thumbFromVideo(video);
  if (!nextThumb || (!force && !frameChanged(nextThumb))) return false;
  state.lastThumb = nextThumb;

  const scale = Math.min(1, FRAME_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  elements.canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  elements.canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = elements.canvas.getContext("2d");
  if (!context) return false;
  context.drawImage(video, 0, 0, elements.canvas.width, elements.canvas.height);
  const imageUrl = elements.canvas.toDataURL("image/jpeg", FRAME_QUALITY);
  const sent = sendEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_image", image_url: imageUrl, detail: force ? "high" : "low" }],
    },
  });
  if (!sent) return false;

  state.framesSent += 1;
  elements.frameCount.textContent = `${state.framesSent} frame${state.framesSent === 1 ? "" : "s"} sent`;
  return true;
}

async function startScreenShare() {
  if (state.screenStream) {
    stopScreenShare();
    return;
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showError("This browser does not support screen capture.");
    return;
  }

  clearError();
  elements.share.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 2, max: 5 } },
      audio: false,
      selfBrowserSurface: "include",
      surfaceSwitching: "include",
      monitorTypeSurfaces: "include",
    });
    const [track] = stream.getVideoTracks();
    if (!track) throw new Error("The selected surface did not provide a video track.");

    state.screenStream = stream;
    const video = document.createElement("video");
    state.screenVideo = video;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    elements.preview.srcObject = stream;
    elements.preview.hidden = false;
    elements.screenEmpty.hidden = true;
    elements.share.dataset.active = "true";
    elements.share.querySelector("span:last-child").textContent = "Stop sharing";
    elements.sendFrame.disabled = false;
    elements.share.disabled = false;
    track.addEventListener("ended", stopScreenShare, { once: true });

    const sendFirst = () => {
      captureFrame(true);
      sendEvent({
        type: "response.create",
        response: {
          instructions: "A screen frame was shared. In the language of the user's latest spoken turn, confirm that you can see it, describe only the high-level visible context, and ask what the user wants to inspect. If there is no spoken turn yet, keep the confirmation very short.",
        },
      });
    };
    if (video.videoWidth > 0) sendFirst();
    else video.addEventListener("loadedmetadata", sendFirst, { once: true });
    state.captureTimer = window.setInterval(() => captureFrame(false), FRAME_INTERVAL_MS);
    elements.announcement.textContent = "Screen sharing started. Changed frames are sent to the live conversation.";
  } catch (error) {
    if (error?.name !== "NotAllowedError" && error?.name !== "AbortError") {
      showError(error instanceof Error ? error.message : "Screen sharing could not start.");
    }
    elements.share.disabled = false;
  }
}

function stopScreenShare() {
  if (state.captureTimer) window.clearInterval(state.captureTimer);
  state.captureTimer = null;
  state.screenStream?.getTracks().forEach((track) => track.stop());
  state.screenStream = null;
  if (state.screenVideo) state.screenVideo.srcObject = null;
  state.screenVideo = null;
  state.lastThumb = null;
  elements.preview.srcObject = null;
  elements.preview.hidden = true;
  elements.screenEmpty.hidden = false;
  elements.share.dataset.active = "false";
  elements.share.querySelector("span:last-child").textContent = "Share screen";
  elements.sendFrame.disabled = true;
  elements.announcement.textContent = "Screen sharing stopped.";
}

function toggleMute() {
  state.muted = !state.muted;
  state.micStream?.getAudioTracks().forEach((track) => { track.enabled = !state.muted; });
  elements.mute.dataset.active = String(state.muted);
  elements.mute.querySelector("span:last-child").textContent = state.muted ? "Unmute" : "Mute";
  elements.announcement.textContent = state.muted ? "Microphone muted." : "Microphone active.";
}

function cleanupMedia() {
  stopScreenShare();
  state.channel?.close();
  state.peer?.close();
  state.micStream?.getTracks().forEach((track) => track.stop());
  state.testAudioContext?.close();
  state.channel = null;
  state.peer = null;
  state.micStream = null;
  state.testAudioContext = null;
  elements.remoteAudio.srcObject = null;
  stopDuration();
}

function stopSession() {
  if (state.stopping) return;
  state.stopping = true;
  setStatus("ending", "Ending call");
  cleanupMedia();
  elements.mute.disabled = true;
  elements.share.disabled = true;
  elements.sendFrame.disabled = true;
  elements.dialog.dataset.speaking = "false";
  elements.start.disabled = false;
  if (elements.dialog.open) elements.dialog.close();
  state.stopping = false;
}

function clearTranscript() {
  elements.transcript.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "transcript-empty";
  empty.textContent = "The next transcript item will appear here.";
  elements.transcript.append(empty);
  state.currentAgentMessage = null;
}

async function checkSetup() {
  try {
    const response = await fetch("/api/health", { headers: { "Accept": "application/json" } });
    const health = await response.json();
    if (health.status !== "ready") throw new Error("Local environment variables are missing.");
    elements.setup.textContent = `Ready · ${health.deployment} · ${health.voice} voice`;
    elements.setup.dataset.ready = "true";
    elements.start.dataset.ready = "true";
    elements.start.disabled = false;
  } catch (error) {
    elements.setup.textContent = error instanceof Error ? error.message : "Local setup is incomplete.";
    elements.start.disabled = true;
  }
}

function openPreviewMode() {
  elements.dialog.showModal();
  elements.model.textContent = "gpt-realtime-2.1-2026-07-07";
  elements.voice.textContent = "marin voice";
  elements.duration.textContent = "01:42";
  elements.frameCount.textContent = "8 frames sent";
  elements.dialog.dataset.status = "connected";
  elements.dialog.dataset.speaking = "true";
  elements.connection.textContent = "Screen Guide is speaking";
  elements.mute.disabled = false;
  elements.share.disabled = false;
  elements.share.dataset.active = "true";
  elements.share.querySelector("span:last-child").textContent = "Stop sharing";
  elements.sendFrame.disabled = false;
  elements.screenEmpty.innerHTML = `
    <img class="e2e-image" src="/docs/azure-foundry-models.png" alt="Microsoft Foundry model catalog shared with Screen Guide">
    <p class="e2e-note">Microsoft Foundry · browser tab shared</p>`;
  addMessage("user", "Welche Modelle sind hier für einen Realtime-Voice-Agent relevant?");
  addMessage("agent", "Du siehst den Modellkatalog deines Microsoft-Foundry-Projekts. Für einen Voice-Agent sind hier besonders gpt-realtime-2.1 und gpt-realtime-2.1-mini relevant, da beide Audioverarbeitung unterstützen.");
}

elements.start.addEventListener("click", startSession);
elements.close.addEventListener("click", stopSession);
elements.end.addEventListener("click", stopSession);
elements.mute.addEventListener("click", toggleMute);
elements.share.addEventListener("click", startScreenShare);
elements.sendFrame.addEventListener("click", () => {
  if (captureFrame(true)) elements.announcement.textContent = "Current frame sent.";
});
elements.clearTranscript.addEventListener("click", clearTranscript);
elements.dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  stopSession();
});
window.addEventListener("beforeunload", cleanupMedia);

await checkSetup();
if (new URLSearchParams(window.location.search).get("preview") === "call") openPreviewMode();
