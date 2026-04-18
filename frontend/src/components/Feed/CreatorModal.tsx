"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Mic, Wand2, X } from "lucide-react";
import { createPost, generateScript, uploadMedia } from "../../lib/api";
import useStore from "../../store/useStore";

interface CreatorModalProps {
  onClose: () => void;
  preferredLanguage: string;
}

type Step = "prompt" | "script" | "record" | "publishing";

export default function CreatorModal({ onClose, preferredLanguage }: CreatorModalProps) {
  const addPost = useStore((state) => state.addPost);

  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState(preferredLanguage);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Recording state
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const cleanupTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => cleanupTimer(), []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateScript(prompt, language);
      setScript(res.script);
      setStep("script");
    } catch {
      alert("Failed to generate script. Check Groq and backend configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((v) => v + 1);
      }, 1000);
    } catch {
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder) return;
    mediaRecorder.stop();
    setIsRecording(false);
    cleanupTimer();
  };

  const handlePublish = async () => {
    if (!audioBlob) return;
    setStep("publishing");
    try {
      const { url } = await uploadMedia(audioBlob);
      const savedPost = await createPost({
        type: "audio",
        content: script || prompt, // Use script as text content
        media_url: url,
        language,
        origin: "human",
      });
      addPost(savedPost);
      onClose();
    } catch {
      alert("Failed to publish post.");
      setStep("record");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="creator-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="stack-inline">
            <div className="plus-icon-bg"><Mic size={18} /></div>
            <h2>New Discovery</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          {step === "prompt" && (
            <div className="creator-step transition-fade">
              <h3>What should your post be about?</h3>
              <p className="muted-text">Our AI will draft a natural script for you to record.</p>
              
              <textarea 
                placeholder="Ex: My favorite coffee spot in Addis, or a funny thing that happened today..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus
                className="creator-input"
              />

              <div className="creator-toolbar">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="btn">
                  <option value="am">Amharic</option>
                  <option value="en">English</option>
                </select>
                <button 
                  className="btn btn-primary" 
                  disabled={isGenerating || !prompt.trim()}
                  onClick={handleGenerate}
                >
                  {isGenerating ? "AI Thinking..." : "Generate Script"}
                  <Wand2 size={16} />
                </button>
              </div>
            </div>
          )}

          {step === "script" && (
            <div className="creator-step transition-fade">
              <h3>Review your script</h3>
              <div className="script-container glass-panel">
                <textarea 
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="script-editor"
                />
              </div>
              <button 
                className="btn btn-primary creator-continue"
                onClick={() => setStep("record")}
                type="button"
              >
                Continue to Record
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === "record" && (
            <div className="creator-step transition-fade">
              <div className="teleprompter">
                <p>{script || prompt}</p>
              </div>

              <div className="recording-zone">
                {audioBlob && !isRecording ? (
                  <div className="recording-preview-stack">
                    <div className="preview-player glass-panel">
                       <button 
                        className="btn btn-ghost" 
                        onClick={() => {
                            if (isPreviewing) {
                                audioPreviewRef.current?.pause();
                                setIsPreviewing(false);
                            } else {
                                void audioPreviewRef.current?.play();
                                setIsPreviewing(true);
                            }
                        }}
                        type="button"
                       >
                         {isPreviewing ? "Pause Preview" : "Play Recording"}
                       </button>
                       <audio 
                        ref={audioPreviewRef} 
                        src={audioBlob ? URL.createObjectURL(audioBlob) : ""} 
                        onEnded={() => setIsPreviewing(false)}
                       />
                    </div>
                    <div className="recording-actions">
                        <button
                        className="btn"
                        onClick={() => {
                            setAudioBlob(null);
                            setRecordingTime(0);
                            setIsPreviewing(false);
                        }}
                        type="button"
                        >
                        Redo
                        </button>
                        <button className="btn btn-primary" onClick={handlePublish} type="button">
                        Publish Discovery
                        <Check size={16} />
                        </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className={`big-record-button ${isRecording ? "active" : ""}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    type="button"
                  >
                    <Mic size={32} />
                    <span>{isRecording ? "Stop" : "Tap to Record"}</span>
                    {isRecording && <div className="timer">{recordingTime}s</div>}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "publishing" && (
            <div className="creator-step transition-fade center-all">
              <div className="spinner" />
              <p>Sending your voice to Merewa...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
