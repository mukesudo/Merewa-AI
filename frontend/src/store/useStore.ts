import { create } from "zustand";

import type { Personality, Post, UserProfileResponse } from "../types/api";

interface AppState {
  currentUser: UserProfileResponse | null;
  posts: Post[];
  personalities: Personality[];
  isRecording: boolean;
  statusMessage: string | null;
  setCurrentUser: (profile: UserProfileResponse | null) => void;
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: number, updater: (post: Post) => Post) => void;
  setPersonalities: (personalities: Personality[]) => void;
  setIsRecording: (value: boolean) => void;
  setStatusMessage: (value: string | null) => void;
}

const useStore = create<AppState>((set) => ({
  currentUser: null,
  posts: [],
  personalities: [],
  isRecording: false,
  statusMessage: null,
  setCurrentUser: (profile) => set({ currentUser: profile }),
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (postId, updater) =>
    set((state) => ({
      posts: state.posts.map((post) => (post.id === postId ? updater(post) : post)),
    })),
  setPersonalities: (personalities) => set({ personalities }),
  setIsRecording: (value) => set({ isRecording: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),
}));

export default useStore;
