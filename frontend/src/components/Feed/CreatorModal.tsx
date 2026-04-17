"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Wand2, X, Check, ArrowRight } from "lucide-react";
import { createPost, uploadMedia, generateScript } from "../../lib/api";
import useStore from "../../store/useStore";
import Avatar from "../UI/Avatar";

interface CreatorModalProps {
  onClose: () => void;
  preferredLanguage: string;
}

type Step = "prompt" | "script" | "record" | "publishing";

export default function CreatorModal({ onClose, preferredLanguage }: CreatorModalProps) {
  const addPost = useStore((state) => state.addPost);
  const currentUser = useStore((state) => state.currentUser);

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
  const timerRef = useRef<number | null>(null);

  const cleanupTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateScript(prompt, language);
      setScript(res.script);
      setStep("script");
    } catch {
      alert("Failed to generate script. Check if Ollama is running.");
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
    } catch (err) {
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

              <div className="stack-inline" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
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
                className="btn btn-primary" 
                style={{ marginTop: '1.5rem', width: '100%' }}
                onClick={() => setStep("record")}
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
                  <div className="stack-inline" style={{ justifyContent: 'center', width: '100%', gap: '1rem' }}>
                    <button className="btn" onClick={() => { setAudioBlob(null); setRecordingTime(0); }}>Redo</button>
                    <button className="btn btn-primary" onClick={handlePublish}>
                      Publish Discovery
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    className={`big-record-button ${isRecording ? "active" : ""}`}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    <Mic size={32} />
                    <span>{isRecording ? "Stop" : "Hold to Record"}</span>
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

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 1.5rem;
        }
        .creator-modal {
          width: 100%;
          max-width: 500px;
          border-radius: 2rem;
          overflow: hidden;
          background: var(--bg-panel);
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 { font-size: 1.25rem; font-family: "Space Grotesk"; }
        .plus-icon-bg {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--accent-green); color: white;
          display: grid; place-items: center;
        }
        .modal-body { padding: 1.5rem; }
        .creator-input {
          width: 100%; min-height: 120px;
          background: rgba(0,0,0,0.03); border: 1px solid var(--line);
          border-radius: 1rem; padding: 1rem; color: var(--text-main);
          font-family: inherit; font-size: 1.1rem; resize: none;
          margin-top: 1rem;
        }
        .script-container { padding: 1rem; border-radius: 1rem; margin-top: 1rem; }
        .script-editor {
          width: 100%; min-height: 150px; background: transparent; border: 0;
          color: var(--text-main); font-size: 1.2rem; line-height: 1.5; font-family: inherit;
          resize: none;
        }
        .teleprompter {
          background: rgba(0,0,0,0.05); padding: 2rem; border-radius: 1.5rem;
          margin-bottom: 2rem; text-align: center;
          font-size: 1.4rem; font-weight: 500; line-height: 1.4;
          max-height: 200px; overflow-y: auto;
        }
        .recording-zone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 150px;
        }
        .big-record-button {
          width: 100px; height: 100px; border-radius: 50%;
          background: var(--accent-gold); color: #000;
          border: 0; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 0.5rem;
          font-weight: 700; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }
        .big-record-button.active {
          transform: scale(1.15); background: var(--accent-red); color: #fff;
          box-shadow: 0 0 20px rgba(234, 67, 53, 0.4);
        }
        .timer {
          position: absolute; bottom: -2.5rem; font-size: 1rem; color: var(--accent-red);
        }
        .center-all {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 200px;
        }
        .spinner {
          width: 40px; height: 40px; border: 3px solid var(--line);
          border-top-color: var(--accent-green); border-radius: 50%;
          animation: spin 1s linear infinite; margin-bottom: 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .transition-fade { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
